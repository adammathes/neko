package config

import (
	"os"

	"gopkg.in/yaml.v2"
)

type Settings struct {
	DBFile         string `yaml:"database"`
	Port           int    `yaml:"http"`
	DigestPassword string `yaml:"password"`
	CrawlMinutes   int    `yaml:"minutes"`
	ProxyImages    bool   `yaml:"imageproxy"`
	SecureCookies  bool   `yaml:"secure_cookies"`
}

var Config Settings

func Init(filename string) error {
	if filename != "" {
		if err := readConfig(filename); err != nil {
			return err
		}
	}
	addDefaults()
	return nil
}

func readConfig(filename string) error {
	file, err := os.ReadFile(filename)
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(file, &Config)
	if err != nil {
		return err
	}
	return nil
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
