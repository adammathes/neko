package importer

import (
	"log"
	"os"

	"adammathes.com/neko/models/feed"
	"github.com/gilliek/go-opml/opml"
)

// ImportOPML imports feeds from an OPML file.
func ImportOPML(filename string) {
	log.Printf("Importing OPML file: %s", filename)

	// Step 2: Open the file specified by filename.
	// Note: opml.NewOPMLFromFile handles file opening internally.
	// So, we directly use it.

	// Step 3: Parse the OPML data from the opened file.
	opmlDoc, err := opml.NewOPMLFromFile(filename)
	if err != nil {
		log.Println("Error parsing OPML file:", err)
		return
	}

	if opmlDoc.Body == nil {
		log.Println("OPML body is nil, no outlines to process.")
		return
	}

	// Step 4: Iterate through opmlDoc.Body.Outlines recursively.
	processOutlines(opmlDoc.Body.Outlines)
}

// processOutlines is a helper function to recursively traverse OPML outlines.
func processOutlines(outlines []opml.Outline) {
	for _, outline := range outlines {
		// Step 5a: Check if outline.XMLURL is not empty.
		if outline.XMLURL == "" {
			log.Printf("Skipping outline with empty XMLURL (likely a category): %s", getTitle(outline))
			// Recursively process children if any, even if it's a category
			if len(outline.Outlines) > 0 {
				processOutlines(outline.Outlines)
			}
			continue
		}

		// Step 5b: Create a feed.Feed object.
		f := feed.Feed{}

		// Step 5c: Set f.Url from outline.XMLURL.
		f.Url = outline.XMLURL

		// Step 5d: Set f.Title from outline.Title or outline.Text.
		if outline.Title != "" {
			f.Title = outline.Title
		} else if outline.Text != "" {
			f.Title = outline.Text
		} else {
			// Fallback if both Title and Text are empty
			f.Title = "Untitled Feed"
			log.Printf("Feed with URL %s has no Title or Text, using default 'Untitled Feed'", f.Url)
		}
		
		// Step 5e: Set f.WebUrl from outline.HTMLURL.
		f.WebUrl = outline.HTMLURL // HTMLURL can be empty, which is fine.

		// Step 5f: Check if a feed with f.Url already exists.
		existingFeed, err := f.ByUrl(f.Url)
		if err != nil {
			// Step 5g: If the feed does not exist (error is not nil), then call f.Create().
			// Assuming error means not found. A more specific error check might be needed
			// depending on the actual behavior of f.ByUrl (e.g., if it returns a specific error type for "not found").
			log.Printf("Feed with URL %s not found, creating new entry: %s", f.Url, f.Title)
			if createErr := f.Create(); createErr != nil {
				log.Println("Error creating feed:", createErr)
			} else {
				log.Printf("Successfully added feed: %s (%s)", f.Title, f.Url)
			}
		} else if existingFeed != nil && existingFeed.Id > 0 { // Check if a valid feed was returned
			// Step 5h: If the feed already exists, log that it's being skipped.
			log.Printf("Feed already exists, skipping: %s (%s)", existingFeed.Title, existingFeed.Url)
		} else {
			// This case could occur if f.ByUrl returns (nil, nil) or an error that isn't truly "not found"
			// but also doesn't return an existing feed. Treat as "not found" for robustness.
			log.Printf("Feed with URL %s not found (or ambiguous check), creating new entry: %s", f.Url, f.Title)
			if createErr := f.Create(); createErr != nil {
				log.Println("Error creating feed:", createErr)
			} else {
				log.Printf("Successfully added feed: %s (%s)", f.Title, f.Url)
			}
		}

		// Recursively process children if any (feeds can be nested within other feeds in OPML)
		if len(outline.Outlines) > 0 {
			processOutlines(outline.Outlines)
		}
	}
}

// getTitle is a helper to get a display title for an outline,
// preferring Title, then Text. Used for logging categories.
func getTitle(outline opml.Outline) string {
	if outline.Title != "" {
		return outline.Title
	}
	if outline.Text != "" {
		return outline.Text
	}
	return "[No Title/Text]"
}
