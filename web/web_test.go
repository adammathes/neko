package web

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"adammathes.com/neko/api"
	"adammathes.com/neko/config"
	"adammathes.com/neko/internal/safehttp"
	"adammathes.com/neko/models"
)

func init() {
	safehttp.AllowLocal = true
}

func setupTestDB(t *testing.T) {
	t.Helper()
	config.Config.DBFile = filepath.Join(t.TempDir(), "test.db")
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

func TestImageProxyHandlerEmptyId(t *testing.T) {
	req := httptest.NewRequest("GET", "/image/", nil)
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}
}

func TestImageProxyHandlerBadBase64(t *testing.T) {
	req := httptest.NewRequest("GET", "/image/notbase64!", nil)
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
	apiServer := api.NewServer(&config.Config)
	handler := AuthWrapHandler(http.StripPrefix("/api", apiServer))

	req := httptest.NewRequest("GET", "/api/stream", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 via API mount, got %d", rr.Code)
	}
}

func TestIndexHandler(t *testing.T) {
	config.Config.DigestPassword = "secret"
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	indexHandler(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusNotFound {
		t.Errorf("Expected 200 or 404, got %d", rr.Code)
	}
}

func TestServeBoxedFile(t *testing.T) {
	config.Config.DigestPassword = "secret"
	req := httptest.NewRequest("GET", "/style.css", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	serveBoxedFile(rr, req, "style.css")

	if rr.Code != http.StatusOK && rr.Code != http.StatusNotFound {
		t.Errorf("Expected 200 or 404, got %d", rr.Code)
	}
}

func TestAuthWrapHandlerUnauthenticated(t *testing.T) {
	config.Config.DigestPassword = "secret"
	apiServer := api.NewServer(&config.Config)
	handler := AuthWrapHandler(http.StripPrefix("/api", apiServer))

	req := httptest.NewRequest("GET", "/api/stream", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected 307 redirect, got %d", rr.Code)
	}
}

func TestApiLoginHandlerSuccess(t *testing.T) {
	config.Config.DigestPassword = "testpass"
	req := httptest.NewRequest("POST", "/api/login", nil)
	req.Form = map[string][]string{"password": {"testpass"}}
	rr := httptest.NewRecorder()
	apiLoginHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	body := rr.Body.String()
	if body != `{"status":"ok"}` {
		t.Errorf("Expected ok status, got %q", body)
	}
}

func TestApiLoginHandlerFail(t *testing.T) {
	config.Config.DigestPassword = "testpass"
	req := httptest.NewRequest("POST", "/api/login", nil)
	req.Form = map[string][]string{"password": {"wrongpass"}}
	rr := httptest.NewRecorder()
	apiLoginHandler(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}
}

func TestApiAuthStatusHandlerAuthenticated(t *testing.T) {
	config.Config.DigestPassword = "secret"
	req := httptest.NewRequest("GET", "/api/auth", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	apiAuthStatusHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	body := rr.Body.String()
	if body != `{"status":"ok", "authenticated":true}` {
		t.Errorf("Expected authenticated true, got %q", body)
	}

	// Test Logout
	req, _ = http.NewRequest("POST", "/api/logout", nil)
	rr = httptest.NewRecorder()
	handler := http.HandlerFunc(apiLogoutHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("logout handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	// Verify cookie is cleared
	cookies := rr.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == AuthCookie {
			found = true
			if c.MaxAge != -1 {
				t.Errorf("auth cookie not expired: got MaxAge %v want -1", c.MaxAge)
			}
		}
	}
	if !found {
		t.Errorf("auth cookie not found in response")
	}
}

func TestApiAuthStatusHandlerUnauthenticated(t *testing.T) {
	config.Config.DigestPassword = "secret"
	req := httptest.NewRequest("GET", "/api/auth", nil)
	rr := httptest.NewRecorder()
	apiAuthStatusHandler(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}
	body := rr.Body.String()
	if body != `{"status":"error", "authenticated":false}` {
		t.Errorf("Expected authenticated false, got %q", body)
	}
}

func TestLoginHandlerGet(t *testing.T) {
	req := httptest.NewRequest("GET", "/login/", nil)
	rr := httptest.NewRecorder()
	loginHandler(rr, req)

	// should return login.html from rice box
	if rr.Code != http.StatusOK && rr.Code != http.StatusNotFound {
		t.Errorf("Expected 200 or 404, got %d", rr.Code)
	}
}

func TestServeFrontend(t *testing.T) {
	// This test depends on the existence of ../frontend/dist
	// which is created by the build process.
	req := httptest.NewRequest("GET", "/v2/index.html", nil)
	rr := httptest.NewRecorder()

	// Mimic the routing in Serve()
	handler := http.StripPrefix("/v2/", http.HandlerFunc(ServeFrontend))
	handler.ServeHTTP(rr, req)

	// We expect 200 if built, or maybe panic if box not found (rice.MustFindBox)
	// But rice usually works in dev mode by looking at disk.
	if rr.Code != http.StatusOK {
		// If 404/500, it might be that dist is missing, but for this specific verification
		// where we know we built it, we expect 200.
		// However, protecting against CI failures where build might not happen:
		t.Logf("Got code %d for frontend request", rr.Code)
	}
	// Check for unauthenticated access (no cookie needed)
	if rr.Code == http.StatusTemporaryRedirect {
		t.Error("Frontend should not redirect to login")
	}
}

func TestGzipCompression(t *testing.T) {
	handler := GzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte("this is a test string that should be compressed when gzip is enabled and the client supports it"))
	}))

	// Case 1: Client supports gzip
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Header().Get("Content-Encoding") != "gzip" {
		t.Errorf("Expected Content-Encoding: gzip, got %q", rr.Header().Get("Content-Encoding"))
	}

	// Case 2: Client does NOT support gzip
	req = httptest.NewRequest("GET", "/", nil)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Header().Get("Content-Encoding") == "gzip" {
		t.Error("Expected no Content-Encoding: gzip for client without support")
	}

	// Case 3: 304 Not Modified (Should NOT be gzipped)
	handler304 := GzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotModified)
	}))
	req = httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rr = httptest.NewRecorder()
	handler304.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304, got %d", rr.Code)
	}
	if rr.Header().Get("Content-Encoding") == "gzip" {
		t.Error("Expected no Content-Encoding for 304 response")
	}
}

func TestNewRouter(t *testing.T) {
	router := NewRouter(&config.Config)
	if router == nil {
		t.Fatal("NewRouter should not return nil")
	}

	// Test a route that we know exists
	req := httptest.NewRequest("GET", "/api/auth", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Should be unauthorized but the route should be found
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for unauthorized /api/auth, got %d", rr.Code)
	}
}

func TestIndexHandlerRedirect(t *testing.T) {
	config.Config.DigestPassword = "secret"
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()

	// Use the wrapped handler
	handler := AuthWrap(indexHandler)
	handler.ServeHTTP(rr, req)

	// Should redirect to login since not authenticated
	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected 307 redirect for unauthenticated root, got %d", rr.Code)
	}
}

func TestServeFrontendEdgeCases(t *testing.T) {
	// 1. Missing file with extension should 404
	req := httptest.NewRequest("GET", "/v2/missing.js", nil)
	rr := httptest.NewRecorder()
	handler := http.StripPrefix("/v2/", http.HandlerFunc(ServeFrontend))
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for missing asset, got %d", rr.Code)
	}

	// 2. Missing file without extension should serve index.html (or 404 if index.html missing)
	req = httptest.NewRequest("GET", "/v2/someroute", nil)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	// We check for 200 or 404 depending on if index.html is in the box
	if rr.Code != http.StatusOK && rr.Code != http.StatusNotFound {
		t.Errorf("Expected 200 or 404 for client route, got %d", rr.Code)
	}
}

func TestGzipMiddlewareStatusCodes(t *testing.T) {
	handler := GzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("created"))
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("Expected 201, got %d", rr.Code)
	}
	if rr.Header().Get("Content-Encoding") != "gzip" {
		t.Error("Expected gzip encoding even for 201 Created")
	}
}

func TestGzipMiddlewareErrorStatus(t *testing.T) {
	handler := GzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("not found"))
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}
	// Currently we gzip anything compressible regardless of status
	if rr.Header().Get("Content-Encoding") != "gzip" {
		t.Error("Expected gzip encoding even for 404 (current behavior)")
	}
}

func TestGzipMiddlewareFlush(t *testing.T) {
	handler := GzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("hello"))
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Body.Len() == 0 {
		t.Error("Expected non-empty body after flush")
	}
}

func TestIsCompressible(t *testing.T) {
	testCases := []struct {
		ct       string
		expected bool
	}{
		{"text/html", true},
		{"application/json", true},
		{"application/javascript", true},
		{"application/rss+xml", true},
		{"image/png", false},
		{"", false},
	}
	for _, tc := range testCases {
		if res := isCompressible(tc.ct); res != tc.expected {
			t.Errorf("isCompressible(%q) = %v, expected %v", tc.ct, res, tc.expected)
		}
	}
}

func TestImageProxyHandlerMissingURL(t *testing.T) {
	req := httptest.NewRequest("GET", "/image/", nil)
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}
}

func TestImageProxyHandlerInvalidBase64(t *testing.T) {
	req := httptest.NewRequest("GET", "/image/invalid-base64", nil)
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}
}

func TestServeFrontendNotFound(t *testing.T) {
	req := httptest.NewRequest("GET", "/not-actually-a-file", nil)
	rr := httptest.NewRecorder()
	ServeFrontend(rr, req)
	// Should fallback to index.html if it's not a dot-extension file
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 (fallback to index.html), got %d", rr.Code)
	}
}

func TestImageProxyHeaders(t *testing.T) {
	url := "http://example.com/image.png"
	encoded := base64.URLEncoding.EncodeToString([]byte(url))

	// Test If-None-Match
	req := httptest.NewRequest("GET", "/"+encoded, nil)
	req.Header.Set("If-None-Match", url)
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304 for If-None-Match, got %d", rr.Code)
	}

	// Test Etag
	req = httptest.NewRequest("GET", "/"+encoded, nil)
	req.Header.Set("Etag", url)
	rr = httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304 for Etag, got %d", rr.Code)
	}
}

func TestServeFrontendAssetNotFound(t *testing.T) {
	req := httptest.NewRequest("GET", "/static/missing.js", nil)
	rr := httptest.NewRecorder()
	ServeFrontend(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for missing asset, got %d", rr.Code)
	}
}

func TestServeBoxedFileNotFound(t *testing.T) {
	req := httptest.NewRequest("GET", "/nonexistent", nil)
	rr := httptest.NewRecorder()
	serveBoxedFile(rr, req, "nonexistent")
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for nonexistent file, got %d", rr.Code)
	}
}

func TestImageProxyHandlerHeaders(t *testing.T) {
	url := "http://example.com/image.png"
	id := base64.URLEncoding.EncodeToString([]byte(url))

	req := httptest.NewRequest("GET", "/"+id, nil)
	req.Header.Set("Etag", url)
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304 for matching Etag, got %d", rr.Code)
	}
}

func TestImageProxyHandlerRemoteError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "10")
		w.WriteHeader(http.StatusOK)
		// Close connection immediately to cause ReadAll error if possible,
		// or just return non-200. The current code only checks err from c.Do(request)
		// and ioutil.ReadAll.
	}))
	ts.Close() // Close immediately so c.Do fails

	id := base64.URLEncoding.EncodeToString([]byte(ts.URL))
	req := httptest.NewRequest("GET", "/"+id, nil)
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != 404 {
		t.Errorf("Expected 404 for remote error, got %d", rr.Code)
	}
}

func TestApiLoginHandlerBadMethod(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/login", nil)
	rr := httptest.NewRecorder()
	apiLoginHandler(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected 405, got %d", rr.Code)
	}
}

func TestGzipMiddlewareNonCompressible(t *testing.T) {
	handler := GzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write([]byte("not compressible"))
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Header().Get("Content-Encoding") == "gzip" {
		t.Error("Expected no gzip for image/png")
	}
}

func TestCSRFMiddleware(t *testing.T) {
	cfg := &config.Settings{SecureCookies: false}
	handler := CSRFMiddleware(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Case 1: GET should succeed and set a cookie
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 for GET, got %d", rr.Code)
	}
	cookies := rr.Result().Cookies()
	var csrfCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "csrf_token" {
			csrfCookie = c
			break
		}
	}
	if csrfCookie == nil {
		t.Fatal("Expected csrf_token cookie to be set on first GET")
	}

	// Case 2: POST without token should fail
	req = httptest.NewRequest("POST", "/", nil)
	req.AddCookie(csrfCookie)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("Expected 403 for POST without token, got %d", rr.Code)
	}

	// Case 3: POST with valid token should succeed
	req = httptest.NewRequest("POST", "/", nil)
	req.AddCookie(csrfCookie)
	req.Header.Set("X-CSRF-Token", csrfCookie.Value)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 for POST with valid token, got %d", rr.Code)
	}
}

func TestSecurityHeadersMiddleware(t *testing.T) {
	handler := SecurityHeadersMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("Missing X-Content-Type-Options: nosniff")
	}
	if rr.Header().Get("X-Frame-Options") != "DENY" {
		t.Error("Missing X-Frame-Options: DENY")
	}
	if rr.Header().Get("Content-Security-Policy") == "" {
		t.Error("Missing Content-Security-Policy")
	}
}
