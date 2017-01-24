package crawler

import (
	"log"
	"neko/models/feed"
	"neko/models/item"
	"net/http"
	"time"
	"github.com/SlyMarbo/rss"
)


func Crawl() {

	ch := make(chan string)

	feeds,err := feed.All()
	if err != nil {
		log.Fatal(err)
	}
	for _, f := range feeds {
		log.Printf("crawling %s", f.Url)
		go CrawlFeed(f, ch)
	}

	for i := 0; i < len(feeds); i++ {
		log.Println(<-ch)
	}
}

/*
 TODO: sanitize input on crawl
*/
func CrawlFeed(f *feed.Feed, ch chan<- string) {
	c := &http.Client{
		// give up after 5 seconds
		Timeout: 5 * time.Second,
	}

	feed, err := rss.FetchByClient(f.Url, c)
	if err != nil {
		log.Print(err)
		ch <- "failed to fetch and parse for " + f.Url
		return
	}

	f.Title = feed.Title
	f.Update()

	for _, i := range feed.Items {
		log.Printf("storing item: %s", i.Title)
		var item item.Item
		item.Title = i.Title
		item.Url = i.Link
		item.Description = i.Content
		if item.Description == "" {
			item.Description = i.Summary
		}
		item.FeedId = f.Id
		item.Create()
	}
	ch <- "successfully crawled " + f.Url
}
