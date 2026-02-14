package importer

import (
	"strings"
	"testing"

	"path/filepath"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
)

func TestImportOPML(t *testing.T) {
	config.Config.DBFile = filepath.Join(t.TempDir(), "test.db")
	models.InitDB()
	defer models.DB.Close()

	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>testing import</title>
  </head>
  <body>
    <outline text="Tech">
      <outline type="rss" text="Ars Technica" title="Ars Technica" xmlUrl="https://arstechnica.com/feed/" htmlUrl="https://arstechnica.com"/>
      <outline type="rss" text="The Verge" title="The Verge" xmlUrl="https://www.theverge.com/rss/index.xml" htmlUrl="https://www.theverge.com"/>
    </outline>
    <outline type="rss" text="XKCD" title="XKCD" xmlUrl="https://xkcd.com/rss.xml" htmlUrl="https://xkcd.com"/>
  </body>
</opml>`

	err := ImportOPML(strings.NewReader(opmlContent))
	if err != nil {
		t.Fatalf("ImportOPML failed: %v", err)
	}

	feeds, err := feed.All()
	if err != nil {
		t.Fatal(err)
	}

	if len(feeds) != 3 {
		t.Errorf("Expected 3 feeds, got %d", len(feeds))
	}

	foundArs := false
	foundXKCD := false
	for _, f := range feeds {
		if f.Url == "https://arstechnica.com/feed/" {
			foundArs = true
			if f.Category != "Tech" {
				t.Errorf("Expected category 'Tech' for Ars, got %q", f.Category)
			}
		}
		if f.Url == "https://xkcd.com/rss.xml" {
			foundXKCD = true
			if f.Category != "" {
				t.Errorf("Expected empty category for XKCD, got %q", f.Category)
			}
		}
	}

	if !foundArs {
		t.Error("Did not find Ars Technica in imported feeds")
	}
	if !foundXKCD {
		t.Error("Did not find XKCD in imported feeds")
	}
}

func TestImportText(t *testing.T) {
	config.Config.DBFile = filepath.Join(t.TempDir(), "test.db")
	models.InitDB()
	defer models.DB.Close()

	textContent := `
https://example.com/feed1
# comment
https://example.com/feed2
  https://example.com/feed3  
`

	err := ImportText(strings.NewReader(textContent))
	if err != nil {
		t.Fatalf("ImportText failed: %v", err)
	}

	feeds, err := feed.All()
	if err != nil {
		t.Fatal(err)
	}

	if len(feeds) != 3 {
		t.Errorf("Expected 3 feeds, got %d", len(feeds))
	}
}
