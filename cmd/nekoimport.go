package main

import (
	_ "neko/util"
	"neko/models/feed"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"strings"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Printf("usage: nekoimport config.json <feeds.txt>\n\n format is one URL per line\n")
	}

	fb, err := ioutil.ReadFile(os.Args[2])
	if err != nil {
		log.Fatal("could not read file\n")
	}

	feeds := strings.Split(string(fb), "\n")
	for _,f := range feeds {
		feed.NewFeed(f)
	}
}
