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
