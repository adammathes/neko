package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
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

func seedData(t *testing.T) {
	t.Helper()
	f := &feed.Feed{Url: "http://example.com", Title: "Test Feed", Category: "tech"}
	f.Create()

	i := &item.Item{
		Title:  "Test Item",
		Url:    "http://example.com/1",
		FeedId: f.Id,
	}
	i.Create()
}

func TestStream(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	router := NewRouter()

	req := httptest.NewRequest("GET", "/stream", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var items []item.Item
	json.NewDecoder(rr.Body).Decode(&items)
	if len(items) != 1 {
		t.Errorf("expected 1 item, got %d", len(items))
	}
}

func TestFeedCRUD(t *testing.T) {
	setupTestDB(t)
	router := NewRouter()

	// Create
	f := feed.Feed{Url: "http://example.com", Title: "New Feed"}
	b, _ := json.Marshal(f)
	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(b))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rr.Code)
	}

	// List
	req = httptest.NewRequest("GET", "/feed", nil)
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	var feeds []feed.Feed
	json.NewDecoder(rr.Body).Decode(&feeds)
	if len(feeds) != 1 {
		t.Errorf("expected 1 feed, got %d", len(feeds))
	}

	feedID := feeds[0].Id

	// Update
	feeds[0].Title = "Updated Title"
	b, _ = json.Marshal(feeds[0])
	req = httptest.NewRequest("PUT", "/feed", bytes.NewBuffer(b))
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	// Delete
	req = httptest.NewRequest("DELETE", "/feed/"+strconv.FormatInt(feedID, 10), nil)
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}
}

func TestItemUpdate(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	router := NewRouter()

	// Get an item first to know its ID
	var id int64
	err := models.DB.QueryRow("SELECT id FROM item LIMIT 1").Scan(&id)
	if err != nil {
		t.Fatal(err)
	}

	i := item.Item{Id: id, ReadState: true}
	b, _ := json.Marshal(i)
	req := httptest.NewRequest("PUT", "/item/"+strconv.FormatInt(id, 10), bytes.NewBuffer(b))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestGetCategories(t *testing.T) {
	setupTestDB(t)
	seedData(t)
	router := NewRouter()

	req := httptest.NewRequest("GET", "/tag", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var cats []feed.Category
	json.NewDecoder(rr.Body).Decode(&cats)
	if len(cats) != 1 {
		t.Errorf("expected 1 category, got %d", len(cats))
	}
}
