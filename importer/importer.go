package importer

import (
	//	"bufio"
	"encoding/json"
	//"fmt"
	"io"
	"log"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"os"
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

func ImportJSON(filename string) {

	f, err := os.Open(filename)
	if err != nil {
		log.Fatal(err)
	}

	dec := json.NewDecoder(f)
	for {
		var ii IItem
		if err := dec.Decode(&ii); err == io.EOF {
			break
		} else if err != nil {
			log.Println(err)
		} else {
			InsertIItem(&ii)
		}
	}
}

func InsertIItem(ii *IItem) {
	var f feed.Feed

	if ii.Feed == nil {
		return
	}
	err := f.ByUrl(ii.Feed.Url)
	if err != nil {
		f.Url = ii.Feed.Url
		f.Title = ii.Feed.Title
		f.Create()
	}

	var i item.Item
	i.FeedId = f.Id
	i.Title = ii.Title
	i.Url = ii.Url
	i.Description = ii.Description

	i.PublishDate = ii.Date.Date

	err = i.Create()
	log.Printf("inserted %s\n", i.Url)
	if err != nil {
		log.Println(err)
	}
}
