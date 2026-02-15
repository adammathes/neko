package importer

import (
	"bufio"
	"encoding/json"
	"encoding/xml"
	"errors"
	"io"
	"log"
	"os"
	"strings"

	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
)

type IItem struct {
	Title       string `json:"title"`
	Url         string `json:"url"`
	Description string `json:"description"`
	ReadState   bool   `json:"read"`
	Starred     bool   `json:"starred"`
	Date        *IDate `json:"date"`
	Feed        *IFeed `json:"feed"`
}

type IFeed struct {
	Url    string `json:"url"`
	Title  string `json:"title"`
	WebUrl string `json:"web_url"`
}

type IDate struct {
	Date string `json:"$date"`
}

type OPML struct {
	XMLName xml.Name `xml:"opml"`
	Version string   `xml:"version,attr"`
	Head    struct {
		Title string `xml:"title"`
	} `xml:"head"`
	Body struct {
		Outlines []Outline `xml:"outline"`
	} `xml:"body"`
}

type Outline struct {
	Text     string    `xml:"text,attr"`
	Title    string    `xml:"title,attr"`
	Type     string    `xml:"type,attr"`
	XMLURL   string    `xml:"xmlUrl,attr"`
	HTMLURL  string    `xml:"htmlUrl,attr"`
	Category string    `xml:"category,attr"`
	Outlines []Outline `xml:"outline"`
}

func ImportFeeds(format string, r io.Reader) error {
	switch format {
	case "opml":
		return ImportOPML(r)
	case "text":
		return ImportText(r)
	case "json":
		return ImportJSONReader(r)
	default:
		return errors.New("unsupported import format")
	}
}

func ImportOPML(r io.Reader) error {
	var o OPML
	if err := xml.NewDecoder(r).Decode(&o); err != nil {
		return err
	}

	var walk func([]Outline, string)
	walk = func(outlines []Outline, cat string) {
		for _, out := range outlines {
			if out.Type == "rss" || out.XMLURL != "" {
				f := &feed.Feed{
					Url:      out.XMLURL,
					Title:    out.Title,
					WebUrl:   out.HTMLURL,
					Category: cat,
				}
				if f.Title == "" {
					f.Title = out.Text
				}
				if f.Category == "" {
					f.Category = out.Category
				}
				err := f.Create()
				if err != nil {
					log.Printf("error importing %s: %v", f.Url, err)
				} else {
					log.Printf("imported %s", f.Url)
				}
			}
			if len(out.Outlines) > 0 {
				newCat := cat
				if out.XMLURL == "" && out.Text != "" {
					newCat = out.Text
				}
				walk(out.Outlines, newCat)
			}
		}
	}
	walk(o.Body.Outlines, "")
	return nil
}

func ImportText(r io.Reader) error {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		err := feed.NewFeed(line)
		if err != nil {
			log.Printf("error importing %s: %v", line, err)
		} else {
			log.Printf("imported %s", line)
		}
	}
	return scanner.Err()
}

func ImportJSONReader(r io.Reader) error {
	dec := json.NewDecoder(r)
	for {
		var ii IItem
		if err := dec.Decode(&ii); err == io.EOF {
			break
		} else if err != nil {
			return err
		} else {
			err := InsertIItem(&ii)
			if err != nil {
				log.Println(err)
			}
		}
	}
	return nil
}

func ImportJSON(filename string) error {
	f, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()
	return ImportJSONReader(f)
}

func InsertIItem(ii *IItem) error {
	var f feed.Feed

	if ii.Feed == nil {
		return nil
	}
	err := f.ByUrl(ii.Feed.Url)
	if err != nil {
		f.Url = ii.Feed.Url
		f.Title = ii.Feed.Title
		f.WebUrl = ii.Feed.WebUrl
		err = f.Create()
		if err != nil {
			return err
		}
	}

	var i item.Item
	i.FeedId = f.Id
	i.Title = ii.Title
	i.Url = ii.Url
	i.Description = ii.Description

	if ii.Date != nil {
		i.PublishDate = ii.Date.Date
	}

	err = i.Create()
	return err
}
