package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"adammathes.com/neko/crawler"
	"adammathes.com/neko/exporter"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
)

// NewRouter returns a configured mux with all API routes.
func NewRouter() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/stream", HandleStream)
	mux.HandleFunc("/item/", HandleItem)
	mux.HandleFunc("/feed", HandleFeed)
	mux.HandleFunc("/feed/", HandleFeed)
	mux.HandleFunc("/tag", HandleCategory)
	mux.HandleFunc("/export/", HandleExport)
	mux.HandleFunc("/crawl", HandleCrawl)
	return mux
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func HandleStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	maxID, _ := strconv.ParseInt(r.FormValue("max_id"), 10, 64)
	feedID, _ := strconv.ParseInt(r.FormValue("feed_id"), 10, 64)

	// Backward compatibility with feed_url if feed_id is not provided
	if feedID == 0 && r.FormValue("feed_url") != "" {
		var f feed.Feed
		f.ByUrl(r.FormValue("feed_url"))
		feedID = f.Id
	}

	category := r.FormValue("tag")
	unreadOnly := r.FormValue("read_filter") != "all"
	starredOnly := r.FormValue("starred") == "1" || r.FormValue("starred") == "true"
	searchQuery := r.FormValue("q")

	if searchQuery != "" {
		unreadOnly = false
	}

	items, err := item.Filter(maxID, feedID, category, unreadOnly, starredOnly, 0, searchQuery)
	if err != nil {
		log.Println(err)
		jsonError(w, "failed to filter items", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, items)
}

func HandleItem(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/item/")
	id, _ := strconv.ParseInt(idStr, 10, 64)

	if id == 0 {
		jsonError(w, "invalid item id", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodPut:
		var i item.Item
		if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		if i.Id == 0 {
			i.Id = id
		}
		if i.Id != id {
			jsonError(w, "id mismatch", http.StatusBadRequest)
			return
		}
		i.Save()
		jsonResponse(w, i)

	case http.MethodPost, http.MethodGet:
		// Full text extraction - supporting GET for backward compatibility
		i := item.ItemById(id)
		if i == nil {
			jsonError(w, "item not found", http.StatusNotFound)
			return
		}
		if i.FullContent == "" {
			i.GetFullContent()
		}
		jsonResponse(w, i)

	default:
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func HandleFeed(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		feeds, err := feed.All()
		if err != nil {
			log.Println(err)
			jsonError(w, "failed to fetch feeds", http.StatusInternalServerError)
			return
		}
		jsonResponse(w, feeds)

	case http.MethodPost:
		var f feed.Feed
		if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		if f.Url == "" {
			jsonError(w, "url required", http.StatusBadRequest)
			return
		}
		err := feed.NewFeed(f.Url)
		if err != nil {
			jsonError(w, "failed to create feed", http.StatusInternalServerError)
			return
		}
		f.ByUrl(f.Url)
		ch := make(chan string)
		go func() {
			crawler.CrawlFeed(&f, ch)
			log.Println(<-ch)
		}()
		w.WriteHeader(http.StatusCreated)
		jsonResponse(w, f)

	case http.MethodPut:
		var f feed.Feed
		if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		if f.Id == 0 {
			jsonError(w, "missing feed id", http.StatusBadRequest)
			return
		}
		f.Update()
		jsonResponse(w, f)

	case http.MethodDelete:
		idStr := strings.TrimPrefix(r.URL.Path, "/feed/")
		id, _ := strconv.ParseInt(idStr, 10, 64)
		if id == 0 {
			jsonError(w, "invalid feed id", http.StatusBadRequest)
			return
		}
		f := &feed.Feed{Id: id}
		f.Delete()
		w.WriteHeader(http.StatusNoContent)

	default:
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func HandleCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	categories, err := feed.Categories()
	if err != nil {
		log.Println(err)
		jsonError(w, "failed to fetch categories", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, categories)
}

func HandleExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	format := strings.TrimPrefix(r.URL.Path, "/export/")
	if format == "" {
		jsonError(w, "format required", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "text/plain") // exporter handles formats internally
	w.Write([]byte(exporter.ExportFeeds(format)))
}

func HandleCrawl(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	go crawler.Crawl()
	jsonResponse(w, map[string]string{"message": "crawl started"})
}
