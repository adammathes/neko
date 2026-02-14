package crawler

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
)

func TestCrawlIntegration(t *testing.T) {
	setupTestDB(t)

	// Mock RSS feed server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		os.Stdout.Write([]byte("serving mock rss\n"))
		fmt.Fprint(w, `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
 <title>Test Feed</title>
 <link>http://example.com/</link>
 <description>Test Description</description>
 <item>
  <title>Test Item 1</title>
  <link>http://example.com/item1</link>
  <description>Item 1 Description</description>
  <pubDate>Mon, 01 Jan 2024 00:00:00 +0000</pubDate>
 </item>
</channel>
</rss>`)
	}))
	defer ts.Close()

	// Add the feed
	f := &feed.Feed{Url: ts.URL}
	err := f.Create()
	if err != nil {
		t.Fatalf("Failed to create feed: %v", err)
	}

	// Crawl
	ch := make(chan string, 1)
	CrawlFeed(f, ch)

	res := <-ch
	if res == "" {
		t.Fatal("CrawlFeed returned empty result")
	}

	// Verify items were stored
	items, err := item.Filter(0, f.Id, "", false, false, 0, "")
	if err != nil {
		t.Fatalf("Failed to filter items: %v", err)
	}

	if len(items) != 1 {
		t.Fatalf("Expected 1 item, got %d", len(items))
	}

	if items[0].Title != "Test Item 1" {
		t.Errorf("Expected 'Test Item 1', got %q", items[0].Title)
	}
}
