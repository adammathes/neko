package config

import (
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"log"
)

type Settings struct {
	DBFile         string `yaml:"database"`
	Port           int    `yaml:"http"`
	DigestPassword string `yaml:"password"`
	CrawlMinutes   int    `yaml:"minutes"`
	ProxyImages    bool   `yaml:"imageproxy"`
}

var Config Settings

func Init(filename string) {
	if filename != "" {
		readConfig(filename)
	}
	addDefaults()
}

func readConfig(filename string) {
	file, e := ioutil.ReadFile(filename)
	if e != nil {
		log.Fatal("Can not read config file\n", e)
	}
	e = yaml.Unmarshal(file, &Config)
	if e != nil {
		log.Fatal("Config read error\n", e)
	}
}

func addDefaults() {
	if Config.DBFile == "" {
		Config.DBFile = "neko.db"
	}
	if Config.Port == 0 {
		Config.Port = 4994
	}
	if Config.CrawlMinutes == 0 {
		Config.CrawlMinutes = 60
	}
}
