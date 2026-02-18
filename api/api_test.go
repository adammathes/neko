package api

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
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
		t.Errorf("expected %d, got %d", http.StatusOK, rr.Code)
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
		t.Errorf("expected %d, got %d", http.StatusCreated, rr.Code)
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
		t.Errorf("expected %d, got %d", http.StatusOK, rr.Code)
	}

	// Delete
	req = httptest.NewRequest("DELETE", "/feed/"+strconv.FormatInt(feedID, 10), nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected %d, got %d", http.StatusNoContent, rr.Code)
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
		t.Errorf("expected %d, got %d", http.StatusOK, rr.Code)
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
		t.Errorf("expected %d, got %d", http.StatusOK, rr.Code)
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
			t.Errorf("Expected %d for format %s, got %d", http.StatusOK, fmt, rr.Code)
		}
	}

	req := httptest.NewRequest("GET", "/export/unknown", nil)
	rr := httptest.NewRecorder()
	server.HandleExport(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected %d for unknown format, got %d", http.StatusOK, rr.Code)
	}
}

func TestHandleCrawl(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	req := httptest.NewRequest("POST", "/crawl", nil)
	rr := httptest.NewRecorder()
	server.HandleCrawl(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected %d, got %d", http.StatusOK, rr.Code)
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
		t.Errorf("Expected %d, got %d", http.StatusBadRequest, rr.Code)
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
		t.Errorf("Expected %d for missing URL, got %d", http.StatusBadRequest, rr.Code)
	}

	req = httptest.NewRequest("POST", "/feed", strings.NewReader("not json"))
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected %d for invalid JSON, got %d", http.StatusBadRequest, rr.Code)
	}

	req = httptest.NewRequest("PATCH", "/feed", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected %d, got %d", http.StatusMethodNotAllowed, rr.Code)
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
		t.Errorf("Expected %d, got %d", http.StatusNotFound, rr.Code)
	}

	req = httptest.NewRequest("DELETE", "/item/1", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected %d, got %d", http.StatusMethodNotAllowed, rr.Code)
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
		t.Errorf("Expected %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestHandleFeedDeleteNoId(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	req := httptest.NewRequest("DELETE", "/feed/", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected %d, got %d", http.StatusBadRequest, rr.Code)
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
			t.Errorf("Expected %d for %s %s, got %d", http.StatusMethodNotAllowed, tc.method, tc.url, rr.Code)
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
		t.Errorf("Expected %d for empty format, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestHandleFeedPutInvalidJson(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()
	req := httptest.NewRequest("PUT", "/feed", strings.NewReader("not json"))
	rr := httptest.NewRecorder()
	server.HandleFeed(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected %d for invalid JSON in PUT, got %d", http.StatusBadRequest, rr.Code)
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
		t.Errorf("Expected %d for missing ID in PUT, got %d", http.StatusBadRequest, rr.Code)
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
		t.Errorf("Expected %d for ID mismatch, got %d", http.StatusBadRequest, rr.Code)
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
		t.Errorf("Expected %d, got %d", http.StatusInternalServerError, rr.Code)
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
		t.Errorf("Expected %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestHandleCrawlMethodNotAllowed(t *testing.T) {
	server := newTestServer()
	req := httptest.NewRequest("GET", "/crawl", nil)
	rr := httptest.NewRecorder()
	server.HandleCrawl(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected %d, got %d", http.StatusMethodNotAllowed, rr.Code)
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
		t.Errorf("Expected %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestStreamExcludesFullContent(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	f := &feed.Feed{Url: "http://example.com/content", Title: "Content Feed"}
	f.Create()
	i := &item.Item{
		Title:  "Content Item",
		Url:    "http://example.com/content/1",
		FeedId: f.Id,
	}
	_ = i.Create()
	// Simulate having full_content stored in DB
	models.DB.Exec("UPDATE item SET full_content=? WHERE id=?", "<p>Full article text</p>", i.Id)

	// Stream response should NOT include full_content
	req := httptest.NewRequest("GET", "/stream?read_filter=all", nil)
	rr := httptest.NewRecorder()
	server.HandleStream(rr, req)

	body := rr.Body.String()
	if strings.Contains(body, "Full article text") {
		t.Error("stream response should not contain full_content")
	}
	if strings.Contains(body, `"full_content"`) {
		t.Error("stream response should not contain full_content key")
	}
}

func TestStreamReadFilterAll(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	f := &feed.Feed{Url: "http://example.com/rf", Title: "RF Feed"}
	f.Create()
	i := &item.Item{Title: "Read Item", Url: "http://example.com/rf/1", FeedId: f.Id}
	_ = i.Create()
	i.ReadState = true
	i.Save()

	// Default (unread only) should return 0 since item is read
	req := httptest.NewRequest("GET", "/stream", nil)
	rr := httptest.NewRecorder()
	server.HandleStream(rr, req)
	var items []item.Item
	json.NewDecoder(rr.Body).Decode(&items)
	if len(items) != 0 {
		t.Errorf("Default stream should return 0 read items, got %d", len(items))
	}

	// read_filter=all should return the read item
	req = httptest.NewRequest("GET", "/stream?read_filter=all", nil)
	rr = httptest.NewRecorder()
	server.HandleStream(rr, req)
	json.NewDecoder(rr.Body).Decode(&items)
	if len(items) != 1 {
		t.Errorf("read_filter=all should return 1 item, got %d", len(items))
	}
}

func TestStreamMultipleFeedIds(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	f1 := &feed.Feed{Url: "http://example.com/mf1", Title: "Feed 1"}
	f1.Create()
	f2 := &feed.Feed{Url: "http://example.com/mf2", Title: "Feed 2"}
	f2.Create()
	f3 := &feed.Feed{Url: "http://example.com/mf3", Title: "Feed 3"}
	f3.Create()

	(&item.Item{Title: "F1", Url: "http://example.com/mf1/1", FeedId: f1.Id}).Create()
	(&item.Item{Title: "F2", Url: "http://example.com/mf2/1", FeedId: f2.Id}).Create()
	(&item.Item{Title: "F3", Url: "http://example.com/mf3/1", FeedId: f3.Id}).Create()

	// Filter by feed_ids=1,2
	url := "/stream?feed_ids=" + strconv.FormatInt(f1.Id, 10) + "," + strconv.FormatInt(f2.Id, 10)
	req := httptest.NewRequest("GET", url, nil)
	rr := httptest.NewRecorder()
	server.HandleStream(rr, req)

	var items []item.Item
	json.NewDecoder(rr.Body).Decode(&items)
	if len(items) != 2 {
		t.Errorf("feed_ids filter should return 2 items, got %d", len(items))
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
		t.Errorf("Expected %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestHandleImportOPML(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>test</title></head>
  <body>
    <outline type="rss" text="Test Feed" title="Test Feed" xmlUrl="https://example.com/feed" htmlUrl="https://example.com"/>
  </body>
</opml>`

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "feeds.opml")
	if err != nil {
		t.Fatal(err)
	}
	part.Write([]byte(opmlContent))
	writer.Close()

	req := httptest.NewRequest("POST", "/import", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()
	server.HandleImport(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	var resp map[string]string
	json.NewDecoder(rr.Body).Decode(&resp)
	if resp["status"] != "ok" {
		t.Errorf("expected status ok, got %q", resp["status"])
	}

	// Verify the feed was imported
	feeds, _ := feed.All()
	if len(feeds) != 1 {
		t.Errorf("expected 1 feed after import, got %d", len(feeds))
	}

	time.Sleep(100 * time.Millisecond) // let goroutine settle
}

func TestHandleImportText(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	textContent := "https://example.com/feed1\nhttps://example.com/feed2\n"

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "feeds.txt")
	if err != nil {
		t.Fatal(err)
	}
	part.Write([]byte(textContent))
	writer.WriteField("format", "text")
	writer.Close()

	req := httptest.NewRequest("POST", "/import?format=text", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()
	server.HandleImport(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	feeds, _ := feed.All()
	if len(feeds) != 2 {
		t.Errorf("expected 2 feeds after text import, got %d", len(feeds))
	}

	time.Sleep(100 * time.Millisecond)
}

func TestHandleImportMethodNotAllowed(t *testing.T) {
	server := newTestServer()

	req := httptest.NewRequest("GET", "/import", nil)
	rr := httptest.NewRecorder()
	server.HandleImport(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected %d, got %d", http.StatusMethodNotAllowed, rr.Code)
	}
}

func TestHandleImportNoFile(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	req := httptest.NewRequest("POST", "/import", nil)
	rr := httptest.NewRecorder()
	server.HandleImport(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestHandleImportUnsupportedFormat(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "feeds.csv")
	part.Write([]byte("some data"))
	writer.Close()

	req := httptest.NewRequest("POST", "/import?format=csv", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()
	server.HandleImport(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected %d for unsupported format, got %d", http.StatusInternalServerError, rr.Code)
	}
}

func TestHandleImportInvalidOPML(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "bad.opml")
	part.Write([]byte("not valid xml at all"))
	writer.Close()

	req := httptest.NewRequest("POST", "/import?format=opml", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()
	server.HandleImport(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected %d for invalid OPML, got %d", http.StatusInternalServerError, rr.Code)
	}
}

func TestHandleStreamErrorOnClosedDB(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	// Close the DB to force an error
	models.DB.Close()

	req := httptest.NewRequest("GET", "/stream", nil)
	rr := httptest.NewRecorder()
	server.HandleStream(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected %d for closed DB, got %d", http.StatusInternalServerError, rr.Code)
	}
}

func TestHandleItemInvalidJSON(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	req := httptest.NewRequest("PUT", "/item/1", strings.NewReader("not json"))
	rr := httptest.NewRecorder()
	server.HandleItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected %d for invalid JSON, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestHandleExportContentTypes(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	server := newTestServer()

	testCases := []struct {
		format      string
		contentType string
		disposition string
	}{
		{"text", "text/plain", "neko_export.txt"},
		{"opml", "application/xml", "neko_export.opml"},
		{"json", "application/json", "neko_export.json"},
		{"html", "text/html", "neko_export.html"},
	}

	for _, tc := range testCases {
		req := httptest.NewRequest("GET", "/export/"+tc.format, nil)
		rr := httptest.NewRecorder()
		server.HandleExport(rr, req)

		if ct := rr.Header().Get("Content-Type"); ct != tc.contentType {
			t.Errorf("export/%s: expected Content-Type %q, got %q", tc.format, tc.contentType, ct)
		}
		if cd := rr.Header().Get("Content-Disposition"); !strings.Contains(cd, tc.disposition) {
			t.Errorf("export/%s: expected Content-Disposition containing %q, got %q", tc.format, tc.disposition, cd)
		}
	}
}

func TestHandleImportJSON(t *testing.T) {
	setupTestDB(t)
	server := newTestServer()

	jsonContent := `{"title":"Article 1","url":"https://example.com/1","description":"desc","read":false,"starred":false,"date":{"$date":"2024-01-01"},"feed":{"url":"https://example.com/feed","title":"Feed 1"}}`

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "items.json")
	part.Write([]byte(jsonContent))
	writer.Close()

	req := httptest.NewRequest("POST", "/import?format=json", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()
	server.HandleImport(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected %d, got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}

	time.Sleep(100 * time.Millisecond)
}
