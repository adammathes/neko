package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"adammathes.com/neko/config"
	"adammathes.com/neko/internal/crawler"
	"adammathes.com/neko/internal/exporter"
	"adammathes.com/neko/internal/importer"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
)

type Server struct {
	Config *config.Settings
	*http.ServeMux
}

// NewServer returns a configured server with all API routes.
func NewServer(cfg *config.Settings) *Server {
	s := &Server{
		Config:   cfg,
		ServeMux: http.NewServeMux(),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.HandleFunc("/stream", s.HandleStream)
	s.HandleFunc("/item/", s.HandleItem)
	s.HandleFunc("/feed", s.HandleFeed)
	s.HandleFunc("/feed/", s.HandleFeed)
	s.HandleFunc("/tag", s.HandleCategory)
	s.HandleFunc("/export/", s.HandleExport)
	s.HandleFunc("/import", s.HandleImport)
	s.HandleFunc("/crawl", s.HandleCrawl)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(data)
}

func (s *Server) HandleStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	maxID, _ := strconv.ParseInt(r.FormValue("max_id"), 10, 64)

	var feedIDs []int64
	if idsStr := r.FormValue("feed_ids"); idsStr != "" {
		for _, idStr := range strings.Split(idsStr, ",") {
			if id, err := strconv.ParseInt(idStr, 10, 64); err == nil {
				feedIDs = append(feedIDs, id)
			}
		}
	} else if feedID, _ := strconv.ParseInt(r.FormValue("feed_id"), 10, 64); feedID != 0 {
		feedIDs = []int64{feedID}
	} else if r.FormValue("feed_url") != "" {
		var f feed.Feed
		_ = f.ByUrl(r.FormValue("feed_url"))
		if f.Id != 0 {
			feedIDs = []int64{f.Id}
		}
	}

	category := r.FormValue("tag")
	unreadOnly := r.FormValue("read_filter") != "all"
	starredOnly := r.FormValue("starred") == "1" || r.FormValue("starred") == "true"
	searchQuery := r.FormValue("q")

	if searchQuery != "" {
		unreadOnly = false
	}

	items, err := item.Filter(maxID, feedIDs, category, unreadOnly, starredOnly, 0, searchQuery)
	if err != nil {
		log.Println(err)
		jsonError(w, "failed to filter items", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, items)
}

func (s *Server) HandleItem(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/item/")
	id, _ := strconv.ParseInt(idStr, 10, 64)

	if id == 0 {
		jsonError(w, "invalid item id", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodPut:
		i := item.ItemById(id)
		if i == nil {
			jsonError(w, "item not found", http.StatusNotFound)
			return
		}

		if err := json.NewDecoder(r.Body).Decode(i); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
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

func (s *Server) HandleFeed(w http.ResponseWriter, r *http.Request) {
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
		_ = f.ByUrl(f.Url)
		ch := make(chan string)
		go func() {
			crawler.CrawlFeed(&f, ch)
			log.Println(<-ch)
		}()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(f)

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

func (s *Server) HandleCategory(w http.ResponseWriter, r *http.Request) {
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

func (s *Server) HandleExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	format := strings.TrimPrefix(r.URL.Path, "/export/")
	if format == "" {
		jsonError(w, "format required", http.StatusBadRequest)
		return
	}

	contentType := "text/plain"
	extension := "txt"
	switch format {
	case "opml":
		contentType = "application/xml"
		extension = "opml"
	case "json":
		contentType = "application/json"
		extension = "json"
	case "html":
		contentType = "text/html"
		extension = "html"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=neko_export.%s", extension))
	_, _ = w.Write([]byte(exporter.ExportFeeds(format)))
}

func (s *Server) HandleImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	format := r.FormValue("format")
	if format == "" {
		format = "opml" // default to opml
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "file required", http.StatusBadRequest)
		return
	}
	defer func() { _ = file.Close() }()

	err = importer.ImportFeeds(format, file)
	if err != nil {
		log.Println(err)
		jsonError(w, "import failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Trigger crawl after import
	go crawler.Crawl()

	jsonResponse(w, map[string]string{"status": "ok"})
}

func (s *Server) HandleCrawl(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	go crawler.Crawl()
	jsonResponse(w, map[string]string{"message": "crawl started"})
}
