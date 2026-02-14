package main

import (
	"fmt"
	"os"
	"time"

	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"
	"adammathes.com/neko/exporter"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"

	"adammathes.com/neko/vlog"
	"adammathes.com/neko/web"
	flag "github.com/ogier/pflag"
)

var Version, Build string

func main() {
	if err := Run(os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}

func Run(args []string) error {
	var help, update, verbose, proxyImages bool
	var configFile, dbfile, newFeed, export, password string
	var port, minutes int

	f := flag.NewFlagSet("neko", flag.ContinueOnError)

	// config file
	f.StringVarP(&configFile, "config", "c", "", "read configuration from file")

	// commands -- no command runs the web server
	f.BoolVarP(&help, "help", "h", false, "print usage information")
	f.BoolVarP(&update, "update", "u", false, "fetch feeds and store new items")
	f.StringVarP(&newFeed, "add", "a", "", "add the feed at URL `http://example.com/rss.xml`")
	f.StringVarP(&export, "export", "x", "", "export feed. format required: text, opml, html, or json")

	// options -- defaults are set in config/main.go and overridden by cmd line
	f.StringVarP(&dbfile, "database", "d", "", "sqlite database file")
	f.IntVarP(&port, "http", "s", 0, "HTTP port to serve on")
	f.IntVarP(&minutes, "minutes", "m", 0, "minutes between crawling feeds")
	f.BoolVarP(&proxyImages, "imageproxy", "i", false, "rewrite and proxy all image requests for privacy (experimental)")

	f.BoolVarP(&verbose, "verbose", "v", false, "verbose output")

	// passwords on command line are bad, you should use the config file
	f.StringVarP(&password, "password", "p", "", "password to access web interface")

	f.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage of %s:\n", os.Args[0])
		f.PrintDefaults()
	}

	if err := f.Parse(args); err != nil {
		return err
	}

	if help {
		fmt.Printf("neko v%s | build %s\n", Version, Build)
		f.Usage()
		return nil
	}
	// reads config if present and sets defaults
	if err := config.Init(configFile); err != nil {
		return fmt.Errorf("config error: %v", err)
	}

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
		return nil
	}
	if newFeed != "" {
		vlog.Printf("creating new feed\n")
		feed.NewFeed(newFeed)
		return nil
	}
	if export != "" {
		vlog.Printf("exporting feeds in format %s\n", export)
		fmt.Printf("%s", exporter.ExportFeeds(export))
		return nil
	}

	// For testing, we might want to avoid starting a web server
	if config.Config.Port == -1 {
		return nil
	}

	go backgroundCrawl(config.Config.CrawlMinutes)
	vlog.Printf("starting web server at 127.0.0.1:%d\n",
		config.Config.Port)
	web.Serve()
	return nil
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
