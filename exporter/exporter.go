package exporter

import (
	"adammathes.com/neko/models/feed"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html/template"
	"os"
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
		htmlTemplateString := `<html>
<head>
<title>neko exported feeds</title>
</head>
<body>
<h1>neko exported feeds</h1>
<ul>
{{ range . }}
<li><a href="{{.WebUrl}}">{{.Title}}</a> | <a href="{{.Url}}">xml</a></li>
{{ end }}
</ul>
</body>
</html>`
		htmlTemplate, err := template.New("feeds").Parse(htmlTemplateString)
		err = htmlTemplate.Execute(os.Stdout, feeds)
		if err != nil {
			panic(err)
		}
	}
}
