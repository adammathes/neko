package item

import (
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
)

func setupBenchDB(b *testing.B) {
	b.Helper()
	config.Config.DBFile = filepath.Join(b.TempDir(), "bench.db")
	models.InitDB()
	b.Cleanup(func() {
		if models.DB != nil {
			models.DB.Close()
		}
	})
}

func createBenchFeed(b *testing.B) int64 {
	b.Helper()
	res, err := models.DB.Exec("INSERT INTO feed(url, title, category) VALUES(?, ?, ?)",
		"https://example.com/feed", "Bench Feed", "tech")
	if err != nil {
		b.Fatal(err)
	}
	id, _ := res.LastInsertId()
	return id
}

func seedBenchItems(b *testing.B, feedID int64, count int) {
	b.Helper()
	for i := 0; i < count; i++ {
		_, err := models.DB.Exec(
			`INSERT INTO item(title, url, description, publish_date, feed_id, read_state, starred)
			 VALUES(?, ?, ?, datetime('now'), ?, 0, 0)`,
			fmt.Sprintf("Bench Item %d", i),
			fmt.Sprintf("https://example.com/item/%d", i),
			fmt.Sprintf("<p>Description for item %d with <b>bold</b> and <a href='https://example.com'>link</a></p>", i),
			feedID,
		)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkItemCreate(b *testing.B) {
	setupBenchDB(b)
	feedID := createBenchFeed(b)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		item := &Item{
			Title:       fmt.Sprintf("Item %d", i),
			Url:         fmt.Sprintf("https://example.com/bench/%d", i),
			Description: "<p>Benchmark item description</p>",
			PublishDate: "2024-01-01 00:00:00",
			FeedId:      feedID,
		}
		_ = item.Create()
	}
}

func BenchmarkItemCreateBatch100(b *testing.B) {
	setupBenchDB(b)
	feedID := createBenchFeed(b)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for j := 0; j < 100; j++ {
			item := &Item{
				Title:       fmt.Sprintf("Batch %d Item %d", i, j),
				Url:         fmt.Sprintf("https://example.com/batch/%d/%d", i, j),
				Description: "<p>Batch item description</p>",
				PublishDate: "2024-01-01 00:00:00",
				FeedId:      feedID,
			}
			_ = item.Create()
		}
	}
}

func BenchmarkFilter_Empty(b *testing.B) {
	setupBenchDB(b)
	_ = createBenchFeed(b)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = Filter(0, nil, "", false, false, 0, "")
	}
}

func BenchmarkFilter_15Items(b *testing.B) {
	setupBenchDB(b)
	feedID := createBenchFeed(b)
	seedBenchItems(b, feedID, 15)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = Filter(0, nil, "", false, false, 0, "")
	}
}

func BenchmarkFilter_WithFTS(b *testing.B) {
	setupBenchDB(b)
	feedID := createBenchFeed(b)
	seedBenchItems(b, feedID, 50)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = Filter(0, nil, "", false, false, 0, "Bench")
	}
}

func BenchmarkFilter_WithImageProxy(b *testing.B) {
	setupBenchDB(b)
	feedID := createBenchFeed(b)

	// Seed items with image-heavy descriptions
	for i := 0; i < 15; i++ {
		_, err := models.DB.Exec(
			`INSERT INTO item(title, url, description, publish_date, feed_id, read_state, starred)
			 VALUES(?, ?, ?, datetime('now'), ?, 0, 0)`,
			fmt.Sprintf("Image Item %d", i),
			fmt.Sprintf("https://example.com/img/%d", i),
			`<p>Text with images <img src="https://example.com/a.jpg" alt="a"> and <img src="https://example.com/b.png" alt="b"></p>`,
			feedID,
		)
		if err != nil {
			b.Fatal(err)
		}
	}

	config.Config.ProxyImages = true
	b.Cleanup(func() { config.Config.ProxyImages = false })

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = Filter(0, nil, "", false, false, 0, "")
	}
}

func BenchmarkFilterPolicy(b *testing.B) {
	html := `<p>Hello <b>world</b> with <a href="https://example.com">link</a> and <img src="https://example.com/img.jpg" alt="test"> and <script>alert('xss')</script></p>`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		p := filterPolicy()
		_ = p.Sanitize(html)
	}
}

func BenchmarkRewriteImages(b *testing.B) {
	html := `<p>Text <img src="https://example.com/1.jpg" alt="1"> more text
		<img src="https://example.com/2.png" alt="2">
		<img src="https://example.com/3.gif" alt="3">
		<img src="https://example.com/4.webp" alt="4" srcset="https://example.com/4-2x.webp 2x, https://example.com/4-3x.webp 3x">
		<img src="https://example.com/5.jpg" alt="5"></p>`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = rewriteImages(html)
	}
}

func BenchmarkItemSave(b *testing.B) {
	setupBenchDB(b)
	feedID := createBenchFeed(b)

	item := &Item{
		Title:       "Save Bench Item",
		Url:         "https://example.com/save-bench",
		Description: "<p>Item to update</p>",
		PublishDate: "2024-01-01 00:00:00",
		FeedId:      feedID,
	}
	if err := item.Create(); err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		item.ReadState = !item.ReadState
		item.Save()
	}
}

func BenchmarkFilter_LargeDataset(b *testing.B) {
	setupBenchDB(b)
	feedID := createBenchFeed(b)

	// Bulk insert 500 items for a realistic dataset
	var sb strings.Builder
	for i := 0; i < 500; i++ {
		if i > 0 {
			sb.WriteString(",")
		}
		sb.WriteString(fmt.Sprintf(
			"('Item %d', 'https://example.com/large/%d', '<p>Description %d</p>', datetime('now'), %d, 0, 0)",
			i, i, i, feedID,
		))
	}
	_, err := models.DB.Exec(
		"INSERT INTO item(title, url, description, publish_date, feed_id, read_state, starred) VALUES " + sb.String(),
	)
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = Filter(0, nil, "", false, false, 0, "")
	}
}
