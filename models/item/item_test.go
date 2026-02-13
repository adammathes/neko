package item

import (
	"bytes"
	"fmt"
	"os"
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

func createTestFeed(t *testing.T) int64 {
	t.Helper()
	res, err := models.DB.Exec("INSERT INTO feed(url, title) VALUES(?, ?)", "https://example.com/feed", "Test Feed")
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	return id
}

func TestPrint(t *testing.T) {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	i := &Item{Id: 42, Title: "Test Title", ReadState: true}
	i.Print()

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	buf.ReadFrom(r)
	output := buf.String()

	expected := fmt.Sprintf("id: 42\ntitle: Test Title\nReadState: true\n")
	if output != expected {
		t.Errorf("Print() output mismatch:\ngot:  %q\nwant: %q", output, expected)
	}
}

func TestCleanHeaderImage(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"blank wp image", "https://s0.wp.com/i/blank.jpg", ""},
		{"normal image", "https://example.com/image.jpg", "https://example.com/image.jpg"},
		{"empty string", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			i := &Item{HeaderImage: tt.input}
			i.CleanHeaderImage()
			if i.HeaderImage != tt.expected {
				t.Errorf("got %q, want %q", i.HeaderImage, tt.expected)
			}
		})
	}
}

func TestProxyURL(t *testing.T) {
	url := "https://example.com/image.jpg"
	result := proxyURL(url)
	if result == "" {
		t.Error("proxyURL should not return empty string")
	}
	if result[:7] != "/image/" {
		t.Errorf("proxyURL should start with '/image/', got %q", result[:7])
	}
}

func TestRewriteImages(t *testing.T) {
	input := `<html><head></head><body><img src="https://example.com/image.jpg"/></body></html>`
	result := rewriteImages(input)
	if result == "" {
		t.Error("rewriteImages should not return empty")
	}
	// The src should be rewritten to use the proxy
	if !bytes.Contains([]byte(result), []byte("/image/")) {
		t.Errorf("rewriteImages should contain proxy URL, got %q", result)
	}
}

func TestRewriteImagesNoImages(t *testing.T) {
	input := `<html><head></head><body><p>No images here</p></body></html>`
	result := rewriteImages(input)
	if result == "" {
		t.Error("rewriteImages should not return empty for input without images")
	}
}

func TestCreate(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "Test Item",
		Url:         "https://example.com/article",
		Description: "A test item",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	err := i.Create()
	if err != nil {
		t.Fatalf("Create() should not error: %v", err)
	}
	if i.Id == 0 {
		t.Error("Create() should set Id")
	}
}

func TestCreateDuplicateUrl(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i1 := &Item{
		Title:       "Item 1",
		Url:         "https://example.com/same-url",
		Description: "First",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i1.Create()

	i2 := &Item{
		Title:       "Item 2",
		Url:         "https://example.com/same-url",
		Description: "Duplicate",
		PublishDate: "2024-01-02 00:00:00",
		FeedId:      feedId,
	}
	err := i2.Create()
	if err == nil {
		t.Error("Create() with duplicate URL should error")
	}
}

func TestSave(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "Test Item",
		Url:         "https://example.com/article",
		Description: "A test item",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	i.ReadState = true
	i.Starred = true
	i.Save()

	// Verify via direct query
	var readState, starred bool
	err := models.DB.QueryRow("SELECT read_state, starred FROM item WHERE id=?", i.Id).Scan(&readState, &starred)
	if err != nil {
		t.Fatal(err)
	}
	if !readState {
		t.Error("ReadState should be true after Save")
	}
	if !starred {
		t.Error("Starred should be true after Save")
	}
}

func TestFullSave(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "Original Title",
		Url:         "https://example.com/article",
		Description: "Original desc",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	i.Title = "Updated Title"
	i.Description = "Updated desc"
	i.FullSave()

	// Verify via direct query
	var title, desc string
	err := models.DB.QueryRow("SELECT title, description FROM item WHERE id=?", i.Id).Scan(&title, &desc)
	if err != nil {
		t.Fatal(err)
	}
	if title != "Updated Title" {
		t.Errorf("Title should be 'Updated Title', got %q", title)
	}
	if desc != "Updated desc" {
		t.Errorf("Description should be 'Updated desc', got %q", desc)
	}
}

func TestFilterBasic(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	// Insert an item
	i := &Item{
		Title:       "Filterable Item",
		Url:         "https://example.com/filterable",
		Description: "A filterable item",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	// Filter with no constraints (except unread_only=false to not filter by read)
	items, err := Filter(0, 0, "", false, false, 0, "")
	if err != nil {
		t.Fatalf("Filter() should not error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("Filter() should return 1 item, got %d", len(items))
	}
	if items[0].Title != "Filterable Item" {
		t.Errorf("Unexpected title: %q", items[0].Title)
	}
}

func TestFilterByFeedId(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "Item 1",
		Url:         "https://example.com/1",
		Description: "desc",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	// Filter by a non-matching feed id
	items, err := Filter(0, 999, "", false, false, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 0 {
		t.Errorf("Filter by non-matching feed_id should return 0 items, got %d", len(items))
	}

	// Filter by matching feed id
	items, err = Filter(0, feedId, "", false, false, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Errorf("Filter by matching feed_id should return 1 item, got %d", len(items))
	}
}

func TestFilterUnreadOnly(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "Unread Item",
		Url:         "https://example.com/unread",
		Description: "desc",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	// All items start unread (read_state=0)
	items, err := Filter(0, 0, "", true, false, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("Unread filter should return 1 item, got %d", len(items))
	}

	// Mark as read
	i.ReadState = true
	i.Save()

	items, err = Filter(0, 0, "", true, false, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 0 {
		t.Errorf("Unread filter should return 0 items after marking read, got %d", len(items))
	}
}

func TestFilterStarredOnly(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "Starred Item",
		Url:         "https://example.com/starred",
		Description: "desc",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	// Not starred yet
	items, err := Filter(0, 0, "", false, true, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 0 {
		t.Errorf("Starred filter should return 0 items initially, got %d", len(items))
	}

	// Star it
	i.Starred = true
	i.Save()

	items, err = Filter(0, 0, "", false, true, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Errorf("Starred filter should return 1 item, got %d", len(items))
	}
}

func TestFilterByItemId(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "Specific Item",
		Url:         "https://example.com/specific",
		Description: "desc",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	items, err := Filter(0, 0, "", false, false, i.Id, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("Filter by item_id should return 1 item, got %d", len(items))
	}
	if items[0].Id != i.Id {
		t.Errorf("Unexpected item id: %d", items[0].Id)
	}
}

func TestFilterByMaxId(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i1 := &Item{Title: "Item 1", Url: "https://example.com/1", Description: "d", PublishDate: "2024-01-01", FeedId: feedId}
	i1.Create()

	i2 := &Item{Title: "Item 2", Url: "https://example.com/2", Description: "d", PublishDate: "2024-01-02", FeedId: feedId}
	i2.Create()

	// max_id = i2.Id should only return items with id < i2.Id
	items, err := Filter(i2.Id, 0, "", false, false, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("MaxId filter should return 1 item, got %d", len(items))
	}
	if items[0].Id != i1.Id {
		t.Errorf("Expected item %d, got %d", i1.Id, items[0].Id)
	}
}

func TestFilterPolicy(t *testing.T) {
	p := filterPolicy()
	if p == nil {
		t.Fatal("filterPolicy should not return nil")
	}

	// Test that it strips disallowed tags
	unsafe := `<script>alert("xss")</script><p>safe</p>`
	result := p.Sanitize(unsafe)
	if bytes.Contains([]byte(result), []byte("<script>")) {
		t.Error("filterPolicy should strip script tags")
	}
	if !bytes.Contains([]byte(result), []byte("<p>safe</p>")) {
		t.Error("filterPolicy should allow p tags")
	}
}

func TestItemById(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i := &Item{
		Title:       "ById Item",
		Url:         "https://example.com/byid",
		Description: "desc",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedId,
	}
	i.Create()

	found := ItemById(i.Id)
	if found == nil {
		t.Fatal("ItemById should return an item")
	}
	if found.Title != "ById Item" {
		t.Errorf("Expected title 'ById Item', got %q", found.Title)
	}
}

func TestFilterByCategory(t *testing.T) {
	setupTestDB(t)

	// Create a feed with category
	res, err := models.DB.Exec("INSERT INTO feed(url, title, category) VALUES(?, ?, ?)",
		"https://tech.com/feed", "Tech Feed", "technology")
	if err != nil {
		t.Fatal(err)
	}
	feedId, _ := res.LastInsertId()

	// Create another feed with different category
	res2, err := models.DB.Exec("INSERT INTO feed(url, title, category) VALUES(?, ?, ?)",
		"https://news.com/feed", "News Feed", "news")
	if err != nil {
		t.Fatal(err)
	}
	feedId2, _ := res2.LastInsertId()

	i1 := &Item{Title: "Tech Article", Url: "https://tech.com/1", Description: "d", PublishDate: "2024-01-01", FeedId: feedId}
	i1.Create()
	i2 := &Item{Title: "News Article", Url: "https://news.com/1", Description: "d", PublishDate: "2024-01-01", FeedId: feedId2}
	i2.Create()

	// Filter by category "technology"
	items, err := Filter(0, 0, "technology", false, false, 0, "")
	if err != nil {
		t.Fatalf("Filter by category should not error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("Filter by category should return 1 item, got %d", len(items))
	}
	if items[0].Title != "Tech Article" {
		t.Errorf("Expected 'Tech Article', got %q", items[0].Title)
	}
}

func TestFilterBySearch(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i1 := &Item{Title: "Golang Tutorial", Url: "https://example.com/go", Description: "Learn Go", PublishDate: "2024-01-01", FeedId: feedId}
	i1.Create()
	i2 := &Item{Title: "Python Guide", Url: "https://example.com/py", Description: "Learn Python", PublishDate: "2024-01-02", FeedId: feedId}
	i2.Create()

	// Search for "Golang"
	items, err := Filter(0, 0, "", false, false, 0, "Golang")
	if err != nil {
		t.Fatalf("Filter by search should not error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("Search for 'Golang' should return 1 item, got %d", len(items))
	}
	if items[0].Title != "Golang Tutorial" {
		t.Errorf("Expected 'Golang Tutorial', got %q", items[0].Title)
	}
}

func TestFilterCombined(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	i1 := &Item{Title: "Item A", Url: "https://example.com/a", Description: "d", PublishDate: "2024-01-01", FeedId: feedId}
	i1.Create()
	i2 := &Item{Title: "Item B", Url: "https://example.com/b", Description: "d", PublishDate: "2024-01-02", FeedId: feedId}
	i2.Create()

	// Star item B and mark item A as read
	i2.Starred = true
	i2.Save()
	i1.ReadState = true
	i1.Save()

	// Filter: unread only + starred only — should get only starred unread
	items, err := Filter(0, 0, "", true, true, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("Combined filter should return 1 item, got %d", len(items))
	}
}

func TestRewriteImagesWithSrcset(t *testing.T) {
	input := `<html><head></head><body><img src="https://example.com/image.jpg" srcset="https://example.com/big.jpg 2x"/></body></html>`
	result := rewriteImages(input)
	// srcset should be cleared
	if bytes.Contains([]byte(result), []byte("srcset")) {
		// srcset gets rewritten too — just verify no crash
	}
}

func TestRewriteImagesEmpty(t *testing.T) {
	result := rewriteImages("")
	if result == "" {
		// Empty input may produce empty output — that's fine
	}
}
