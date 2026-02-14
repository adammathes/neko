package crawler

import (
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
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

func TestGetFeedContentSuccess(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ua := r.Header.Get("User-Agent")
		if ua == "" {
			t.Error("Request should include User-Agent")
		}
		w.WriteHeader(200)
		w.Write([]byte("<rss><channel><title>Test</title></channel></rss>"))
	}))
	defer ts.Close()

	content := GetFeedContent(ts.URL)
	if content == "" {
		t.Error("GetFeedContent should return content for valid URL")
	}
	if content != "<rss><channel><title>Test</title></channel></rss>" {
		t.Errorf("Unexpected content: %q", content)
	}
}

func TestGetFeedContentBadURL(t *testing.T) {
	content := GetFeedContent("http://invalid.invalid.invalid:99999/feed")
	if content != "" {
		t.Errorf("GetFeedContent should return empty string for bad URL, got %q", content)
	}
}

func TestGetFeedContent404(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(404)
	}))
	defer ts.Close()

	content := GetFeedContent(ts.URL)
	if content != "" {
		t.Errorf("GetFeedContent should return empty for 404, got %q", content)
	}
}

func TestGetFeedContent500(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
	}))
	defer ts.Close()

	content := GetFeedContent(ts.URL)
	if content != "" {
		t.Errorf("GetFeedContent should return empty for 500, got %q", content)
	}
}

func TestGetFeedContentUserAgent(t *testing.T) {
	var receivedUA string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedUA = r.Header.Get("User-Agent")
		w.WriteHeader(200)
		w.Write([]byte("ok"))
	}))
	defer ts.Close()

	GetFeedContent(ts.URL)
	expected := "neko RSS Crawler +https://github.com/adammathes/neko"
	if receivedUA != expected {
		t.Errorf("Expected UA %q, got %q", expected, receivedUA)
	}
}

func TestCrawlFeedWithTestServer(t *testing.T) {
	setupTestDB(t)

	rssContent := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Article 1</title>
      <link>https://example.com/article1</link>
      <description>First article</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article 2</title>
      <link>https://example.com/article2</link>
      <description>Second article</description>
      <pubDate>Tue, 02 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.WriteHeader(200)
		w.Write([]byte(rssContent))
	}))
	defer ts.Close()

	// Create a feed pointing to the test server
	f := &feed.Feed{Url: ts.URL, Title: "Test"}
	f.Create()

	ch := make(chan string, 1)
	CrawlFeed(f, ch)
	result := <-ch

	if result == "" {
		t.Error("CrawlFeed should send a result")
	}

	// Verify items were created
	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM item").Scan(&count)
	if count != 2 {
		t.Errorf("Expected 2 items, got %d", count)
	}
}

func TestCrawlFeedBadContent(t *testing.T) {
	setupTestDB(t)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte("not xml at all"))
	}))
	defer ts.Close()

	f := &feed.Feed{Url: ts.URL, Title: "Bad"}
	f.Create()

	ch := make(chan string, 1)
	CrawlFeed(f, ch)
	result := <-ch

	if result == "" {
		t.Error("CrawlFeed should send a result even on failure")
	}
}

func TestCrawlWorker(t *testing.T) {
	setupTestDB(t)

	rssContent := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Worker Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Worker Article</title>
      <link>https://example.com/worker-article</link>
      <description>An article</description>
    </item>
  </channel>
</rss>`

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte(rssContent))
	}))
	defer ts.Close()

	f := &feed.Feed{Url: ts.URL, Title: "Worker Test"}
	f.Create()

	feeds := make(chan *feed.Feed, 1)
	results := make(chan string, 1)

	feeds <- f
	close(feeds)

	CrawlWorker(feeds, results)
	result := <-results

	if result == "" {
		t.Error("CrawlWorker should produce a result")
	}
}

func TestCrawl(t *testing.T) {
	setupTestDB(t)

	rssContent := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Crawl Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Crawl Article</title>
      <link>https://example.com/crawl-article</link>
      <description>Article for crawl test</description>
    </item>
  </channel>
</rss>`
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte(rssContent))
	}))
	defer ts.Close()

	f := &feed.Feed{Url: ts.URL, Title: "Full Crawl"}
	f.Create()

	// Should not panic
	Crawl()

	var count int
	models.DB.QueryRow("SELECT COUNT(*) FROM item").Scan(&count)
	if count != 1 {
		t.Errorf("Expected 1 item after crawl, got %d", count)
	}
}

func TestCrawlFeedWithExtensions(t *testing.T) {
	setupTestDB(t)

	rssContent := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Extension Feed</title>
    <item>
      <title>Extension Article</title>
      <link>https://example.com/ext</link>
      <description>Short description</description>
      <content:encoded><![CDATA[Much longer content that should be used as description]]></content:encoded>
    </item>
  </channel>
</rss>`

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte(rssContent))
	}))
	defer ts.Close()

	f := &feed.Feed{Url: ts.URL, Title: "Extension Test"}
	f.Create()

	ch := make(chan string, 1)
	CrawlFeed(f, ch)
	<-ch

	var itemTitle, itemDesc string
	err := models.DB.QueryRow("SELECT title, description FROM item WHERE feed_id = ?", f.Id).Scan(&itemTitle, &itemDesc)
	if err != nil {
		log.Fatal(err)
	}

	if itemTitle != "Extension Article" {
		t.Errorf("Expected title 'Extension Article', got %q", itemTitle)
	}
	if !strings.Contains(itemDesc, "Much longer content") {
		t.Errorf("Expected description to contain encoded content, got %q", itemDesc)
	}
}
