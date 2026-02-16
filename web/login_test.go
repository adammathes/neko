package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"adammathes.com/neko/config"
)

func TestCSRFLoginWithFormToken(t *testing.T) {
	pw := "secret"
	originalPw := config.Config.DigestPassword
	defer func() { config.Config.DigestPassword = originalPw }()
	config.Config.DigestPassword = pw

	mux := http.NewServeMux()
	mux.HandleFunc("/login/", loginHandler)
	mux.HandleFunc("/other", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := CSRFMiddleware(&config.Config, mux)

	// Step 1: GET /login/ to obtain the CSRF token cookie
	getReq := httptest.NewRequest("GET", "/login/", nil)
	getRR := httptest.NewRecorder()
	handler.ServeHTTP(getRR, getReq)

	var csrfToken string
	for _, c := range getRR.Result().Cookies() {
		if c.Name == "csrf_token" {
			csrfToken = c.Value
			break
		}
	}
	if csrfToken == "" {
		t.Fatal("Expected csrf_token cookie to be set on GET /login/")
	}

	// Test 1: POST /login/ with CSRF token in form field should succeed
	body := "password=" + pw + "&csrf_token=" + csrfToken
	req := httptest.NewRequest("POST", "/login/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusSeeOther {
		t.Errorf("Expected 303 Redirect on successful login with CSRF token, got %d", rr.Code)
	}

	// Test 2: POST /login/ without CSRF token should be rejected
	req2 := httptest.NewRequest("POST", "/login/", strings.NewReader("password="+pw))
	req2.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr2 := httptest.NewRecorder()

	handler.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for POST /login/ without CSRF token, got %d", rr2.Code)
	}

	// Test 3: POST /other without CSRF token should fail
	req3 := httptest.NewRequest("POST", "/other", nil)
	rr3 := httptest.NewRecorder()

	handler.ServeHTTP(rr3, req3)

	if rr3.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for POST /other, got %d", rr3.Code)
	}

	// Test 4: POST /other with CSRF token in header should succeed
	req4 := httptest.NewRequest("POST", "/other", nil)
	req4.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	req4.Header.Set("X-CSRF-Token", csrfToken)
	rr4 := httptest.NewRecorder()

	handler.ServeHTTP(rr4, req4)

	if rr4.Code == http.StatusForbidden {
		t.Errorf("Expected POST /other with valid CSRF header to succeed, got 403")
	}
}

func TestCSRFExcludedPaths(t *testing.T) {
	originalPw := config.Config.DigestPassword
	defer func() { config.Config.DigestPassword = originalPw }()
	config.Config.DigestPassword = "secret"

	mux := http.NewServeMux()
	mux.HandleFunc("/api/login", apiLoginHandler)
	mux.HandleFunc("/api/logout", apiLogoutHandler)
	handler := CSRFMiddleware(&config.Config, mux)

	// POST /api/login without CSRF token should succeed (excluded path)
	req := httptest.NewRequest("POST", "/api/login", strings.NewReader("password=secret"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code == http.StatusForbidden {
		t.Error("POST /api/login should be excluded from CSRF protection")
	}

	// POST /api/logout without CSRF token should succeed (excluded path)
	req = httptest.NewRequest("POST", "/api/logout", nil)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code == http.StatusForbidden {
		t.Error("POST /api/logout should be excluded from CSRF protection")
	}
}

func TestCSRFPutAndDeleteMethods(t *testing.T) {
	cfg := &config.Settings{SecureCookies: false}
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := CSRFMiddleware(cfg, inner)

	// GET to get a token
	getReq := httptest.NewRequest("GET", "/", nil)
	getRR := httptest.NewRecorder()
	handler.ServeHTTP(getRR, getReq)

	var csrfToken string
	for _, c := range getRR.Result().Cookies() {
		if c.Name == "csrf_token" {
			csrfToken = c.Value
		}
	}

	// PUT without token should fail
	req := httptest.NewRequest("PUT", "/item/1", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("PUT without CSRF token should return 403, got %d", rr.Code)
	}

	// DELETE without token should fail
	req = httptest.NewRequest("DELETE", "/feed/1", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("DELETE without CSRF token should return 403, got %d", rr.Code)
	}

	// PUT with valid token should succeed
	req = httptest.NewRequest("PUT", "/item/1", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	req.Header.Set("X-CSRF-Token", csrfToken)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("PUT with valid CSRF token should succeed, got %d", rr.Code)
	}

	// DELETE with valid token should succeed
	req = httptest.NewRequest("DELETE", "/feed/1", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: csrfToken})
	req.Header.Set("X-CSRF-Token", csrfToken)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("DELETE with valid CSRF token should succeed, got %d", rr.Code)
	}
}
