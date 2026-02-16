package web

import (
	"io"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"
)

func ServeFrontend(distDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Use fs.Sub to treat distDir as the root
		box, err := fs.Sub(frontendFiles, distDir)
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
			// but only if it looks like a route (no extension)
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
		defer func() { _ = f.Close() }()

		d, err := f.Stat()
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		http.ServeContent(w, r, path, d.ModTime(), f.(io.ReadSeeker))
	}
}
