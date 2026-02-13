package web

import (
	"net/http"
	"path/filepath"
	"strings"

	rice "github.com/GeertJohan/go.rice"
)

func ServeFrontend(w http.ResponseWriter, r *http.Request) {
	// The box is at "web", so we look for "../frontend/dist" relative to it
	// rice will find this box by the string literal
	box := rice.MustFindBox("../frontend/dist")

	// Get the file path from the URL
	path := r.URL.Path
	// rice box paths shouldn't start with /
	path = strings.TrimPrefix(path, "/")

	// If path is empty, it's index.html
	if path == "" {
		path = "index.html"
	}

	// Try to open the file
	f, err := box.Open(path)
	if err != nil {
		// If file not found, serve index.html for client-side routing
		// But only if it's not looking for a specific static asset (like .js, .css)
		// Simple heuristic: if it has an extension, it's probably an asset
		if !strings.Contains(filepath.Base(path), ".") {
			f, err = box.Open("index.html")
			if err != nil {
				http.Error(w, "frontend not found", http.StatusNotFound)
				return
			}
			// Important: update path so ServeContent sets correct Content-Type
			path = "index.html"
		} else {
			// It might be a real 404 for an asset
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

	http.ServeContent(w, r, path, d.ModTime(), f)
}
