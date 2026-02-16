package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
)

func setupBenchDB(b *testing.B) {
	b.Helper()
	testMu.Lock()
	config.Config.DBFile = filepath.Join(b.TempDir(), "bench.db")
	models.InitDB()
	b.Cleanup(func() {
		if models.DB != nil {
			models.DB.Close()
		}
		testMu.Unlock()
	})
}

func seedBenchData(b *testing.B, count int) {
	b.Helper()
	f := &feed.Feed{Url: "http://example.com/bench", Title: "Bench Feed", Category: "tech"}
	f.Create()

	for i := 0; i < count; i++ {
		it := &item.Item{
			Title:       fmt.Sprintf("Bench Item %d", i),
			Url:         fmt.Sprintf("http://example.com/bench/%d", i),
			Description: fmt.Sprintf("<p>Description for bench item %d with <b>HTML</b></p>", i),
			PublishDate: "2024-01-01 00:00:00",
			FeedId:      f.Id,
		}
		_ = it.Create()
	}
}

func BenchmarkHandleStream(b *testing.B) {
	setupBenchDB(b)
	seedBenchData(b, 15)
	server := newTestServer()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/stream", nil)
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", rr.Code)
		}
	}
}

func BenchmarkHandleStreamWithSearch(b *testing.B) {
	setupBenchDB(b)
	seedBenchData(b, 50)
	server := newTestServer()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/stream?q=Bench", nil)
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", rr.Code)
		}
	}
}

func BenchmarkHandleItemUpdate(b *testing.B) {
	setupBenchDB(b)
	seedBenchData(b, 1)
	server := newTestServer()

	// Get the item ID
	items, _ := item.Filter(0, nil, "", false, false, 0, "")
	if len(items) == 0 {
		b.Fatal("no items seeded")
	}
	itemID := items[0].Id

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		read := i%2 == 0
		body, _ := json.Marshal(item.Item{
			Id:        itemID,
			ReadState: read,
		})
		req := httptest.NewRequest("PUT", "/item/"+strconv.FormatInt(itemID, 10), bytes.NewBuffer(body))
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", rr.Code)
		}
	}
}

func BenchmarkHandleFeedList(b *testing.B) {
	setupBenchDB(b)

	// Create several feeds
	for i := 0; i < 10; i++ {
		f := &feed.Feed{
			Url:      fmt.Sprintf("http://example.com/feed/%d", i),
			Title:    fmt.Sprintf("Feed %d", i),
			Category: "tech",
		}
		f.Create()
	}

	server := newTestServer()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/feed", nil)
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", rr.Code)
		}
	}
}
