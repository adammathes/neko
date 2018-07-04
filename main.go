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

	// dbfile
	// port
	// proxyImages
	// username
	// password

	flag.BoolVarP(&help, "help", "h", false, "print usage information")

	flag.BoolVarP(&update, "update", "u", false, "fetch feeds and store new items")
	flag.StringVarP(&newFeed, "add", "a", "", "add the feed at URL `http://example.com/rss.xml`")
	flag.StringVarP(&export, "export", "x", "", "export feed. format required: text, json or opml")

	//	flag.BoolVarP(&serve, "serve", "s", false, "run neko app by starting HTTP server")

	flag.StringVarP(&dbfile, "db", "d", "neko.db", "sqlite database file")
	flag.StringVarP(&dbfile, "password", "p", "", "password to access web interface")

	flag.IntVarP(&port, "http", "s", 4994, "HTTP port to serve on")
	flag.BoolVarP(&verbose, "verbose", "v", true, "verbose output")
	flag.BoolVarP(&proxyImages, "imageproxy", "i", false, "rewrite and proxy all image requests for privacy (experimental)")

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

	vlog.Printf("starting web server at 127.0.0.1:%d\n",
		config.Config.Port)
	web.Serve()

}
