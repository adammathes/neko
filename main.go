package main

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"
	"adammathes.com/neko/exporter"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/vlog"
	"adammathes.com/neko/web"
	"fmt"
	flag "github.com/ogier/pflag"
	"time"
)

var Version, Build string

func main() {
	var help, update, verbose, proxyImages bool
	var configFile, dbfile, newFeed, export, password string
	var port, minutes int

	// config file
	flag.StringVarP(&configFile, "config", "c", "", "read configuration from file")

	// commands -- no command runs the web server
	flag.BoolVarP(&help, "help", "h", false, "print usage information")
	flag.BoolVarP(&update, "update", "u", false, "fetch feeds and store new items")
	flag.StringVarP(&newFeed, "add", "a", "", "add the feed at URL `http://example.com/rss.xml`")
	flag.StringVarP(&export, "export", "x", "", "export feed. format required: text, opml, html, or json")

	// options -- defaults are set in config/main.go and overridden by cmd line
	flag.StringVarP(&dbfile, "database", "d", "", "sqlite database file")
	flag.IntVarP(&port, "http", "s", 0, "HTTP port to serve on")
	flag.IntVarP(&minutes, "minutes", "m", 0, "minutes between crawling feeds")
	flag.BoolVarP(&proxyImages, "imageproxy", "i", false, "rewrite and proxy all image requests for privacy (experimental)")
	flag.BoolVarP(&verbose, "verbose", "v", false, "verbose output")

	// passwords on command line are bad, you should use the config file
	flag.StringVarP(&password, "password", "p", "", "password to access web interface")
	flag.Parse()

	if help {
		fmt.Printf("neko v%s | build %s\n", Version, Build)
		flag.Usage()
		return
	}
	// reads config if present and sets defaults
	config.Init(configFile)

	// override config file with flags if present
	vlog.VERBOSE = verbose
	if dbfile != "" {
		config.Config.DBFile = dbfile
	}

	if port != 0 {
		config.Config.Port = port
	}

	if password != "" {
		config.Config.DigestPassword = password
	}

	if minutes != 0 {
		config.Config.CrawlMinutes = minutes
	}

	if proxyImages != false {
		config.Config.ProxyImages = proxyImages
	}

	models.InitDB()

	if update {
		vlog.Printf("starting crawl\n")
		crawler.Crawl()
		return
	}
	if newFeed != "" {
		vlog.Printf("creating new feed\n")
		feed.NewFeed(newFeed)
		return
	}
	if export != "" {
		vlog.Printf("exporting feeds in format %s\n", export)
		fmt.Printf("%s", exporter.ExportFeeds(export))
		return
	}

	go backgroundCrawl(config.Config.CrawlMinutes)
	vlog.Printf("starting web server at 127.0.0.1:%d\n",
		config.Config.Port)
	web.Serve()
}

func backgroundCrawl(minutes int) {
	if minutes < 1 {
		return
	}
	vlog.Printf("starting background crawl every %d minutes\n", minutes)
	for {
		time.Sleep(time.Minute * time.Duration(minutes))
		crawler.Crawl()
	}
}
