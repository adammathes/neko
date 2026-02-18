package importer

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	config.Config.DBFile = filepath.Join(t.TempDir(), "test.db")
	models.InitDB()
	t.Cleanup(func() {
		if models.DB != nil {
			models.DB.Close()
		}
	})
}

func TestInsertIItem(t *testing.T) {
	setupTestDB(t)

	ii := &IItem{
		Title:       "Test Article",
		Url:         "https://example.com/article",
		Description: "A test article description",
		ReadState:   false,
		Starred:     true,
		Date:        &IDate{Date: "2024-01-15 10:00:00"},
		Feed: &IFeed{
			Url:   "https://example.com/feed",
			Title: "Example Feed",
		},
	}

	InsertIItem(ii)

	// Verify the feed was created
	var feedCount int
	models.DB.QueryRow("SELECT COUNT(*) FROM feed").Scan(&feedCount)
	if feedCount != 1 {
		t.Errorf("Expected 1 feed, got %d", feedCount)
	}

	// Verify the item was created
	var itemCount int
	models.DB.QueryRow("SELECT COUNT(*) FROM item").Scan(&itemCount)
	if itemCount != 1 {
		t.Errorf("Expected 1 item, got %d", itemCount)
	}
}

func TestInsertIItemNilFeed(t *testing.T) {
	setupTestDB(t)

	ii := &IItem{
		Title: "No Feed Item",
		Url:   "https://example.com/nofeed",
		Feed:  nil,
	}

	// Should not panic
	InsertIItem(ii)

	var itemCount int
	models.DB.QueryRow("SELECT COUNT(*) FROM item").Scan(&itemCount)
	if itemCount != 0 {
		t.Errorf("Expected 0 items (nil feed should be skipped), got %d", itemCount)
	}
}

func TestInsertIItemExistingFeed(t *testing.T) {
	setupTestDB(t)

	// Insert feed first
	models.DB.Exec("INSERT INTO feed(url, title) VALUES(?, ?)", "https://example.com/feed", "Existing Feed")

	ii := &IItem{
		Title:       "New Article",
		Url:         "https://example.com/new-article",
		Description: "New article desc",
		Date:        &IDate{Date: "2024-01-15"},
		Feed: &IFeed{
			Url:   "https://example.com/feed",
			Title: "Existing Feed",
		},
	}

	InsertIItem(ii)

	// Should still be just 1 feed
	var feedCount int
	models.DB.QueryRow("SELECT COUNT(*) FROM feed").Scan(&feedCount)
	if feedCount != 1 {
		t.Errorf("Expected 1 feed (reuse existing), got %d", feedCount)
	}
}

func TestImportJSON(t *testing.T) {
	setupTestDB(t)

	dir := t.TempDir()
	jsonFile := filepath.Join(dir, "import.json")

	content := `{"title":"Article 1","url":"https://example.com/1","description":"desc1","read":false,"starred":false,"date":{"$date":"2024-01-01"},"feed":{"url":"https://example.com/feed","title":"Feed 1"}}
{"title":"Article 2","url":"https://example.com/2","description":"desc2","read":true,"starred":true,"date":{"$date":"2024-01-02"},"feed":{"url":"https://example.com/feed","title":"Feed 1"}}`

	err := os.WriteFile(jsonFile, []byte(content), 0644)
	if err != nil {
		t.Fatal(err)
	}

	ImportJSON(jsonFile)

	var itemCount int
	models.DB.QueryRow("SELECT COUNT(*) FROM item").Scan(&itemCount)
	if itemCount != 2 {
		t.Errorf("Expected 2 items after import, got %d", itemCount)
	}

	var feedCount int
	models.DB.QueryRow("SELECT COUNT(*) FROM feed").Scan(&feedCount)
	if feedCount != 1 {
		t.Errorf("Expected 1 feed after import, got %d", feedCount)
	}
}

func TestImportJSONInvalid(t *testing.T) {
	setupTestDB(t)
	dir := t.TempDir()
	jsonFile := filepath.Join(dir, "invalid.json")
	os.WriteFile(jsonFile, []byte("not json"), 0644)

	err := ImportJSON(jsonFile)
	if err == nil {
		t.Error("ImportJSON should error on invalid JSON")
	}
}

func TestImportJSONNonexistent(t *testing.T) {
	setupTestDB(t)
	err := ImportJSON("/nonexistent/file.json")
	if err == nil {
		t.Error("ImportJSON should error on nonexistent file")
	}
}

// Test the ImportFeeds dispatcher function (previously 0% coverage)
func TestImportFeedsOPML(t *testing.T) {
	setupTestDB(t)

	opml := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>test</title></head>
  <body>
    <outline type="rss" text="Feed A" xmlUrl="https://a.com/feed" htmlUrl="https://a.com"/>
  </body>
</opml>`

	err := ImportFeeds("opml", strings.NewReader(opml))
	if err != nil {
		t.Fatalf("ImportFeeds(opml) failed: %v", err)
	}

	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM feed").Scan(&count)
	if count != 1 {
		t.Errorf("expected 1 feed, got %d", count)
	}
}

func TestImportFeedsText(t *testing.T) {
	setupTestDB(t)

	text := "https://example.com/feed1\nhttps://example.com/feed2\n"

	err := ImportFeeds("text", strings.NewReader(text))
	if err != nil {
		t.Fatalf("ImportFeeds(text) failed: %v", err)
	}

	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM feed").Scan(&count)
	if count != 2 {
		t.Errorf("expected 2 feeds, got %d", count)
	}
}

func TestImportFeedsJSON(t *testing.T) {
	setupTestDB(t)

	jsonContent := `{"title":"A1","url":"https://example.com/1","description":"d","feed":{"url":"https://example.com/feed","title":"F1"}}`

	err := ImportFeeds("json", strings.NewReader(jsonContent))
	if err != nil {
		t.Fatalf("ImportFeeds(json) failed: %v", err)
	}

	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM item").Scan(&count)
	if count != 1 {
		t.Errorf("expected 1 item, got %d", count)
	}
}

func TestImportFeedsUnsupported(t *testing.T) {
	err := ImportFeeds("csv", strings.NewReader("data"))
	if err == nil {
		t.Error("ImportFeeds should error for unsupported format")
	}
	if err != nil && !strings.Contains(err.Error(), "unsupported") {
		t.Errorf("expected 'unsupported' error, got: %v", err)
	}
}

func TestImportOPMLInvalid(t *testing.T) {
	setupTestDB(t)
	err := ImportOPML(strings.NewReader("not valid xml"))
	if err == nil {
		t.Error("ImportOPML should error on invalid XML")
	}
}

func TestImportOPMLNestedCategories(t *testing.T) {
	setupTestDB(t)

	opml := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>test</title></head>
  <body>
    <outline text="Tech">
      <outline text="Programming">
        <outline type="rss" text="Blog A" xmlUrl="https://a.com/feed" htmlUrl="https://a.com"/>
      </outline>
    </outline>
    <outline type="rss" xmlUrl="https://b.com/feed" htmlUrl="https://b.com" category="news"/>
  </body>
</opml>`

	err := ImportOPML(strings.NewReader(opml))
	if err != nil {
		t.Fatalf("ImportOPML failed: %v", err)
	}

	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM feed").Scan(&count)
	if count != 2 {
		t.Errorf("expected 2 feeds, got %d", count)
	}

	// Verify nested category is inherited
	var category string
	models.DB.QueryRow("SELECT category FROM feed WHERE url=?", "https://a.com/feed").Scan(&category)
	if category != "Programming" {
		t.Errorf("expected category 'Programming' for nested feed, got %q", category)
	}

	// Feed with category attribute
	models.DB.QueryRow("SELECT category FROM feed WHERE url=?", "https://b.com/feed").Scan(&category)
	if category != "news" {
		t.Errorf("expected category 'news' for feed with category attr, got %q", category)
	}
}

func TestInsertIItemNilDate(t *testing.T) {
	setupTestDB(t)

	ii := &IItem{
		Title:       "No Date Article",
		Url:         "https://example.com/nodate",
		Description: "Article without date",
		Date:        nil,
		Feed: &IFeed{
			Url:   "https://example.com/feed",
			Title: "Test Feed",
		},
	}

	err := InsertIItem(ii)
	if err != nil {
		t.Errorf("InsertIItem with nil date should not error, got %v", err)
	}

	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM item").Scan(&count)
	if count != 1 {
		t.Errorf("expected 1 item, got %d", count)
	}
}

func TestImportJSONReaderEmpty(t *testing.T) {
	setupTestDB(t)

	// Empty reader - should not error (just EOF immediately)
	err := ImportJSONReader(strings.NewReader(""))
	if err != nil {
		t.Errorf("ImportJSONReader with empty input should not error, got %v", err)
	}
}

func TestImportTextSkipsCommentsAndBlanks(t *testing.T) {
	setupTestDB(t)

	text := `
# This is a comment
https://example.com/feed1

   # Another comment

https://example.com/feed2
`

	err := ImportText(strings.NewReader(text))
	if err != nil {
		t.Fatalf("ImportText failed: %v", err)
	}

	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM feed").Scan(&count)
	if count != 2 {
		t.Errorf("expected 2 feeds (comments and blanks skipped), got %d", count)
	}
}
