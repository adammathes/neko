package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"adammathes.com/neko/config"
)

func TestCSRFLoginExclusion(t *testing.T) {
	// Setup password
	pw := "secret"
	hashed, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	// We need to set the global config since loginHandler uses it
	config.Config.DigestPassword = string(hashed) // wait, config stores the hashed password?
	// let's check web.go loginHandler:
	// if password == config.Config.DigestPassword {
	//    v, _ := bcrypt.GenerateFromPassword([]byte(password), 0)

	// Ah, it compares PLAIN TEXT password with config.Config.DigestPassword.
	// wait, line 113: if password == config.Config.DigestPassword {
	// So config stores the PLAIN TEXT password? That's... odd, but okay for this test.
	originalPw := config.Config.DigestPassword
	defer func() { config.Config.DigestPassword = originalPw }()
	config.Config.DigestPassword = pw

	// Create a mux with login handler
	mux := http.NewServeMux()
	mux.HandleFunc("/login/", loginHandler)
	mux.HandleFunc("/other", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Wrap with CSRF middleware
	// We need to pass a pointer to Settings
	handler := CSRFMiddleware(&config.Config, mux)

	// Test 1: POST /login/ without CSRF token
	// Should NOT return 403 Forbidden.
	// Since we provide correct password, it should redirect (307)
	req := httptest.NewRequest("POST", "/login/", strings.NewReader("password="+pw))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code == http.StatusForbidden {
		t.Errorf("Expected /login/ POST to be allowed without CSRF token, got 403 Forbidden")
	}
	if rr.Code != http.StatusSeeOther {
		t.Errorf("Expected 303 Redirect on successful login, got %d", rr.Code)
	}

	// Test 2: POST /other without CSRF token
	// Should fail with 403 Forbidden
	req2 := httptest.NewRequest("POST", "/other", nil)
	rr2 := httptest.NewRecorder()

	handler.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for POST /other, got %d", rr2.Code)
	}
}
