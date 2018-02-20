package crawler

import (
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"adammathes.com/neko/vlog"
	"github.com/mmcdole/gofeed"
	"log"
	"net/http"
	"time"
)

func Crawl() {

	ch := make(chan string)

	feeds, err := feed.All()
	if err != nil {
		log.Fatal(err)
	}
	for _, f := range feeds {
		vlog.Printf("crawling %s\n", f.Url)
		go CrawlFeed(f, ch)
	}

	for i := 0; i < len(feeds); i++ {
		vlog.Println(<-ch)
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

	fp := gofeed.NewParser()
	fp.Client = c

	feed, err := fp.ParseURL(f.Url)
	if err != nil {
		vlog.Println(err)
		ch <- "failed to fetch and parse for " + f.Url + "\n"
		return
	}

	f.Title = feed.Title
	f.Update()

	for _, i := range feed.Items {
		vlog.Printf("storing item: %s", i.Link)
		var item item.Item
		item.Title = i.Title
		item.Url = i.Link

		item.Description = i.Description
		if len(i.Content) > len(item.Description) {
			item.Description = i.Content
		}

		// a lot of RSS2.0 generated by wordpress and others
		// uses <content:encoded>
		e, ok := i.Extensions["content"]["encoded"]
		var encoded = ""
		if ok {
			encoded = e[0].Value
		}
		if len(encoded) > len(item.Description) {
			item.Description = encoded
		}

		if i.PublishedParsed != nil {
			item.PublishDate = i.PublishedParsed.Format("2006-01-02 15:04:05")
		} else {
			item.PublishDate = time.Now().Format("2006-01-02 15:04:05")
		}

		item.FeedId = f.Id
		err := item.Create()
		if err != nil {
			vlog.Println(err)
		}
		// else {
		//	item.GetFullContent()
		//}
	}
	ch <- "successfully crawled " + f.Url + "\n"
}
