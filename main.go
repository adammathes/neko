package main

import (
	"flag"
	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"	
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/web"
	"adammathes.com/neko/vlog"
	"fmt"
)

func main() {
	var serve, update, verbose, printFeeds bool
	var configFile, newFeed string
	
	flag.StringVar(&configFile, "c", "config.json", "`configuration` file")
	flag.BoolVar(&update, "update", false, "update items by fetching feeds")
	flag.BoolVar(&serve, "serve", false, "run http server")
	flag.BoolVar(&verbose, "verbose", false, "verbose output")
	flag.BoolVar(&printFeeds, "feeds", false, "list all currently crawled feeds")
	flag.StringVar(&newFeed, "add", "", "add feed `http://example.com/rss.xml`")
	flag.Parse()

	// no command
	if !update && !serve && !printFeeds && newFeed == ""{
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
		feeds,err := feed.All()
		if err != nil {
			panic(err)
		}
		for _,f := range(feeds) {
			fmt.Printf("%s\n", f.Url)
		}
	}
}
