package exporter

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/models/feed"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html/template"
	"os"
	"path"
)

func ExportFeeds(format string) {
	feeds, err := feed.All()
	if err != nil {
		panic(err)
	}

	switch format {
	case "text":
		for _, f := range feeds {
			fmt.Printf("%s\n", f.Url)
		}

	case "opml":
		fmt.Printf(`<opml version="2.0"><head><title>neko feeds</title></head><body>`)
		fmt.Printf("\n")
		for _, f := range feeds {
			b, _ := xml.Marshal(f)
			fmt.Printf("%s\n", string(b))
		}
		fmt.Printf(`</body></opml>`)

	case "json":
		js, _ := json.Marshal(feeds)
		fmt.Printf("%s\n", js)

	case "html":
		tmplFile := path.Join(config.Config.StaticDir, "feeds.tmpl")
		feedsTmpl := template.Must(template.ParseFiles(tmplFile))
		err := feedsTmpl.Execute(os.Stdout, feeds)
		if err != nil {
			panic(err)
		}
	}
}
