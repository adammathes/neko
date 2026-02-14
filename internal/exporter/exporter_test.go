package exporter

import (
	"encoding/json"
	"strings"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
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

func seedFeeds(t *testing.T) {
	t.Helper()
	_, err := models.DB.Exec("INSERT INTO feed(url, web_url, title, category) VALUES(?, ?, ?, ?)",
		"https://a.com/feed", "https://a.com", "Alpha Feed", "tech")
	if err != nil {
		t.Fatal(err)
	}
	_, err = models.DB.Exec("INSERT INTO feed(url, web_url, title, category) VALUES(?, ?, ?, ?)",
		"https://b.com/feed", "https://b.com", "Beta Feed", "news")
	if err != nil {
		t.Fatal(err)
	}
}

func TestExportText(t *testing.T) {
	setupTestDB(t)
	seedFeeds(t)

	result := ExportFeeds("text")
	if !strings.Contains(result, "https://a.com/feed") {
		t.Error("text export should contain feed URL a")
	}
	if !strings.Contains(result, "https://b.com/feed") {
		t.Error("text export should contain feed URL b")
	}
}

func TestExportJSON(t *testing.T) {
	setupTestDB(t)
	seedFeeds(t)

	result := ExportFeeds("json")
	var feeds []interface{}
	err := json.Unmarshal([]byte(result), &feeds)
	if err != nil {
		t.Fatalf("JSON export should be valid JSON: %v", err)
	}
	if len(feeds) != 2 {
		t.Errorf("JSON export should contain 2 feeds, got %d", len(feeds))
	}
}

func TestExportOPML(t *testing.T) {
	setupTestDB(t)
	seedFeeds(t)

	result := ExportFeeds("opml")
	if !strings.Contains(result, "<opml") {
		t.Error("OPML export should contain opml tag")
	}
	if !strings.Contains(result, "Alpha Feed") || !strings.Contains(result, "Beta Feed") {
		t.Error("OPML export should contain feed titles")
	}
	if !strings.Contains(result, "</opml>") {
		t.Error("OPML export should close opml tag")
	}
}

func TestExportHTML(t *testing.T) {
	setupTestDB(t)
	seedFeeds(t)

	result := ExportFeeds("html")
	if !strings.Contains(result, "<html>") {
		t.Error("HTML export should contain html tag")
	}
	if !strings.Contains(result, "Alpha Feed") {
		t.Error("HTML export should contain feed title")
	}
}

func TestExportUnknownFormat(t *testing.T) {
	setupTestDB(t)
	seedFeeds(t)

	result := ExportFeeds("unknown")
	if result != "" {
		t.Errorf("Unknown format should return empty string, got %q", result)
	}
}

func TestExportEmpty(t *testing.T) {
	setupTestDB(t)

	result := ExportFeeds("text")
	if result != "" {
		t.Errorf("Export with no feeds should be empty, got %q", result)
	}
}
