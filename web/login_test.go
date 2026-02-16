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
