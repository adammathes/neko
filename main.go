package main

import (
	"fmt"
	"github.com/adammathes/neko/config"
	"github.com/adammathes/neko/crawler"
	"github.com/adammathes/neko/importer"
	"github.com/adammathes/neko/models"
	"github.com/adammathes/neko/models/feed"
	"github.com/adammathes/neko/web"
	"log"
	"os"
)

func main() {
	// TODO: change this
	config.Read("./config.json")

	models.InitDB(config.Config.DBServer)
	if len(os.Args) < 2 {
		fmt.Printf("usage: neko [web|addfeed|crawl]\n")
		fmt.Printf("addfeed <url> -- add a new feed from <url>\n")
		return
	}
	cmd := os.Args[1]
	switch cmd {
	case "web":
		log.Printf("starting web server at %s", config.Config.WebServer)
		web.Serve()
	case "addfeed":
		addFeed()
	case "crawl":
		crawl()
	case "import":
		importLegacy()
	default:
		panic("not a valid command")
	}
}

func addFeed() {
	if len(os.Args) < 2 {
		log.Fatal("need a valid url")
	}
	url := os.Args[2]
	feed.NewFeed(url)
}

func importLegacy() {
	json_file := os.Args[2]
	log.Printf("importing json file from: %s", json_file)
	importer.ImportJSON(json_file)
}

func crawl() {
	crawler.Crawl()
}
