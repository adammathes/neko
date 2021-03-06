package util

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"os"
)

var DEFAULT_CONFIG = "config.json"

func init() {
	var configFile = DEFAULT_CONFIG
	if len(os.Args) > 1  {
		configFile = os.Args[1]
	}
	config.Read(configFile)
	models.InitDB(config.Config.DBServer)
}
