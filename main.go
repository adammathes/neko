package main

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/vlog"
	"adammathes.com/neko/web"
	"fmt"
	flag "github.com/ogier/pflag"
)

func main() {
	var serve, update, verbose, printFeeds bool
	var configFile, newFeed string

	flag.StringVarP(&configFile, "config", "c", "config.json", "`configuration` file")
	flag.BoolVarP(&update, "update", "u", false, "fetch feeds and store them in the database")
	flag.BoolVarP(&serve, "serve", "s", false, "run http server")
	flag.BoolVarP(&verbose, "verbose", "v", false, "verbose output")
	flag.BoolVarP(&printFeeds, "feeds", "f", false, "list all currently crawled feeds")
	flag.StringVarP(&newFeed, "add", "a", "", "add the feed at URL `http://example.com/rss.xml`")
	flag.Parse()

	// no command
	if !update && !serve && !printFeeds && newFeed == "" {
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
}
