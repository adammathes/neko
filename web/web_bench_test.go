package web

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
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

// --- Image proxy benchmarks ---

func BenchmarkImageProxyCacheHit(b *testing.B) {
	encoded := base64.URLEncoding.EncodeToString([]byte("https://example.com/image.jpg"))
	etag := `"` + encoded + `"`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/"+encoded, nil)
		req.Header.Set("If-None-Match", etag)
		rr := httptest.NewRecorder()
		imageProxyHandler(rr, req)
	}
}

func benchmarkImageProxySize(b *testing.B, size int) {
	data := make([]byte, size)
	for i := range data {
		data[i] = byte(i % 256)
	}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Content-Length", fmt.Sprintf("%d", size))
		w.Write(data)
	}))
	defer ts.Close()

	encoded := base64.URLEncoding.EncodeToString([]byte(ts.URL + "/img.jpg"))

	b.ResetTimer()
	b.SetBytes(int64(size))
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/"+encoded, nil)
		req.URL = &url.URL{Path: encoded}
		rr := httptest.NewRecorder()
		imageProxyHandler(rr, req)
	}
}

func BenchmarkImageProxy_1KB(b *testing.B)  { benchmarkImageProxySize(b, 1<<10) }
func BenchmarkImageProxy_64KB(b *testing.B) { benchmarkImageProxySize(b, 64<<10) }
func BenchmarkImageProxy_1MB(b *testing.B)  { benchmarkImageProxySize(b, 1<<20) }
func BenchmarkImageProxy_5MB(b *testing.B)  { benchmarkImageProxySize(b, 5<<20) }
