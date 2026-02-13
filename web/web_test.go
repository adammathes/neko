package web

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"golang.org/x/crypto/bcrypt"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	config.Config.DBFile = ":memory:"
	models.InitDB()
	t.Cleanup(func() {
		if models.DB != nil {
			models.DB.Close()
		}
	})
}

func seedData(t *testing.T) {
	t.Helper()
	_, err := models.DB.Exec("INSERT INTO feed(url, web_url, title, category) VALUES(?, ?, ?, ?)",
		"https://example.com/feed", "https://example.com", "Example Feed", "tech")
	if err != nil {
		t.Fatal(err)
	}
	_, err = models.DB.Exec(`INSERT INTO item(title, url, description, publish_date, feed_id, read_state, starred)
		VALUES(?, ?, ?, ?, ?, ?, ?)`,
		"Test Item", "https://example.com/item1", "Description", "2024-01-01 00:00:00", 1, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
}

func authCookie() *http.Cookie {
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), 0)
	return &http.Cookie{Name: AuthCookie, Value: string(hash)}
}

// --- Authentication tests ---

func TestAuthenticatedNoCookie(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	if Authenticated(req) {
		t.Error("Should not be authenticated without cookie")
	}
}

func TestAuthenticatedBadCookie(t *testing.T) {
	config.Config.DigestPassword = "secret"
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: AuthCookie, Value: "badvalue"})
	if Authenticated(req) {
		t.Error("Should not be authenticated with bad cookie")
	}
}

func TestAuthenticatedValidCookie(t *testing.T) {
	config.Config.DigestPassword = "secret"
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), 0)
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: AuthCookie, Value: string(hash)})
	if !Authenticated(req) {
		t.Error("Should be authenticated with valid cookie")
	}
}

func TestAuthenticatedWrongPassword(t *testing.T) {
	config.Config.DigestPassword = "secret"
	hash, _ := bcrypt.GenerateFromPassword([]byte("wrongpassword"), 0)
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: AuthCookie, Value: string(hash)})
	if Authenticated(req) {
		t.Error("Should not be authenticated with wrong password hash")
	}
}

// --- AuthWrap tests ---

func TestAuthWrapUnauthenticated(t *testing.T) {
	config.Config.DigestPassword = "secret"
	handler := AuthWrap(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected 307, got %d", rr.Code)
	}
}

func TestAuthWrapAuthenticated(t *testing.T) {
	config.Config.DigestPassword = "secret"
	called := false
	handler := AuthWrap(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(authCookie())
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if !called {
		t.Error("Wrapped handler should be called")
	}
}

// --- Login/Logout tests ---

func TestLoginHandlerPostSuccess(t *testing.T) {
	config.Config.DigestPassword = "testpass"
	req := httptest.NewRequest("POST", "/login/", nil)
	req.Form = map[string][]string{"password": {"testpass"}}
	rr := httptest.NewRecorder()
	loginHandler(rr, req)
	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected 307, got %d", rr.Code)
	}
}

func TestLoginHandlerPostFail(t *testing.T) {
	config.Config.DigestPassword = "testpass"
	req := httptest.NewRequest("POST", "/login/", nil)
	req.Form = map[string][]string{"password": {"wrongpass"}}
	rr := httptest.NewRecorder()
	loginHandler(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}
}

func TestLoginHandlerBadMethod(t *testing.T) {
	req := httptest.NewRequest("DELETE", "/login/", nil)
	rr := httptest.NewRecorder()
	loginHandler(rr, req)
	if rr.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500, got %d", rr.Code)
	}
}

func TestLogoutHandler(t *testing.T) {
	req := httptest.NewRequest("GET", "/logout/", nil)
	rr := httptest.NewRecorder()
	logoutHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	cookies := rr.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == AuthCookie {
			found = true
			if c.MaxAge != 0 {
				t.Errorf("Logout should set MaxAge=0, got %d", c.MaxAge)
			}
		}
	}
	if !found {
		t.Error("Logout should set auth cookie")
	}
	if rr.Body.String() != "you are logged out" {
		t.Errorf("Expected logout message, got %q", rr.Body.String())
	}
}

// --- Stream handler tests ---

func TestStreamHandler(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	config.Config.DigestPassword = "secret"

	req := httptest.NewRequest("GET", "/stream/", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}

	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected application/json, got %q", contentType)
	}

	var items []interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &items)
	if err != nil {
		t.Fatalf("Response should be valid JSON: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("Expected 1 item, got %d", len(items))
	}
}

func TestStreamHandlerWithMaxId(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/stream/?max_id=999", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestStreamHandlerWithFeedUrl(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/stream/?feed_url=https://example.com/feed", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestStreamHandlerWithTag(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/stream/?tag=tech", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestStreamHandlerWithReadFilter(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/stream/?read_filter=all", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestStreamHandlerWithStarred(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/stream/?starred=1", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestStreamHandlerWithSearch(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/stream/?q=test", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)
	// Search may or may not find results, but should not error
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Item handler tests ---

func TestItemHandlerPut(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	body := `{"_id":"1","read":true,"starred":true}`
	req := httptest.NewRequest("PUT", "/item/1", strings.NewReader(body))
	rr := httptest.NewRecorder()
	itemHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestItemHandlerPutBadJSON(t *testing.T) {
	setupTestDB(t)

	req := httptest.NewRequest("PUT", "/item/1", strings.NewReader("not json"))
	rr := httptest.NewRecorder()
	itemHandler(rr, req)
	// Should not crash
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 (error handled internally), got %d", rr.Code)
	}
}

// --- Feed handler tests ---

func TestFeedHandlerGet(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/feed/", nil)
	rr := httptest.NewRecorder()
	feedHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}

	var feeds []interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &feeds)
	if err != nil {
		t.Fatalf("Response should be valid JSON: %v", err)
	}
	if len(feeds) != 1 {
		t.Errorf("Expected 1 feed, got %d", len(feeds))
	}
}

func TestFeedHandlerPut(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	body := `{"_id":1,"url":"https://example.com/feed","title":"Updated Feed","category":"updated"}`
	req := httptest.NewRequest("PUT", "/feed/", strings.NewReader(body))
	rr := httptest.NewRecorder()
	feedHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestFeedHandlerDelete(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("DELETE", "/feed/1", nil)
	rr := httptest.NewRecorder()
	feedHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestFeedHandlerDeleteBadId(t *testing.T) {
	setupTestDB(t)

	req := httptest.NewRequest("DELETE", "/feed/notanumber", nil)
	rr := httptest.NewRecorder()
	feedHandler(rr, req)
	// Should handle gracefully (returns early after logging error)
}

// --- Category handler tests ---

func TestCategoryHandlerGet(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/tag/", nil)
	rr := httptest.NewRecorder()
	categoryHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}

	var categories []interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &categories)
	if err != nil {
		t.Fatalf("Response should be valid JSON: %v", err)
	}
}

func TestCategoryHandlerNonGet(t *testing.T) {
	req := httptest.NewRequest("POST", "/tag/", nil)
	rr := httptest.NewRecorder()
	categoryHandler(rr, req)
	// Non-GET is a no-op, just verify no crash
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Export handler tests ---

func TestExportHandler(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/text", nil)
	rr := httptest.NewRecorder()
	exportHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	if rr.Header().Get("content-type") != "text/plain" {
		t.Errorf("Expected text/plain content type")
	}
}

// --- Crawl handler tests ---

func TestCrawlHandler(t *testing.T) {
	setupTestDB(t)

	req := httptest.NewRequest("GET", "/crawl/", nil)
	rr := httptest.NewRecorder()
	crawlHandler(rr, req)

	body := rr.Body.String()
	if !strings.Contains(body, "crawling...") {
		t.Error("Expected 'crawling...' in response")
	}
	if !strings.Contains(body, "done...") {
		t.Error("Expected 'done...' in response")
	}
}

// --- FullText handler tests ---

func TestFullTextHandlerNoId(t *testing.T) {
	setupTestDB(t)

	req := httptest.NewRequest("GET", "/0", nil)
	rr := httptest.NewRecorder()
	fullTextHandler(rr, req)
	// Should return early with no content
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Image proxy handler tests ---

func TestImageProxyHandlerIfNoneMatch(t *testing.T) {
	req := httptest.NewRequest("GET", "/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc=", nil)
	req.Header.Set("If-None-Match", "https://example.com/image.jpg")
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304, got %d", rr.Code)
	}
}

func TestSecondsInAYear(t *testing.T) {
	expected := 60 * 60 * 24 * 365
	if SecondsInAYear != expected {
		t.Errorf("SecondsInAYear = %d, want %d", SecondsInAYear, expected)
	}
}

// --- More image proxy handler tests ---

func TestImageProxyHandlerEtag(t *testing.T) {
	req := httptest.NewRequest("GET", "/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc=", nil)
	req.Header.Set("Etag", "https://example.com/image.jpg")
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Errorf("Expected 304, got %d", rr.Code)
	}
}

func TestImageProxyHandlerSuccess(t *testing.T) {
	// Create test image server
	imgServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		w.WriteHeader(200)
		w.Write([]byte("fake-image-data"))
	}))
	defer imgServer.Close()

	// Encode the URL as base64
	encodedURL := base64.URLEncoding.EncodeToString([]byte(imgServer.URL + "/test.jpg"))

	// Build request with URL set to just the encoded string
	// (simulating http.StripPrefix behavior)
	req := httptest.NewRequest("GET", "/"+encodedURL, nil)
	req.URL = &url.URL{Path: encodedURL}
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	if rr.Body.String() != "fake-image-data" {
		t.Errorf("Expected image data, got %q", rr.Body.String())
	}
	if rr.Header().Get("ETag") == "" {
		t.Error("Expected ETag header")
	}
	if rr.Header().Get("Cache-Control") != "public" {
		t.Error("Expected Cache-Control: public")
	}
}

func TestImageProxyHandlerBadRemote(t *testing.T) {
	// Encode a URL that will fail to connect
	encodedURL := base64.URLEncoding.EncodeToString([]byte("http://127.0.0.1:1/bad"))
	req := httptest.NewRequest("GET", "/"+encodedURL, nil)
	req.URL = &url.URL{Path: encodedURL}
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)
	// Should return 404
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}
}

// --- More fulltext handler tests ---

func TestFullTextHandlerNonNumericId(t *testing.T) {
	setupTestDB(t)

	req := httptest.NewRequest("GET", "/abc", nil)
	rr := httptest.NewRecorder()
	fullTextHandler(rr, req)
	// Should return early since Atoi("abc") = 0
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Item handler GET test ---

func TestItemHandlerGetNoId(t *testing.T) {
	setupTestDB(t)

	req := httptest.NewRequest("GET", "/0", nil)
	rr := httptest.NewRecorder()
	itemHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Additional export handler tests ---

func TestExportHandlerOPML(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/opml", nil)
	rr := httptest.NewRecorder()
	exportHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestExportHandlerJSON(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/json", nil)
	rr := httptest.NewRecorder()
	exportHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestExportHandlerHTML(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/html", nil)
	rr := httptest.NewRecorder()
	exportHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Feed handler PUT with bad JSON ---

func TestFeedHandlerPutBadJSON(t *testing.T) {
	setupTestDB(t)

	req := httptest.NewRequest("PUT", "/feed/", strings.NewReader("not json"))
	rr := httptest.NewRecorder()
	feedHandler(rr, req)
	// Should handle gracefully (logs error, attempts f.Update with zero values)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Item handler PUT with read/unread states ---

func TestItemHandlerPutUnread(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	body := `{"_id":"1","read":false,"starred":false}`
	req := httptest.NewRequest("PUT", "/item/1", strings.NewReader(body))
	rr := httptest.NewRecorder()
	itemHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Stream handler with multiple combined params ---

func TestStreamHandlerCombinedParams(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("GET", "/stream/?max_id=999&read_filter=all&starred=0", nil)
	rr := httptest.NewRecorder()
	streamHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

// --- Category handler PUT test ---

func TestCategoryHandlerPut(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	req := httptest.NewRequest("PUT", "/tag/", nil)
	rr := httptest.NewRecorder()
	categoryHandler(rr, req)
	// PUT is handled by the default case (no-op)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}
