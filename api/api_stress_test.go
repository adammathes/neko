package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
)

func TestStress_ConcurrentStreamReads(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}

	setupTestDB(t)
	seedStressData(t, 50)
	server := newTestServer()

	const goroutines = 50
	var wg sync.WaitGroup
	errors := make(chan error, goroutines)

	start := time.Now()
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest("GET", "/stream", nil)
			rr := httptest.NewRecorder()
			server.ServeHTTP(rr, req)
			if rr.Code != http.StatusOK {
				errors <- fmt.Errorf("got status %d", rr.Code)
				return
			}
			var items []item.Item
			if err := json.NewDecoder(rr.Body).Decode(&items); err != nil {
				errors <- fmt.Errorf("decode error: %v", err)
			}
		}()
	}
	wg.Wait()
	close(errors)
	elapsed := time.Since(start)

	for err := range errors {
		t.Errorf("concurrent stream read error: %v", err)
	}

	t.Logf("50 concurrent /stream reads completed in %v", elapsed)
	if elapsed > 10*time.Second {
		t.Errorf("concurrent reads took too long: %v (threshold: 10s)", elapsed)
	}
}

func TestStress_ConcurrentItemUpdates(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}

	setupTestDB(t)

	// Seed 50 items for concurrent updates
	f := &feed.Feed{Url: "http://example.com/stress", Title: "Stress Feed"}
	f.Create()

	var itemIDs []int64
	for i := 0; i < 50; i++ {
		it := &item.Item{
			Title:       fmt.Sprintf("Stress Item %d", i),
			Url:         fmt.Sprintf("http://example.com/stress/%d", i),
			Description: "<p>Stress test item</p>",
			PublishDate: "2024-01-01 00:00:00",
			FeedId:      f.Id,
		}
		_ = it.Create()
		itemIDs = append(itemIDs, it.Id)
	}

	server := newTestServer()

	const goroutines = 50
	var wg sync.WaitGroup
	errors := make(chan error, goroutines)

	start := time.Now()
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			id := itemIDs[idx]
			body, _ := json.Marshal(item.Item{
				Id:        id,
				ReadState: true,
				Starred:   idx%2 == 0,
			})
			req := httptest.NewRequest("PUT", "/item/"+strconv.FormatInt(id, 10), bytes.NewBuffer(body))
			rr := httptest.NewRecorder()
			server.ServeHTTP(rr, req)
			if rr.Code != http.StatusOK {
				errors <- fmt.Errorf("item %d update got status %d", id, rr.Code)
			}
		}(i)
	}
	wg.Wait()
	close(errors)
	elapsed := time.Since(start)

	for err := range errors {
		t.Errorf("concurrent item update error: %v", err)
	}

	t.Logf("50 concurrent item updates completed in %v", elapsed)
	if elapsed > 10*time.Second {
		t.Errorf("concurrent updates took too long: %v (threshold: 10s)", elapsed)
	}
}

func TestStress_LargeDataset(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}

	setupTestDB(t)
	seedStressData(t, 1000)
	server := newTestServer()

	// Test basic filter on large dataset
	start := time.Now()
	req := httptest.NewRequest("GET", "/stream", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	elapsed := time.Since(start)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var items []item.Item
	if err := json.NewDecoder(rr.Body).Decode(&items); err != nil {
		t.Fatalf("decode error: %v", err)
	}

	if len(items) != 15 {
		t.Errorf("expected 15 items (LIMIT), got %d", len(items))
	}

	t.Logf("filter on 1000 items completed in %v", elapsed)
	if elapsed > 2*time.Second {
		t.Errorf("large dataset filter took too long: %v (threshold: 2s)", elapsed)
	}

	// Test pagination
	start = time.Now()
	lastID := items[len(items)-1].Id
	req = httptest.NewRequest("GET", fmt.Sprintf("/stream?max_id=%d", lastID), nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	elapsed = time.Since(start)

	if rr.Code != http.StatusOK {
		t.Fatalf("pagination: expected 200, got %d", rr.Code)
	}

	var page2 []item.Item
	json.NewDecoder(rr.Body).Decode(&page2)
	if len(page2) != 15 {
		t.Errorf("pagination: expected 15 items, got %d", len(page2))
	}

	t.Logf("paginated filter completed in %v", elapsed)

	// Test FTS on large dataset
	start = time.Now()
	req = httptest.NewRequest("GET", "/stream?q=Bench", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	elapsed = time.Since(start)

	if rr.Code != http.StatusOK {
		t.Fatalf("FTS: expected 200, got %d", rr.Code)
	}

	t.Logf("FTS on 1000 items completed in %v", elapsed)
	if elapsed > 2*time.Second {
		t.Errorf("FTS on large dataset took too long: %v (threshold: 2s)", elapsed)
	}
}

func TestStress_ConcurrentMixedOperations(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}

	setupTestDB(t)

	// Create multiple feeds with items across categories
	categories := []string{"tech", "news", "science", "art"}
	for i, cat := range categories {
		f := &feed.Feed{
			Url:      fmt.Sprintf("http://example.com/mixed/%d", i),
			Title:    fmt.Sprintf("Mixed Feed %d", i),
			Category: cat,
		}
		f.Create()
		for j := 0; j < 25; j++ {
			it := &item.Item{
				Title:       fmt.Sprintf("Mixed Item %d-%d", i, j),
				Url:         fmt.Sprintf("http://example.com/mixed/%d/%d", i, j),
				Description: fmt.Sprintf("<p>Mixed content %d-%d</p>", i, j),
				PublishDate: "2024-01-01 00:00:00",
				FeedId:      f.Id,
			}
			_ = it.Create()
		}
	}

	server := newTestServer()

	const goroutines = 40
	var wg sync.WaitGroup
	errors := make(chan error, goroutines*2)

	start := time.Now()

	// Mix of reads, filtered reads, updates, and exports
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			var req *http.Request
			switch idx % 4 {
			case 0:
				// Stream with category filter
				req = httptest.NewRequest("GET", "/stream?tag="+categories[idx%len(categories)], nil)
			case 1:
				// Stream with search
				req = httptest.NewRequest("GET", "/stream?q=Mixed", nil)
			case 2:
				// Feed list
				req = httptest.NewRequest("GET", "/feed", nil)
			case 3:
				// Export
				req = httptest.NewRequest("GET", "/export/json", nil)
			}

			rr := httptest.NewRecorder()
			server.ServeHTTP(rr, req)
			if rr.Code != http.StatusOK {
				errors <- fmt.Errorf("op %d (type %d) got status %d", idx, idx%4, rr.Code)
			}
		}(i)
	}
	wg.Wait()
	close(errors)
	elapsed := time.Since(start)

	for err := range errors {
		t.Errorf("concurrent mixed operation error: %v", err)
	}

	t.Logf("40 concurrent mixed operations completed in %v", elapsed)
	if elapsed > 10*time.Second {
		t.Errorf("concurrent mixed operations took too long: %v (threshold: 10s)", elapsed)
	}
}

func TestStress_RapidReadMarkUnmark(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}

	setupTestDB(t)

	f := &feed.Feed{Url: "http://example.com/rapid", Title: "Rapid Feed"}
	f.Create()
	it := &item.Item{
		Title:  "Rapid Toggle",
		Url:    "http://example.com/rapid/1",
		FeedId: f.Id,
	}
	_ = it.Create()

	server := newTestServer()

	// Rapidly toggle read state on the same item
	const iterations = 100
	var wg sync.WaitGroup
	errors := make(chan error, iterations)

	start := time.Now()
	for i := 0; i < iterations; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			body, _ := json.Marshal(item.Item{
				Id:        it.Id,
				ReadState: idx%2 == 0,
				Starred:   idx%3 == 0,
			})
			req := httptest.NewRequest("PUT", "/item/"+strconv.FormatInt(it.Id, 10), bytes.NewBuffer(body))
			rr := httptest.NewRecorder()
			server.ServeHTTP(rr, req)
			if rr.Code != http.StatusOK {
				errors <- fmt.Errorf("rapid update %d got status %d", idx, rr.Code)
			}
		}(i)
	}
	wg.Wait()
	close(errors)
	elapsed := time.Since(start)

	for err := range errors {
		t.Errorf("rapid toggle error: %v", err)
	}

	t.Logf("100 concurrent read-state toggles completed in %v", elapsed)
	if elapsed > 10*time.Second {
		t.Errorf("rapid toggles took too long: %v (threshold: 10s)", elapsed)
	}
}

func seedStressData(t *testing.T, count int) {
	t.Helper()
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
