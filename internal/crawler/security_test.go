package crawler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"adammathes.com/neko/internal/safehttp"
)

func TestGetFeedContentLimit(t *testing.T) {
	// Enable local connections for this test
	originalAllowLocal := safehttp.AllowLocal
	safehttp.AllowLocal = true
	defer func() { safehttp.AllowLocal = originalAllowLocal }()

	// 10MB limit expected
	limit := 10 * 1024 * 1024
	// 11MB payload
	size := limit + 1024*1024
	largeBody := strings.Repeat("a", size)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte(largeBody))
	}))
	defer ts.Close()

	content := GetFeedContent(ts.URL)

	if len(content) != limit {
		t.Errorf("Expected content length %d, got %d", limit, len(content))
	}
}
