package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
)

var testMu sync.Mutex

func setupTestDB(t *testing.T) {
	t.Helper()
	testMu.Lock()
	config.Config.DBFile = filepath.Join(t.TempDir(), "test.db")
	models.InitDB()
	t.Cleanup(func() {
		if models.DB != nil {
			models.DB.Close()
		}
		testMu.Unlock()
	})
}

func seedData(t *testing.T) {
	t.Helper()
	f := &feed.Feed{Url: "http://example.com", Title: "Test Feed", Category: "tech"}
	f.Create()

	i := &item.Item{
		Title:  "Test Item",
		Url:    "http://example.com/1",
		FeedId: f.Id,
	}
	i.Create()
}

func newTestServer() *Server {
	return NewServer(&config.Config)
}

func TestStream(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	req := httptest.NewRequest("GET", "/stream", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var items []item.Item
	json.NewDecoder(rr.Body).Decode(&items)
	if len(items) != 1 {
		t.Errorf("expected 1 item, got %d", len(items))
	}
}

func TestFeedCRUD(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	// Create
	f := feed.Feed{Url: "http://example.com", Title: "New Feed"}
	b, _ := json.Marshal(f)
	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(b))
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rr.Code)
	}

	// List
	req = httptest.NewRequest("GET", "/feed", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	var feeds []feed.Feed
	json.NewDecoder(rr.Body).Decode(&feeds)
	if len(feeds) != 1 {
		t.Errorf("expected 1 feed, got %d", len(feeds))
	}

	feedID := feeds[0].Id

	// Update
	feeds[0].Title = "Updated Title"
	b, _ = json.Marshal(feeds[0])
	req = httptest.NewRequest("PUT", "/feed", bytes.NewBuffer(b))
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	// Delete
	req = httptest.NewRequest("DELETE", "/feed/"+strconv.FormatInt(feedID, 10), nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}
}

func TestItemUpdate(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	// Get an item first to know its ID
	var id int64
	err := models.DB.QueryRow("SELECT id FROM item LIMIT 1").Scan(&id)
	if err != nil {
		t.Fatal(err)
	}

	i := item.Item{Id: id, ReadState: true}
	b, _ := json.Marshal(i)
	req := httptest.NewRequest("PUT", "/item/"+strconv.FormatInt(id, 10), bytes.NewBuffer(b))
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestGetCategories(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	req := httptest.NewRequest("GET", "/tag", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var cats []feed.Category
	json.NewDecoder(rr.Body).Decode(&cats)
	if len(cats) != 1 {
		t.Errorf("Expected 1 category, got %d", len(cats))
	}
}

func TestHandleExport(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	formats := []string{"text", "json", "opml", "html"}
	for _, fmt := range formats {
		req := httptest.NewRequest("GET", "/export/"+fmt, nil)
		rr := httptest.NewRecorder()
		server.HandleExport(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200 for format %s, got %d", fmt, rr.Code)
		}
	}

	req := httptest.NewRequest("GET", "/export/unknown", nil)
	rr := httptest.NewRecorder()
	server.HandleExport(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 for unknown format, got %d", rr.Code)
	}
}

func TestHandleCrawl(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	req := httptest.NewRequest("POST", "/crawl", nil)
	rr := httptest.NewRecorder()
	server.HandleCrawl(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "crawl started") {
		t.Error("Expected crawl started message in response")
	}
	time.Sleep(100 * time.Millisecond)
}

func TestJsonError(t *testing.T) {
	server := newTestServer()
	req := httptest.NewRequest("PUT", "/item/notanumber", nil)
	rr := httptest.NewRecorder()
	server.HandleItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", rr.Code)
	}
	var resp map[string]string
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp["error"] == "" {
		t.Error("Expected error message in JSON response")
	}
}

func TestHandleStreamFilters(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	testCases := []struct {
		url      string
		expected int
	}{
		{"/stream?tag=tech", 1},
		{"/stream?tag=missing", 0},
		{"/stream?feed_url=http://example.com", 1},
		{"/stream?starred=1", 0},
		{"/stream?q=Test", 1},
	}

	for _, tc := range testCases {
		req := httptest.NewRequest("GET", tc.url, nil)
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)

		var items []item.Item
		json.NewDecoder(rr.Body).Decode(&items)
		if len(items) != tc.expected {
			t.Errorf("For %s, expected %d items, got %d", tc.url, tc.expected, len(items))
		}
	}
}

func TestHandleFeedErrors(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	b, _ := json.Marshal(feed.Feed{Title: "No URL"})
	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(b))
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing URL, got %d", rr.Code)
	}

	req = httptest.NewRequest("POST", "/feed", strings.NewReader("not json"))
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for invalid JSON, got %d", rr.Code)
	}

	req = httptest.NewRequest("PATCH", "/feed", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected 405, got %d", rr.Code)
	}
}

func TestHandleItemEdgeCases(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	req := httptest.NewRequest("GET", "/item/999", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}

	req = httptest.NewRequest("DELETE", "/item/1", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected 405, got %d", rr.Code)
	}

	var id int64
	err := models.DB.QueryRow("SELECT id FROM item LIMIT 1").Scan(&id)
	if err != nil {
		t.Fatal(err)
	}

	req = httptest.NewRequest("GET", "/item/"+strconv.FormatInt(id, 10), nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestHandleFeedDeleteNoId(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	req := httptest.NewRequest("DELETE", "/feed/", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", rr.Code)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	testCases := []struct {
		method string
		url    string
	}{
		{"POST", "/stream"},
		{"POST", "/tag"},
		{"POST", "/export/text"},
	}

	for _, tc := range testCases {
		req := httptest.NewRequest(tc.method, tc.url, nil)
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)
		if rr.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected 405 for %s %s, got %d", tc.method, tc.url, rr.Code)
		}
	}
}

func TestExportBadRequest(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()
	req := httptest.NewRequest("GET", "/export/", nil)
	rr := httptest.NewRecorder()
	server.HandleExport(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for empty format, got %d", rr.Code)
	}
}

func TestHandleFeedPutInvalidJson(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()
	req := httptest.NewRequest("PUT", "/feed", strings.NewReader("not json"))
	rr := httptest.NewRecorder()
	server.HandleFeed(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for invalid JSON in PUT, got %d", rr.Code)
	}
}

func TestHandleFeedPutMissingId(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()
	b, _ := json.Marshal(feed.Feed{Title: "No ID"})
	req := httptest.NewRequest("PUT", "/feed", bytes.NewBuffer(b))
	rr := httptest.NewRecorder()
	server.HandleFeed(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing ID in PUT, got %d", rr.Code)
	}
}

func TestHandleItemIdMismatch(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()
	b, _ := json.Marshal(item.Item{Id: 999})
	req := httptest.NewRequest("PUT", "/item/1", bytes.NewBuffer(b))
	rr := httptest.NewRecorder()
	server.HandleItem(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for ID mismatch, got %d", rr.Code)
	}
}

func TestHandleCategoryError(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()
	models.DB.Close()

	req := httptest.NewRequest("GET", "/tag", nil)
	rr := httptest.NewRecorder()
	server.HandleCategory(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500, got %d", rr.Code)
	}
}

func TestHandleItemAlreadyHasContent(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()
	var id int64
	models.DB.QueryRow("SELECT id FROM item LIMIT 1").Scan(&id)

	models.DB.Exec("UPDATE item SET full_content = 'existing' WHERE id = ?", id)

	req := httptest.NewRequest("GET", "/item/"+strconv.FormatInt(id, 10), nil)
	rr := httptest.NewRecorder()
	server.HandleItem(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestHandleCrawlMethodNotAllowed(t *testing.T) {
	server := newTestServer()
	req := httptest.NewRequest("GET", "/crawl", nil)
	rr := httptest.NewRecorder()
	server.HandleCrawl(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected 405, got %d", rr.Code)
	}
}

func TestHandleStreamComplexFilters(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	req := httptest.NewRequest("GET", "/stream?max_id=999&feed_id=1", nil)
	rr := httptest.NewRecorder()
	server.HandleStream(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestHandleCategorySuccess(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()
	f := &feed.Feed{Url: "http://example.com/cat", Category: "News"}
	f.Create()

	req := httptest.NewRequest("GET", "/api/categories", nil)
	rr := httptest.NewRecorder()
	server.HandleCategory(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}
