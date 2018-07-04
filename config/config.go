package config

import (
	"encoding/json"
	"io/ioutil"
	"log"
)

type Settings struct {
	DBFile         string `json:"db"`
	Port           int    `json:"web"`
	Username       string `json:"username"`
	DigestPassword string `json:"password"`
	ProxyImages    bool   `json:"proxy_images"`
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
