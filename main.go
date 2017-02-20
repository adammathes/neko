package main

import (
	"flag"
	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"	
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/web"
	"log"
)

func main() {
	var serve, update bool
	var configFile, newFeed string
	
	flag.StringVar(&configFile, "c", "config.json", "`configuration` file")
	flag.BoolVar(&update, "update", false, "update items by fetching feeds")
	flag.BoolVar(&serve, "serve", false, "run http server")

	flag.StringVar(&newFeed, "add", "", "add feed `http://example.com/rss.xml`")
	flag.Parse()

	if !update && !serve && newFeed == ""{
		flag.Usage()
		return 
	}

	config.Read(configFile)
	models.InitDB(config.Config.DBServer)

	if newFeed != "" {
		feed.NewFeed(newFeed)
	}
	if serve {
		log.Printf("starting web server at %s", config.Config.WebServer)
		web.Serve()
	}
	if update {
		crawler.Crawl()
	}	
}
