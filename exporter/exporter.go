package exporter

import (
	"adammathes.com/neko/models/feed"
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html/template"
)

func ExportFeeds(format string) string {
	feeds, err := feed.All()
	if err != nil {
		panic(err)
	}

	s := ""
	switch format {
	case "text":
		for _, f := range feeds {
			s = s + fmt.Sprintf("%s\n", f.Url)
		}

	case "opml":
		s = s + fmt.Sprintf(`<opml version="2.0"><head><title>neko feeds</title></head><body>`)
		s = s + fmt.Sprintf("\n")
		for _, f := range feeds {
			b, _ := xml.Marshal(f)
			s = s + fmt.Sprintf("%s\n", string(b))
		}
		s = s + fmt.Sprintf(`</body></opml>`)

	case "json":
		js, _ := json.Marshal(feeds)
		s = fmt.Sprintf("%s\n", js)

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
		var bts bytes.Buffer
		htmlTemplate, err := template.New("feeds").Parse(htmlTemplateString)
		err = htmlTemplate.Execute(&bts, feeds)
		if err != nil {
			panic(err)
		}
		s = bts.String()
	}

	return s
}
