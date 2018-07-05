package crawler

import (
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"adammathes.com/neko/vlog"
	"github.com/mmcdole/gofeed"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

const MAX_CRAWLERS = 5

func Crawl() {
	crawlJobs := make(chan *feed.Feed, 100)
	results := make(chan string, 100)

	feeds, err := feed.All()
	if err != nil {
		log.Fatal(err)
	}

	for i := 0; i < MAX_CRAWLERS; i++ {
		vlog.Printf("spawning crawl worker %d\n", i)
		go CrawlWorker(crawlJobs, results)
	}

	for _, f := range feeds {
		vlog.Printf("sending crawl job %s\n", f.Url)
		crawlJobs <- f
	}
	close(crawlJobs)

	for i := 0; i < len(feeds); i++ {
		vlog.Println(<-results)
	}
}

func CrawlWorker(feeds <-chan *feed.Feed, results chan<- string) {

	for f := range feeds {
		vlog.Printf("crawl job received %s\n", f.Url)
		CrawlFeed(f, results)
		vlog.Printf("crawl job finished %s\n", f.Url)
	}
}

/*
Simple HTTP Get fnx with custom user agent header
*/
func GetFeedContent(feedURL string) string {

	// introduce delays for testing
	//	n := time.Duration(rand.Int63n(3))
	//	time.Sleep(n * time.Second)

	c := &http.Client{
		// give up after 5 seconds
		Timeout: 5 * time.Second,
	}

	request, err := http.NewRequest("GET", feedURL, nil)
	if err != nil {
		log.Fatalln(err)
	}

	userAgent := "neko RSS Crawler +https://github.com/adammathes/neko"
	request.Header.Set("User-Agent", userAgent)
	resp, err := c.Do(request)

	if err != nil {
		return ""
	}

	if resp != nil {
		defer func() {
			ce := resp.Body.Close()
			if ce != nil {
				err = ce
			}
		}()
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return ""
	}

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return ""
	}
	return string(bodyBytes)
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

	content := GetFeedContent(f.Url)
	feed, err := fp.ParseString(content)
	if err != nil {
		vlog.Println(err)
		ch <- "failed parse for " + f.Url + "\n"
		return
	}

	f.Title = feed.Title
	f.WebUrl = feed.Link
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
