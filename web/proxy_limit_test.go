package web

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestImageProxyHandlerUnboundedRead attempts to reproduce the issue by
// serving a large response and checking if the handler reads it all.
// Since we can't easily check memory usage in a test without potentially crashing,
// this test will serve as a baseline.
//
// After the fix, we will modify this test or add a new one to verify that
// the handler stops reading after a certain limit.
func TestImageProxyHandlerLargeResponse(t *testing.T) {
	// Create a mock server that returns a large response
	largeContent := strings.Repeat("A", 1024*1024*15) // 15MB
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		w.Write([]byte(largeContent))
	}))
	defer ts.Close()

	// Encode the URL
	encodedURL := base64.URLEncoding.EncodeToString([]byte(ts.URL))
	// The handler expects the path to be the encoded URL (after StripPrefix)
	req := httptest.NewRequest("GET", "/"+encodedURL, nil)
	rr := httptest.NewRecorder()

	// Call the handler directly (skipping auth/routing middleware for simplicity)
	http.HandlerFunc(imageProxyHandler).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// With the fix, the handler should read only up to the limit.
	if len(rr.Body.Bytes()) != maxImageProxySize {
		t.Errorf("Expected response body length %d, got %d", maxImageProxySize, len(rr.Body.Bytes()))
	}
}
