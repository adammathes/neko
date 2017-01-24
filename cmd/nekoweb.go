package main

import (
	"neko/config"
	"neko/models"
	"neko/web"
	"os"
)

func main() {
	config.Read(os.Args[1])
	models.InitDB(config.Config.DBServer)
	web.Serve()
}
