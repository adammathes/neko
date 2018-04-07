package main

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/vlog"
	"adammathes.com/neko/web"
	"encoding/xml"
	"fmt"
	flag "github.com/ogier/pflag"
)

func main() {
	var serve, update, verbose, printFeeds, opml bool
	var configFile, newFeed string

	flag.StringVarP(&configFile, "config", "c", "config.json", "`configuration` file")
	flag.BoolVarP(&update, "update", "u", false, "fetch feeds and store them in the database")
	flag.BoolVarP(&serve, "serve", "s", false, "run http server")
	flag.BoolVarP(&verbose, "verbose", "v", false, "verbose output")
	flag.BoolVarP(&printFeeds, "feeds", "f", false, "list all currently crawled feeds")
	flag.BoolVarP(&opml, "opml", "o", false, "export feed list as opml")
	flag.StringVarP(&newFeed, "add", "a", "", "add the feed at URL `http://example.com/rss.xml`")
	flag.Parse()

	// no command
	if !update && !serve && !printFeeds && !opml && newFeed == "" {
		flag.Usage()
		return
	}

	config.Read(configFile)
	models.InitDB(config.Config.DBServer)
	vlog.VERBOSE = verbose

	if update {
		crawler.Crawl()
	}
	if serve {
		vlog.Printf("starting web server at %s", config.Config.WebServer)
		web.Serve()
	}
	if newFeed != "" {
		feed.NewFeed(newFeed)
	}
	if printFeeds {
		feeds, err := feed.All()
		if err != nil {
			panic(err)
		}
		for _, f := range feeds {
			fmt.Printf("%s\n", f.Url)
		}
	}
	if opml {
		feeds, _ := feed.All()
		fmt.Printf(`<opml version="2.0"><head><title>neko feeds</title></head><body>`)
		fmt.Printf("\n")
		for _, f := range feeds {
			b, _ := xml.Marshal(f)
			fmt.Printf("%s\n", string(b))
		}
		fmt.Printf(`</body></opml>`)
	}
}
