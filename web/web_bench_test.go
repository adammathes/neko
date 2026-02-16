package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"adammathes.com/neko/config"
)

func BenchmarkGzipMiddleware(b *testing.B) {
	// Simulate a JSON API response
	jsonPayload := `[` + strings.Repeat(`{"_id":"1","title":"Test Item","url":"https://example.com","description":"<p>This is a test description with enough content to be worth compressing in a real scenario</p>","read":false,"starred":false},`, 14) +
		`{"_id":"15","title":"Last Item","url":"https://example.com/15","description":"<p>Final item</p>","read":false,"starred":false}]`

	handler := GzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(jsonPayload))
	}))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/api/stream", nil)
		req.Header.Set("Accept-Encoding", "gzip")
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}

func BenchmarkSecurityHeaders(b *testing.B) {
	handler := SecurityHeadersMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}

func BenchmarkCSRFMiddleware(b *testing.B) {
	cfg := &config.Settings{SecureCookies: false}
	handler := CSRFMiddleware(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Pre-generate a CSRF token by doing an initial GET
	initReq := httptest.NewRequest("GET", "/", nil)
	initRR := httptest.NewRecorder()
	handler.ServeHTTP(initRR, initReq)

	var csrfCookie *http.Cookie
	for _, c := range initRR.Result().Cookies() {
		if c.Name == "csrf_token" {
			csrfCookie = c
			break
		}
	}
	if csrfCookie == nil {
		b.Fatal("no csrf cookie set")
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/api/stream", nil)
		req.AddCookie(csrfCookie)
		req.Header.Set("X-CSRF-Token", csrfCookie.Value)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}

func BenchmarkFullMiddlewareStack(b *testing.B) {
	cfg := &config.Settings{SecureCookies: false}
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	handler := SecurityHeadersMiddleware(CSRFMiddleware(cfg, GzipMiddleware(inner)))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Accept-Encoding", "gzip")
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}
