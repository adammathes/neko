package util

import (
	"os"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
)

var DEFAULT_CONFIG = "config.json"

func init() {
	var configFile = DEFAULT_CONFIG
	if len(os.Args) > 1 {
		configFile = os.Args[1]
	}
	config.Init(configFile)
	models.InitDB()
}
