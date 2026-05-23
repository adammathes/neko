package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"adammathes.com/neko/config"
)

func TestRouting(t *testing.T) {
	config.Config.DigestPassword = "secret"
	origLegacy := config.Config.EnableLegacyUI
	config.Config.EnableLegacyUI = true // exercise the legacy /v1/ routes
	defer func() { config.Config.EnableLegacyUI = origLegacy }()
	router := NewRouter(&config.Config)

	tests := []struct {
		name           string
		path           string
		method         string
		cookie         *http.Cookie
		expectedStatus int
		containsBody   string
	}{
		{
			name:           "Root serves V3 UI",
			path:           "/",
			method:         "GET",
			expectedStatus: http.StatusOK,
			containsBody:   "<!doctype html>", // from V3 dist/v3
		},

		{
			name:           "/v3/ serves v3 UI",
			path:           "/v3/",
			method:         "GET",
			expectedStatus: http.StatusOK,
			containsBody:   "<!doctype html>",
		},
		{
			name:           "/v1/ redirects unauthenticated",
			path:           "/v1/",
			method:         "GET",
			expectedStatus: http.StatusTemporaryRedirect,
		},
		{
			name:           "/v1/ serves legacy UI when authenticated",
			path:           "/v1/",
			method:         "GET",
			cookie:         authCookie(),
			expectedStatus: http.StatusOK,
			containsBody:   "<title>neko rss mode</title>", // from legacy ui.html
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			if tt.cookie != nil {
				req.AddCookie(tt.cookie)
			}
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.containsBody != "" {
				body := strings.ToLower(rr.Body.String())
				if !strings.Contains(body, strings.ToLower(tt.containsBody)) {
					t.Errorf("Expected body to contain %q, but it didn't", tt.containsBody)
				}
			}
		})
	}
}

// The legacy v1 Backbone UI must NOT be served unless explicitly enabled,
// since it ships old jQuery/Backbone with known XSS advisories. With the
// route unmounted, /v1/ falls through to the v3 SPA catch-all — what matters
// is that the vulnerable legacy ui.html is never returned.
func TestLegacyUIDisabledByDefault(t *testing.T) {
	config.Config.DigestPassword = "secret"
	origLegacy := config.Config.EnableLegacyUI
	config.Config.EnableLegacyUI = false
	defer func() { config.Config.EnableLegacyUI = origLegacy }()

	router := NewRouter(&config.Config)

	req := httptest.NewRequest("GET", "/v1/", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	body := strings.ToLower(rr.Body.String())
	if strings.Contains(body, "<title>neko rss mode</title>") {
		t.Error("legacy backbone UI must not be served when EnableLegacyUI is false")
	}
}

func TestLegacyUIEnabledWhenConfigured(t *testing.T) {
	config.Config.DigestPassword = "secret"
	origLegacy := config.Config.EnableLegacyUI
	config.Config.EnableLegacyUI = true
	defer func() { config.Config.EnableLegacyUI = origLegacy }()

	router := NewRouter(&config.Config)

	req := httptest.NewRequest("GET", "/v1/", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("legacy /v1/ should serve when enabled, got %d", rr.Code)
	}
	if !strings.Contains(strings.ToLower(rr.Body.String()), "<title>neko rss mode</title>") {
		t.Error("expected legacy ui.html body when enabled")
	}
}
