package crawler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/internal/safehttp"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"

	"github.com/mmcdole/gofeed"
)

const testRSSFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bench Test Feed</title>
    <link>https://example.com</link>
    <description>A feed for benchmarking</description>
    <item>
      <title>Article One</title>
      <link>https://example.com/1</link>
      <description>&lt;p&gt;First article with &lt;b&gt;bold&lt;/b&gt; and &lt;a href="https://example.com"&gt;link&lt;/a&gt;&lt;/p&gt;</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/2</link>
      <description>&lt;p&gt;Second article with some content&lt;/p&gt;</description>
      <pubDate>Tue, 02 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Three</title>
      <link>https://example.com/3</link>
      <description>&lt;p&gt;Third article&lt;/p&gt;</description>
      <pubDate>Wed, 03 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Four</title>
      <link>https://example.com/4</link>
      <description>&lt;p&gt;Fourth article with &lt;img src="https://example.com/img.jpg"&gt;&lt;/p&gt;</description>
      <pubDate>Thu, 04 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Five</title>
      <link>https://example.com/5</link>
      <description>&lt;p&gt;Fifth article&lt;/p&gt;</description>
      <pubDate>Fri, 05 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Six</title>
      <link>https://example.com/6</link>
      <description>&lt;p&gt;Sixth article&lt;/p&gt;</description>
      <pubDate>Sat, 06 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Seven</title>
      <link>https://example.com/7</link>
      <description>&lt;p&gt;Seventh article&lt;/p&gt;</description>
      <pubDate>Sun, 07 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Eight</title>
      <link>https://example.com/8</link>
      <description>&lt;p&gt;Eighth article&lt;/p&gt;</description>
      <pubDate>Mon, 08 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Nine</title>
      <link>https://example.com/9</link>
      <description>&lt;p&gt;Ninth article with longer content to simulate a real feed item that has more text in it&lt;/p&gt;</description>
      <pubDate>Tue, 09 Jan 2024 00:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Ten</title>
      <link>https://example.com/10</link>
      <description>&lt;p&gt;Tenth article&lt;/p&gt;</description>
      <pubDate>Wed, 10 Jan 2024 00:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`

func BenchmarkParseFeed(b *testing.B) {
	fp := gofeed.NewParser()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := fp.ParseString(testRSSFeed)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkCrawlFeedMocked(b *testing.B) {
	safehttp.AllowLocal = true

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.WriteHeader(200)
		w.Write([]byte(testRSSFeed))
	}))
	defer ts.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Each iteration needs a fresh DB since CrawlFeed inserts items
		config.Config.DBFile = ":memory:"
		models.InitDB()

		f := &feed.Feed{Url: ts.URL, Title: "Bench Feed"}
		f.Create()

		ch := make(chan string, 1)
		CrawlFeed(f, ch)
		<-ch

		models.DB.Close()
	}
}

func BenchmarkGetFeedContent(b *testing.B) {
	safehttp.AllowLocal = true

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.WriteHeader(200)
		w.Write([]byte(testRSSFeed))
	}))
	defer ts.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		content := GetFeedContent(ts.URL)
		if content == "" {
			b.Fatal("empty content")
		}
	}
}
