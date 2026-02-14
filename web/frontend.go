package web

import (
	"io"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"
)

func ServeFrontend(w http.ResponseWriter, r *http.Request) {
	// Use fs.Sub to treat dist/v2 as the root
	box, err := fs.Sub(frontendFiles, "dist/v2")
	if err != nil {
		http.Error(w, "frontend not found", http.StatusNotFound)
		return
	}

	// Get the file path from the URL
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/")

	// If path is empty, it's index.html
	if path == "" {
		path = "index.html"
	}

	// Try to open the file
	f, err := box.Open(path)
	if err != nil {
		// If file not found, serve index.html for client-side routing
		if !strings.Contains(filepath.Base(path), ".") {
			f, err = box.Open("index.html")
			if err != nil {
				http.Error(w, "frontend not found", http.StatusNotFound)
				return
			}
			path = "index.html"
		} else {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
	}
	defer f.Close()

	d, err := f.Stat()
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	http.ServeContent(w, r, path, d.ModTime(), f.(io.ReadSeeker))
}
