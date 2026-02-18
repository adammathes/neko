package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"adammathes.com/neko/config"
)

// Security regression tests to ensure critical security properties are maintained.

// TestCSRFTokenMismatchRejected ensures mismatched CSRF tokens are rejected.
func TestCSRFTokenMismatchRejected(t *testing.T) {
	cfg := &config.Settings{SecureCookies: false}
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := CSRFMiddleware(cfg, inner)

	// Get a valid token
	getReq := httptest.NewRequest("GET", "/", nil)
	getRR := httptest.NewRecorder()
	handler.ServeHTTP(getRR, getReq)

	var csrfToken string
	for _, c := range getRR.Result().Cookies() {
		if c.Name == "csrf_token" {
			csrfToken = c.Value
		}
	}

	// POST with wrong token in header should be rejected
	req := httptest.NewRequest("POST", "/something", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	req.Header.Set("X-CSRF-Token", "completely-wrong-token")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("CSRF token mismatch should return 403, got %d", rr.Code)
	}
}

// TestCSRFTokenEmptyHeaderRejected ensures empty CSRF tokens are rejected.
func TestCSRFTokenEmptyHeaderRejected(t *testing.T) {
	cfg := &config.Settings{SecureCookies: false}
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := CSRFMiddleware(cfg, inner)

	getReq := httptest.NewRequest("GET", "/", nil)
	getRR := httptest.NewRecorder()
	handler.ServeHTTP(getRR, getReq)

	var csrfToken string
	for _, c := range getRR.Result().Cookies() {
		if c.Name == "csrf_token" {
			csrfToken = c.Value
		}
	}

	// POST with empty X-CSRF-Token header
	req := httptest.NewRequest("POST", "/data", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	req.Header.Set("X-CSRF-Token", "")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("Empty CSRF token should return 403, got %d", rr.Code)
	}
}

// TestSecurityHeadersPresent verifies all security headers are set correctly.
func TestSecurityHeadersPresent(t *testing.T) {
	handler := SecurityHeadersMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	headers := map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":       "DENY",
		"X-XSS-Protection":      "1; mode=block",
		"Referrer-Policy":       "strict-origin-when-cross-origin",
	}

	for name, expected := range headers {
		if got := rr.Header().Get(name); got != expected {
			t.Errorf("Header %s: expected %q, got %q", name, expected, got)
		}
	}

	// CSP should deny framing
	csp := rr.Header().Get("Content-Security-Policy")
	if !strings.Contains(csp, "frame-ancestors 'none'") {
		t.Error("CSP should contain frame-ancestors 'none'")
	}
}

// TestAuthCookieHttpOnly ensures the auth cookie is HttpOnly.
func TestAuthCookieHttpOnly(t *testing.T) {
	originalPw := config.Config.DigestPassword
	defer func() { config.Config.DigestPassword = originalPw }()
	config.Config.DigestPassword = "testpass"

	req := httptest.NewRequest("POST", "/login/", nil)
	req.Form = map[string][]string{"password": {"testpass"}}
	rr := httptest.NewRecorder()
	loginHandler(rr, req)

	for _, c := range rr.Result().Cookies() {
		if c.Name == AuthCookie {
			if !c.HttpOnly {
				t.Error("Auth cookie must be HttpOnly to prevent XSS theft")
			}
			return
		}
	}
	t.Error("Auth cookie not found in login response")
}

// TestLogoutClearsAuthCookie ensures logout properly invalidates the cookie.
func TestLogoutClearsAuthCookie(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/logout", nil)
	rr := httptest.NewRecorder()
	apiLogoutHandler(rr, req)

	for _, c := range rr.Result().Cookies() {
		if c.Name == AuthCookie {
			if c.MaxAge != -1 {
				t.Errorf("Logout should set MaxAge=-1 to expire cookie, got %d", c.MaxAge)
			}
			if c.Value != "" {
				t.Error("Logout should clear cookie value")
			}
			return
		}
	}
	t.Error("Auth cookie not found in logout response")
}

// TestAPIRoutesRequireAuth ensures API routes redirect when not authenticated.
func TestAPIRoutesRequireAuth(t *testing.T) {
	setupTestDB(t)
	originalPw := config.Config.DigestPassword
	defer func() { config.Config.DigestPassword = originalPw }()
	config.Config.DigestPassword = "secret"

	router := NewRouter(&config.Config)

	protectedPaths := []string{
		"/api/stream",
		"/api/feed",
		"/api/tag",
	}

	for _, path := range protectedPaths {
		req := httptest.NewRequest("GET", path, nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusTemporaryRedirect {
			t.Errorf("GET %s without auth should redirect, got %d", path, rr.Code)
		}
	}
}

// TestCSRFTokenUniqueness ensures each new session gets a unique CSRF token.
func TestCSRFTokenUniqueness(t *testing.T) {
	cfg := &config.Settings{SecureCookies: false}
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := CSRFMiddleware(cfg, inner)

	tokens := make(map[string]bool)
	for i := 0; i < 10; i++ {
		req := httptest.NewRequest("GET", "/", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		for _, c := range rr.Result().Cookies() {
			if c.Name == "csrf_token" {
				if tokens[c.Value] {
					t.Error("CSRF tokens should be unique across sessions")
				}
				tokens[c.Value] = true
			}
		}
	}

	if len(tokens) < 10 {
		t.Errorf("Expected 10 unique CSRF tokens, got %d", len(tokens))
	}
}

// TestCSRFExcludedPathsTrailingSlash ensures CSRF exclusion works with and without trailing slashes.
func TestCSRFExcludedPathsTrailingSlash(t *testing.T) {
	originalPw := config.Config.DigestPassword
	defer func() { config.Config.DigestPassword = originalPw }()
	config.Config.DigestPassword = "secret"

	mux := http.NewServeMux()
	mux.HandleFunc("/api/login", apiLoginHandler)
	handler := CSRFMiddleware(&config.Config, mux)

	// POST /api/login/ (with trailing slash) should also be excluded
	req := httptest.NewRequest("POST", "/api/login/", strings.NewReader("password=secret"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code == http.StatusForbidden {
		t.Error("POST /api/login/ (trailing slash) should be excluded from CSRF protection")
	}
}
