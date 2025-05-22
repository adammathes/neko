package importer_test

import (
	"testing"
	"os"
	"log"
	"adammathes.com/neko/importer"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/config"
)

func TestImportOPML(t *testing.T) {
	// a. Initialize Configuration and Test Database
	config.Init("") // Load default configurations
	originalDBFile := config.Config.DBFile
	config.Config.DBFile = "test_opml_import.db"
	
	// Remove any pre-existing test database file to ensure a clean state
	os.Remove(config.Config.DBFile)

	models.InitDB() // Initialize the database, creating test_opml_import.db

	defer func() {
		// Attempt to remove the test database file.
		err := os.Remove(config.Config.DBFile)
		if err != nil {
			log.Printf("Error removing test database: %v", err)
		}
		// Restore the original DB file path in the config.
		config.Config.DBFile = originalDBFile
	}()

	// b. Create Sample OPML File
	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
    <head><title>Test Feeds</title></head>
    <body>
        <outline text="Feed 1 (Text)" title="Feed 1 Title" type="rss" xmlUrl="http://example.com/feed1.xml" htmlUrl="http://example.com/feed1.html"/>
        <outline text="Feed 2 (To be pre-populated)" title="Feed 2 Title" type="rss" xmlUrl="http://example.com/feed2.xml" htmlUrl="http://example.com/feed2.html"/>
        <outline title="Folder">
            <outline text="Feed 3 (In folder)" title="Feed 3 Title" type="rss" xmlUrl="http://example.com/feed3.xml" htmlUrl="http://example.com/feed3.html"/>
        </outline>
        <outline title="Feed 4 Title Only" type="rss" xmlUrl="http://example.com/feed4.xml" htmlUrl="http://example.com/feed4.html"/>
        <outline text="Feed 5 Text Only" type="rss" xmlUrl="http://example.com/feed5.xml" htmlUrl="http://example.com/feed5.html"/>
		<outline text="Feed 6 No Title or Text" type="rss" xmlUrl="http://example.com/feed6.xml" htmlUrl="http://example.com/feed6.html"/>
    </body>
</opml>`
	opmlFilePath := "test_opml.xml"
	err := os.WriteFile(opmlFilePath, []byte(opmlContent), 0644)
	if err != nil {
		t.Fatalf("Failed to write test OPML file: %v", err)
	}
	defer os.Remove(opmlFilePath)

	// c. Pre-populate a feed (for testing skip logic)
	preFeed := feed.Feed{Url: "http://example.com/feed2.xml", Title: "Pre-existing Feed 2", WebUrl: "http://example.com/feed2_pre.html"}
	if err := preFeed.Create(); err != nil {
		t.Fatalf("Failed to pre-populate feed: %v", err)
	}

	// d. Call importer.ImportOPML(opmlFilePath)
	importer.ImportOPML(opmlFilePath)

	// e. Verify Results
	verifyFeed := func(expectedURL, expectedTitle, expectedHTMLURL string) {
		t.Helper()
		f := feed.Feed{}
		// Use the GetByUrl method which is what the importer uses (via ByUrl)
		// to check for existence.
		dbFeed, err := f.ByUrl(expectedURL)
		if err != nil {
			t.Errorf("Failed to find feed %s: %v", expectedURL, err)
			return
		}
		if dbFeed == nil || dbFeed.Id == 0 {
			t.Errorf("Feed %s not found in database", expectedURL)
			return
		}
		if dbFeed.Title != expectedTitle {
			t.Errorf("For feed %s, expected title '%s', got '%s'", expectedURL, expectedTitle, dbFeed.Title)
		}
		if dbFeed.WebUrl != expectedHTMLURL {
			t.Errorf("For feed %s, expected HTML URL '%s', got '%s'", expectedURL, expectedHTMLURL, dbFeed.WebUrl)
		}
	}

	verifyFeed("http://example.com/feed1.xml", "Feed 1 Title", "http://example.com/feed1.html")
	verifyFeed("http://example.com/feed2.xml", "Pre-existing Feed 2", "http://example.com/feed2_pre.html") // Should not be overwritten
	verifyFeed("http://example.com/feed3.xml", "Feed 3 Title", "http://example.com/feed3.html")
	verifyFeed("http://example.com/feed4.xml", "Feed 4 Title Only", "http://example.com/feed4.html")
	verifyFeed("http://example.com/feed5.xml", "Feed 5 Text Only", "http://example.com/feed5.html")
	verifyFeed("http://example.com/feed6.xml", "Untitled Feed", "http://example.com/feed6.html")


	allFeeds, err := feed.All()
	if err != nil {
		t.Fatalf("Failed to query all feeds: %v", err)
	}
	// Expected: feed1, pre-existing feed2, feed3, feed4, feed5, feed6 (Untitled)
	expectedFeedCount := 6 
	if len(allFeeds) != expectedFeedCount {
		t.Errorf("Expected %d feeds in the database, got %d", expectedFeedCount, len(allFeeds))
		for _, f := range allFeeds {
			t.Logf("Found feed: %s (%s)", f.Title, f.Url)
		}
	}
}
