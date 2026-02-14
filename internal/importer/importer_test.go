package importer

import (
	"os"
	"path/filepath"
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
