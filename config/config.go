package config

import (
	"encoding/json"
	"io/ioutil"
	"log"
)

type Settings struct {
	DBServer       string `json:"db"`
	WebServer      string `json:"web"`
	Username       string `json:"username"`
	DigestPassword string `json:"password"`
	StaticDir      string `json:"static_dir"`
}

var Config Settings

func Read(filename string) {
	file, e := ioutil.ReadFile(filename)
	if e != nil {
		log.Fatal("Can not read config file\n", e)
	}
	e = json.Unmarshal(file, &Config)
	if e != nil {
		log.Fatal("Config read error\n", e)
	}
}
