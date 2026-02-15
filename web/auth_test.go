package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"adammathes.com/neko/config"
)

// TestAuthenticationNoPassword tests that when no password is configured,
// all routes should be accessible without authentication
func TestAuthenticationNoPassword(t *testing.T) {
	// Save original password and restore after test
	originalPassword := config.Config.DigestPassword
	defer func() {
		config.Config.DigestPassword = originalPassword
	}()

	// Set empty password (no authentication required)
	config.Config.DigestPassword = ""

	// Create a test handler that returns 200 OK
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	})

	// Wrap with AuthWrap
	wrappedHandler := AuthWrap(testHandler)

	// Test without any auth cookie - should succeed
	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected %d OK when no password is set, got %d", http.StatusOK, rr.Code)
	}

	body := rr.Body.String()
	if body != "success" {
		t.Errorf("Expected 'success' response, got %s", body)
	}
}

// TestAuthenticationWithPassword tests that when a password is configured,
// routes require authentication
func TestAuthenticationWithPassword(t *testing.T) {
	// Save original password and restore after test
	originalPassword := config.Config.DigestPassword
	defer func() {
		config.Config.DigestPassword = originalPassword
	}()

	// Set a password
	config.Config.DigestPassword = "testpassword"

	// Create a test handler
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	})

	// Wrap with AuthWrap
	wrappedHandler := AuthWrap(testHandler)

	// Test without auth cookie - should redirect to login
	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected %d redirect when not authenticated, got %d", http.StatusTemporaryRedirect, rr.Code)
	}

	location := rr.Header().Get("Location")
	if location != "/login/" {
		t.Errorf("Expected redirect to /login/, got %s", location)
	}
}

// TestAuthenticationWithValidCookie tests that a valid auth cookie allows access
func TestAuthenticationWithValidCookie(t *testing.T) {
	// Save original password and restore after test
	originalPassword := config.Config.DigestPassword
	defer func() {
		config.Config.DigestPassword = originalPassword
	}()

	password := "testpassword"
	config.Config.DigestPassword = password

	// First, login to get a valid cookie
	loginReq := httptest.NewRequest("POST", "/login/", strings.NewReader("password="+password))
	loginReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	loginRR := httptest.NewRecorder()
	loginHandler(loginRR, loginReq)

	// Extract the auth cookie
	var authCookie *http.Cookie
	for _, cookie := range loginRR.Result().Cookies() {
		if cookie.Name == "auth" {
			authCookie = cookie
			break
		}
	}

	if authCookie == nil {
		t.Fatal("Expected auth cookie after successful login")
	}

	// Now test with the valid cookie
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	})

	wrappedHandler := AuthWrap(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.AddCookie(authCookie)
	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected %d OK with valid auth cookie, got %d", http.StatusOK, rr.Code)
	}
}

// TestApiLoginNoPassword tests that API login works when no password is set
func TestApiLoginNoPassword(t *testing.T) {
	originalPassword := config.Config.DigestPassword
	defer func() {
		config.Config.DigestPassword = originalPassword
	}()

	config.Config.DigestPassword = ""

	req := httptest.NewRequest("POST", "/api/login", strings.NewReader("password="))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	apiLoginHandler(rr, req)

	// Should succeed with any password (or empty) when no password is configured
	if rr.Code != http.StatusOK {
		t.Errorf("Expected %d OK for API login with no password configured, got %d", http.StatusOK, rr.Code)
	}
}

// TestApiAuthStatusNoPassword tests auth status endpoint when no password is set
func TestApiAuthStatusNoPassword(t *testing.T) {
	originalPassword := config.Config.DigestPassword
	defer func() {
		config.Config.DigestPassword = originalPassword
	}()

	config.Config.DigestPassword = ""

	req := httptest.NewRequest("GET", "/api/auth", nil)
	rr := httptest.NewRecorder()
	apiAuthStatusHandler(rr, req)

	// Should return authenticated:true when no password is set
	if rr.Code != http.StatusOK {
		t.Errorf("Expected %d OK for auth status with no password, got %d", http.StatusOK, rr.Code)
	}

	body := rr.Body.String()
	if !strings.Contains(body, `"authenticated":true`) {
		t.Errorf("Expected authenticated:true in response, got: %s", body)
	}
}
