package config

import (
	"encoding/json"
	"io/ioutil"
	"log"
)

type Settings struct {
	DBServer       string
	WebServer      string
	Username       string
	Realm          string
	DigestPassword string
}

var Config Settings

func Read(filename string) {
	file, e := ioutil.ReadFile(filename)
	if e != nil {
		log.Fatal("Can not read config file", e)
	}
	
	e = json.Unmarshal(file, &Config)
	if e != nil {
		log.Fatal("Config read error", e)
	}
}
