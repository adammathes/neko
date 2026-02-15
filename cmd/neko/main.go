package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"adammathes.com/neko/config"
	"adammathes.com/neko/internal/crawler"
	"adammathes.com/neko/internal/exporter"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"

	"adammathes.com/neko/internal/safehttp"
	"adammathes.com/neko/internal/vlog"
	"adammathes.com/neko/web"
)

var Version, Build string

func main() {
	if err := Run(os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}

func Run(args []string) error {
	var help, update, verbose, proxyImages, secureCookies bool
	var configFile, dbfile, newFeed, export, password string
	var port, minutes int
	var purge int
	var purgeUnread bool

	f := flag.NewFlagSet("neko", flag.ContinueOnError)

	// config file
	f.StringVar(&configFile, "config", "", "read configuration from file")
	f.StringVar(&configFile, "c", "", "read configuration from file (short)")

	// commands
	f.BoolVar(&help, "help", false, "display help")
	f.BoolVar(&help, "h", false, "display help (short)")

	f.BoolVar(&update, "update", false, "fetch feeds and store new items")
	f.BoolVar(&update, "u", false, "fetch feeds and store new items (short)")

	f.StringVar(&newFeed, "add", "", "add the feed at URL")
	f.StringVar(&newFeed, "a", "", "add the feed at URL (short)")

	f.StringVar(&export, "export", "", "export feed: text, opml, html, json")
	f.StringVar(&export, "x", "", "export feed (short)")

	f.IntVar(&purge, "purge", 0, "purge read items older than N days")
	f.BoolVar(&purgeUnread, "purge-unread", false, "when purging, also include unread items")

	// options
	f.StringVar(&dbfile, "database", "", "sqlite database file")
	f.StringVar(&dbfile, "d", "", "sqlite database file (short)")

	f.IntVar(&port, "http", 0, "HTTP port to serve on")
	f.IntVar(&port, "s", 0, "HTTP port to serve on (short)")

	f.IntVar(&minutes, "minutes", -1, "minutes between crawling feeds")
	f.IntVar(&minutes, "m", -1, "minutes between crawling feeds (short)")

	f.BoolVar(&proxyImages, "imageproxy", false, "rewrite and proxy all image requests")
	f.BoolVar(&proxyImages, "i", false, "rewrite and proxy all image requests (short)")

	f.BoolVar(&secureCookies, "secure-cookies", false, "set Secure flag on cookies (requires HTTPS)")

	f.BoolVar(&verbose, "verbose", false, "verbose output")
	f.BoolVar(&verbose, "v", false, "verbose output (short)")

	f.StringVar(&password, "password", "", "password for web interface")
	f.StringVar(&password, "p", "", "password for web interface (short)")

	var allowLocal bool
	f.BoolVar(&allowLocal, "allow-local", false, "allow connections to local network addresses")

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

	if allowLocal {
		safehttp.AllowLocal = true
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

	if minutes != -1 {
		config.Config.CrawlMinutes = minutes
	}

	if proxyImages {
		config.Config.ProxyImages = proxyImages
	}

	if secureCookies {
		config.Config.SecureCookies = secureCookies
	}

	models.InitDB()

	if purge > 0 {
		vlog.Printf("purging items older than %d days (include unread: %t)\n", purge, purgeUnread)
		affected, err := item.Purge(purge, purgeUnread)
		if err != nil {
			return err
		}
		vlog.Printf("purged %d items\n", affected)
		return nil
	}

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
	web.Serve(&config.Config)
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
