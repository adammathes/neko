package exporter

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html/template"

	"adammathes.com/neko/models/feed"
)

type OPML struct {
	XMLName xml.Name `xml:"opml"`
	Version string   `xml:"version,attr"`
	Head    struct {
		Title string `xml:"title"`
	} `xml:"head"`
	Body struct {
		Outlines []Outline `xml:"outline"`
	} `xml:"body"`
}

type Outline struct {
	XMLName  xml.Name  `xml:"outline"`
	Text     string    `xml:"text,attr"`
	Title    string    `xml:"title,attr,omitempty"`
	Type     string    `xml:"type,attr,omitempty"`
	XMLURL   string    `xml:"xmlUrl,attr,omitempty"`
	HTMLURL  string    `xml:"htmlUrl,attr,omitempty"`
	Outlines []Outline `xml:"outline,omitempty"`
}

func ExportFeeds(format string) string {
	feeds, err := feed.All()
	if err != nil {
		return ""
	}

	switch format {
	case "text":
		var b bytes.Buffer
		for _, f := range feeds {
			fmt.Fprintf(&b, "%s\n", f.Url)
		}
		return b.String()

	case "opml":
		var o OPML
		o.Version = "2.0"
		o.Head.Title = "neko feeds"

		// Group by category
		cats := make(map[string][]*feed.Feed)
		var noCat []*feed.Feed
		for _, f := range feeds {
			if f.Category != "" {
				cats[f.Category] = append(cats[f.Category], f)
			} else {
				noCat = append(noCat, f)
			}
		}

		for cat, fds := range cats {
			out := Outline{Text: cat}
			for _, f := range fds {
				out.Outlines = append(out.Outlines, Outline{
					Text:    f.Title,
					Title:   f.Title,
					Type:    "rss",
					XMLURL:  f.Url,
					HTMLURL: f.WebUrl,
				})
			}
			o.Body.Outlines = append(o.Body.Outlines, out)
		}

		for _, f := range noCat {
			o.Body.Outlines = append(o.Body.Outlines, Outline{
				Text:    f.Title,
				Title:   f.Title,
				Type:    "rss",
				XMLURL:  f.Url,
				HTMLURL: f.WebUrl,
			})
		}

		b, err := xml.MarshalIndent(o, "", "  ")
		if err != nil {
			return ""
		}
		return xml.Header + string(b)

	case "json":
		js, _ := json.MarshalIndent(feeds, "", "  ")
		return string(js)

	case "html":
		htmlTemplateString := `<html>
<head>
<title>feeds</title>
</head>
<body>
<ul>
{{ range . }}
<li><a href="{{.WebUrl}}">{{.Title}}</a> | <a href="{{.Url}}">xml</a></li>
{{ end }}
</ul>
</body>
</html>`
		var bts bytes.Buffer
		htmlTemplate, err := template.New("feeds").Parse(htmlTemplateString)
		if err != nil {
			return ""
		}
		err = htmlTemplate.Execute(&bts, feeds)
		if err != nil {
			return ""
		}
		return bts.String()
	}

	return ""
}
