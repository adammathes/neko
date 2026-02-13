package feed

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
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

func TestCreateAndByUrl(t *testing.T) {
	setupTestDB(t)

	f := &Feed{Url: "https://example.com/feed.xml", Title: "Example Feed"}
	err := f.Create()
	if err != nil {
		t.Fatalf("Create() should not error: %v", err)
	}
	if f.Id == 0 {
		t.Error("Create() should set Id")
	}

	// Test ByUrl
	f2 := &Feed{}
	err = f2.ByUrl("https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("ByUrl() should not error: %v", err)
	}
	if f2.Id != f.Id {
		t.Errorf("ByUrl() Id mismatch: got %d, want %d", f2.Id, f.Id)
	}
	if f2.Title != "Example Feed" {
		t.Errorf("ByUrl() Title mismatch: got %q, want %q", f2.Title, "Example Feed")
	}
}

func TestByUrlNotFound(t *testing.T) {
	setupTestDB(t)

	f := &Feed{}
	err := f.ByUrl("https://nonexistent.com/feed.xml")
	if err == nil {
		t.Error("ByUrl() should error for nonexistent feed")
	}
}

func TestAll(t *testing.T) {
	setupTestDB(t)

	// Insert two feeds
	f1 := &Feed{Url: "https://a.com/feed", Title: "Alpha"}
	f1.Create()
	f2 := &Feed{Url: "https://b.com/feed", Title: "Beta"}
	f2.Create()

	feeds, err := All()
	if err != nil {
		t.Fatalf("All() should not error: %v", err)
	}
	if len(feeds) != 2 {
		t.Fatalf("All() should return 2 feeds, got %d", len(feeds))
	}

	// Should be ordered by title (lowercase)
	if feeds[0].Title != "Alpha" {
		t.Errorf("First feed should be Alpha, got %q", feeds[0].Title)
	}
	if feeds[1].Title != "Beta" {
		t.Errorf("Second feed should be Beta, got %q", feeds[1].Title)
	}
}

func TestUpdate(t *testing.T) {
	setupTestDB(t)

	f := &Feed{Url: "https://example.com/feed", Title: "Original"}
	f.Create()

	f.Title = "Updated"
	f.WebUrl = "https://example.com"
	f.Category = "tech"
	f.Update()

	// Verify by fetching
	f2 := &Feed{}
	err := f2.ByUrl("https://example.com/feed")
	if err != nil {
		t.Fatal(err)
	}
	if f2.Title != "Updated" {
		t.Errorf("Title should be 'Updated', got %q", f2.Title)
	}
}

func TestUpdateEmptyTitle(t *testing.T) {
	setupTestDB(t)

	f := &Feed{Url: "https://example.com/feed", Title: "Original"}
	f.Create()

	// Update with empty title should be a no-op
	f.Title = ""
	f.Update()

	f2 := &Feed{}
	f2.ByUrl("https://example.com/feed")
	if f2.Title != "Original" {
		t.Errorf("Title should remain 'Original' after empty-title update, got %q", f2.Title)
	}
}

func TestUpdateZeroId(t *testing.T) {
	setupTestDB(t)

	f := &Feed{Id: 0, Url: "https://example.com/feed", Title: "Test"}
	// Should be a no-op since ID is 0
	f.Update()
}

func TestUpdateEmptyUrl(t *testing.T) {
	setupTestDB(t)

	f := &Feed{Id: 1, Url: "", Title: "Test"}
	// Should be a no-op since URL is empty
	f.Update()
}

func TestDelete(t *testing.T) {
	setupTestDB(t)

	f := &Feed{Url: "https://example.com/feed", Title: "ToDelete"}
	f.Create()

	f.Delete()

	feeds, _ := All()
	if len(feeds) != 0 {
		t.Errorf("After delete, All() should return 0 feeds, got %d", len(feeds))
	}
}

func TestCategories(t *testing.T) {
	setupTestDB(t)

	f1 := &Feed{Url: "https://a.com/feed", Title: "A"}
	f1.Create()
	f1.Category = "tech"
	f1.Update()

	f2 := &Feed{Url: "https://b.com/feed", Title: "B"}
	f2.Create()
	f2.Category = "news"
	f2.Update()

	f3 := &Feed{Url: "https://c.com/feed", Title: "C"}
	f3.Create()
	f3.Category = "tech"
	f3.Update()

	cats, err := Categories()
	if err != nil {
		t.Fatalf("Categories() should not error: %v", err)
	}
	if len(cats) != 2 {
		t.Fatalf("Should have 2 distinct categories, got %d", len(cats))
	}
}

func TestNewFeed(t *testing.T) {
	setupTestDB(t)

	// Create a test server that returns RSS content-type
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.WriteHeader(200)
		w.Write([]byte("<rss><channel><title>Test</title></channel></rss>"))
	}))
	defer ts.Close()

	err := NewFeed(ts.URL)
	if err != nil {
		t.Fatalf("NewFeed should not error: %v", err)
	}

	// Verify the feed was inserted
	f := &Feed{}
	err = f.ByUrl(ts.URL)
	if err != nil {
		t.Fatalf("Feed should exist after NewFeed: %v", err)
	}
}

func TestNewFeedDuplicate(t *testing.T) {
	setupTestDB(t)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.WriteHeader(200)
		w.Write([]byte("<rss></rss>"))
	}))
	defer ts.Close()

	NewFeed(ts.URL)
	err := NewFeed(ts.URL)
	if err == nil {
		t.Error("NewFeed should error for duplicate URL")
	}
}

func TestResolveFeedURLDirectRSS(t *testing.T) {
	// Server returns RSS content-type directly
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.WriteHeader(200)
		w.Write([]byte("<rss></rss>"))
	}))
	defer ts.Close()

	result := ResolveFeedURL(ts.URL)
	if result != ts.URL {
		t.Errorf("Expected original URL for RSS content-type, got %q", result)
	}
}

func TestResolveFeedURLAtom(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/atom+xml")
		w.WriteHeader(200)
		w.Write([]byte("<feed></feed>"))
	}))
	defer ts.Close()

	result := ResolveFeedURL(ts.URL)
	if result != ts.URL {
		t.Errorf("Expected original URL for Atom content-type, got %q", result)
	}
}

func TestResolveFeedURLTextXML(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/xml")
		w.WriteHeader(200)
		w.Write([]byte("<rss></rss>"))
	}))
	defer ts.Close()

	result := ResolveFeedURL(ts.URL)
	if result != ts.URL {
		t.Errorf("Expected original URL for text/xml, got %q", result)
	}
}

func TestResolveFeedURLTextRSS(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/rss+xml")
		w.WriteHeader(200)
		w.Write([]byte("<rss></rss>"))
	}))
	defer ts.Close()

	result := ResolveFeedURL(ts.URL)
	if result != ts.URL {
		t.Errorf("Expected original URL for text/rss+xml, got %q", result)
	}
}

func TestResolveFeedURLHTMLWithLinks(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(200)
		w.Write([]byte(`<html><head>
			<link rel="alternate" type="application/rss+xml" href="http://example.com/feed.xml"/>
		</head><body>Page</body></html>`))
	}))
	defer ts.Close()

	result := ResolveFeedURL(ts.URL)
	if result != "http://example.com/feed.xml" {
		t.Errorf("Expected discovered feed URL, got %q", result)
	}
}

func TestResolveFeedURLHTMLNoLinks(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(200)
		w.Write([]byte("<html><body>No feed links</body></html>"))
	}))
	defer ts.Close()

	result := ResolveFeedURL(ts.URL)
	// Should fall back to original URL when no feed links
	if result != ts.URL {
		t.Errorf("Expected fallback to original URL, got %q", result)
	}
}

func TestResolveFeedURLBadURL(t *testing.T) {
	result := ResolveFeedURL("http://invalid.invalid.invalid:99999")
	if result != "http://invalid.invalid.invalid:99999" {
		t.Errorf("Expected original URL on error, got %q", result)
	}
}

func TestFilterEmpty(t *testing.T) {
	setupTestDB(t)

	feeds, err := filter("")
	if err != nil {
		t.Fatalf("filter() should not error: %v", err)
	}
	if len(feeds) != 0 {
		t.Errorf("filter() on empty DB should return 0 feeds, got %d", len(feeds))
	}
}

func TestFilterByCategory(t *testing.T) {
	setupTestDB(t)

	f1 := &Feed{Url: "https://a.com/feed", Title: "A"}
	f1.Create()
	f1.Category = "tech"
	f1.Update()

	f2 := &Feed{Url: "https://b.com/feed", Title: "B"}
	f2.Create()
	f2.Category = "news"
	f2.Update()

	// Filter by "tech" category using proper WHERE clause
	feeds, err := filter("WHERE category='tech'")
	if err != nil {
		t.Fatalf("filter with category should not error: %v", err)
	}
	if len(feeds) != 1 {
		t.Fatalf("filter with category should return 1 feed, got %d", len(feeds))
	}
	if feeds[0].Title != "A" {
		t.Errorf("Expected feed 'A', got %q", feeds[0].Title)
	}
}

func TestDeleteWithItems(t *testing.T) {
	setupTestDB(t)

	f := &Feed{Url: "https://example.com/feed", Title: "ToDelete"}
	f.Create()

	// Add an item to this feed
	_, err := models.DB.Exec("INSERT INTO item(title, url, description, feed_id) VALUES(?, ?, ?, ?)",
		"Item 1", "https://example.com/1", "d", f.Id)
	if err != nil {
		t.Fatal(err)
	}

	f.Delete()

	// Verify feed deleted
	feeds, _ := All()
	if len(feeds) != 0 {
		t.Errorf("After delete, should have 0 feeds, got %d", len(feeds))
	}

	// Note: Delete() only removes the feed row, not associated items
	// (no cascade in the schema)
	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM item WHERE feed_id=?", f.Id).Scan(&count)
	if count != 1 {
		t.Errorf("Items should still exist after feed-only delete, got %d", count)
	}
}

func TestCreateDuplicate(t *testing.T) {
	setupTestDB(t)

	f1 := &Feed{Url: "https://same.com/feed", Title: "First"}
	err := f1.Create()
	if err != nil {
		t.Fatal(err)
	}

	f2 := &Feed{Url: "https://same.com/feed", Title: "Second"}
	err = f2.Create()
	if err == nil {
		t.Error("Create() should error for duplicate URL")
	}
}

func TestCategoriesEmpty(t *testing.T) {
	setupTestDB(t)

	cats, err := Categories()
	if err != nil {
		t.Fatalf("Categories() should not error on empty DB: %v", err)
	}
	if len(cats) != 0 {
		t.Errorf("Should have 0 categories on empty DB, got %d", len(cats))
	}
}
