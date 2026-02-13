package web

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"adammathes.com/neko/api"
	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"golang.org/x/crypto/bcrypt"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	config.Config.DBFile = ":memory:"
	models.InitDB()
	t.Cleanup(func() {
		if models.DB != nil {
			models.DB.Close()
		}
	})
}

func seedData(t *testing.T) {
	t.Helper()
	_, err := models.DB.Exec("INSERT INTO feed(url, web_url, title, category) VALUES(?, ?, ?, ?)",
		"https://example.com/feed", "https://example.com", "Example Feed", "tech")
	if err != nil {
		t.Fatal(err)
	}
	_, err = models.DB.Exec(`INSERT INTO item(title, url, description, publish_date, feed_id, read_state, starred)
		VALUES(?, ?, ?, ?, ?, ?, ?)`,
		"Test Item", "https://example.com/item1", "Description", "2024-01-01 00:00:00", 1, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
}

func authCookie() *http.Cookie {
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), 0)
	return &http.Cookie{Name: AuthCookie, Value: string(hash)}
}

// --- Authentication tests ---

func TestAuthenticatedNoCookie(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	if Authenticated(req) {
		t.Error("Should not be authenticated without cookie")
	}
}

func TestAuthenticatedBadCookie(t *testing.T) {
	config.Config.DigestPassword = "secret"
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: AuthCookie, Value: "badvalue"})
	if Authenticated(req) {
		t.Error("Should not be authenticated with bad cookie")
	}
}

func TestAuthenticatedValidCookie(t *testing.T) {
	config.Config.DigestPassword = "secret"
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), 0)
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: AuthCookie, Value: string(hash)})
	if !Authenticated(req) {
		t.Error("Should be authenticated with valid cookie")
	}
}

func TestAuthenticatedWrongPassword(t *testing.T) {
	config.Config.DigestPassword = "secret"
	hash, _ := bcrypt.GenerateFromPassword([]byte("wrongpassword"), 0)
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: AuthCookie, Value: string(hash)})
	if Authenticated(req) {
		t.Error("Should not be authenticated with wrong password hash")
	}
}

// --- AuthWrap tests ---

func TestAuthWrapUnauthenticated(t *testing.T) {
	config.Config.DigestPassword = "secret"
	handler := AuthWrap(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected 307, got %d", rr.Code)
	}
}

func TestAuthWrapAuthenticated(t *testing.T) {
	config.Config.DigestPassword = "secret"
	called := false
	handler := AuthWrap(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if !called {
		t.Error("Wrapped handler should be called")
	}
}

// --- Login/Logout tests ---

func TestLoginHandlerPostSuccess(t *testing.T) {
	config.Config.DigestPassword = "testpass"
	req := httptest.NewRequest("POST", "/login/", nil)
	req.Form = map[string][]string{"password": {"testpass"}}
	rr := httptest.NewRecorder()
	loginHandler(rr, req)
	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected 307, got %d", rr.Code)
	}
}

func TestLoginHandlerPostFail(t *testing.T) {
	config.Config.DigestPassword = "testpass"
	req := httptest.NewRequest("POST", "/login/", nil)
	req.Form = map[string][]string{"password": {"wrongpass"}}
	rr := httptest.NewRecorder()
	loginHandler(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}
}

func TestLoginHandlerBadMethod(t *testing.T) {
	req := httptest.NewRequest("DELETE", "/login/", nil)
	rr := httptest.NewRecorder()
	loginHandler(rr, req)
	if rr.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500, got %d", rr.Code)
	}
}

func TestLogoutHandler(t *testing.T) {
	req := httptest.NewRequest("GET", "/logout/", nil)
	rr := httptest.NewRecorder()
	logoutHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	cookies := rr.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == AuthCookie {
			found = true
			if c.MaxAge != 0 {
				t.Errorf("Logout should set MaxAge=0, got %d", c.MaxAge)
			}
		}
	}
	if !found {
		t.Error("Logout should set auth cookie")
	}
	if rr.Body.String() != "you are logged out" {
		t.Errorf("Expected logout message, got %q", rr.Body.String())
	}
}

// --- Image proxy handler tests ---

func TestImageProxyHandlerIfNoneMatch(t *testing.T) {
	req := httptest.NewRequest("GET", "/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc=", nil)
	req.Header.Set("If-None-Match", "https://example.com/image.jpg")
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304, got %d", rr.Code)
	}
}

func TestSecondsInAYear(t *testing.T) {
	expected := 60 * 60 * 24 * 365
	if SecondsInAYear != expected {
		t.Errorf("SecondsInAYear = %d, want %d", SecondsInAYear, expected)
	}
}

func TestImageProxyHandlerEtag(t *testing.T) {
	req := httptest.NewRequest("GET", "/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc=", nil)
	req.Header.Set("Etag", "https://example.com/image.jpg")
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304, got %d", rr.Code)
	}
}

func TestImageProxyHandlerSuccess(t *testing.T) {
	imgServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		w.WriteHeader(200)
		w.Write([]byte("fake-image-data"))
	}))
	defer imgServer.Close()

	encodedURL := base64.URLEncoding.EncodeToString([]byte(imgServer.URL + "/test.jpg"))
	req := httptest.NewRequest("GET", "/"+encodedURL, nil)
	req.URL = &url.URL{Path: encodedURL}
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	if rr.Body.String() != "fake-image-data" {
		t.Errorf("Expected image data, got %q", rr.Body.String())
	}
}

func TestImageProxyHandlerBadRemote(t *testing.T) {
	encodedURL := base64.URLEncoding.EncodeToString([]byte("http://127.0.0.1:1/bad"))
	req := httptest.NewRequest("GET", "/"+encodedURL, nil)
	req.URL = &url.URL{Path: encodedURL}
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}
}

func TestApiMounting(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	config.Config.DigestPassword = "secret"

	// Testing that the /api/stream route works through Serve()'s setup
	// We can't easily test Serve() because it calls ListenAndServe,
	// but we can test the logic it sets up.
	// Actually, Serve() sets up http.DefaultServeMux.

	// Let's just verify that AuthWrapHandler works with the router
	apiRouter := api.NewRouter()
	handler := AuthWrapHandler(http.StripPrefix("/api", apiRouter))

	req := httptest.NewRequest("GET", "/api/stream", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 via API mount, got %d", rr.Code)
	}
}
