package main

import (
	"neko/config"
	"neko/crawler"
	"neko/models"
	"os"
)

func main() {
	config.Read(os.Args[1])
	models.InitDB(config.Config.DBServer)
	crawler.Crawl()
}
