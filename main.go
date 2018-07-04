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
	var help, update, verbose, proxyImages bool
	var dbfile, newFeed, export, password string
	var port int

	// commands // no command tries to run the web server
	flag.BoolVarP(&help, "help", "h", false, "print usage information")
	flag.BoolVarP(&update, "update", "u", false, "fetch feeds and store new items")
	flag.StringVarP(&newFeed, "add", "a", "", "add the feed at URL `http://example.com/rss.xml`")
	flag.StringVarP(&export, "export", "x", "", "export feed. format required: text, json or opml")

	// options with sensible defaults
	flag.StringVarP(&dbfile, "db", "d", "neko.db", "sqlite database file")
	flag.IntVarP(&port, "http", "s", 4994, "HTTP port to serve on")
	flag.BoolVarP(&proxyImages, "imageproxy", "i", false, "rewrite and proxy all image requests for privacy (experimental)")

	// verbose output by default unless you know what you're doing
	// this is probably wrong but keeping it this way for debugging
	flag.BoolVarP(&verbose, "verbose", "v", true, "verbose output")

	// passwords on command line are bad
	flag.StringVarP(&password, "password", "p", "", "password to access web interface")

	flag.Parse()

	if help {
		flag.Usage()
		return
	}

	vlog.VERBOSE = verbose
	config.Config.DBFile = dbfile
	config.Config.Port = port
	config.Config.ProxyImages = proxyImages
	config.Config.DigestPassword = password

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
		vlog.Printf("feed export\n")
		exporter.ExportFeeds(export)
		return
	}

	if password == "" {
		panic("Please specify an access password\n")
	}
	vlog.Printf("starting web server at 127.0.0.1:%d\n",
		config.Config.Port)
	web.Serve()

}
