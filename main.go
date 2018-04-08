package main

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"
	"adammathes.com/neko/exporter"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/vlog"
	"adammathes.com/neko/web"
	flag "github.com/ogier/pflag"
)

func main() {
	var serve, update, verbose bool
	var configFile, newFeed, export string

	flag.StringVarP(&configFile, "config", "c", "config.json", "`configuration` file")
	flag.BoolVarP(&update, "update", "u", false, "fetch feeds and store them in the database")
	flag.BoolVarP(&serve, "serve", "s", false, "run http server")
	flag.BoolVarP(&verbose, "verbose", "v", false, "verbose output")
	flag.StringVarP(&newFeed, "add", "a", "", "add the feed at URL `http://example.com/rss.xml`")
	flag.StringVarP(&export, "export", "x", "", "export feeds as `text`, json or opml")
	flag.Parse()

	// no command
	if !update && !serve && newFeed == "" && export == "" {
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
	if export != "" {
		exporter.ExportFeeds(export)
	}
}
