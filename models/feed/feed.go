package feed

import (
	"adammathes.com/neko/models"
	"github.com/PuerkitoBio/goquery"
	"log"
	"net/http"
)

type Feed struct {
	Id     int64  `json:"_id" xml:"-"`
	Url    string `json:"url" xml:"xmlUrl,attr"`
	WebUrl string `json:"web_url" xml:"htmlUrl,attr"`
	Title  string `json:"title" xml:"text,attr"`

	// for OPML output purposes
	XMLName string `json:"-" xml:"outline"`
	Type    string `json:"-" xml:"type,attr"`
}

func NewFeed(url string) error {
	url = ResolveFeedURL(url)
	stmt, err := models.DB.Prepare("INSERT INTO feed(url) VALUES(?)")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(url)
	if err != nil {
		return err
	}
	return nil
}

func All() ([]*Feed, error) {
	return filter(" ORDER BY lower(TITLE) asc")
}

func filter(where string) ([]*Feed, error) {
	// todo: add back in title
	rows, err := models.DB.Query(`SELECT id, url, web_url, title
                                  FROM feed ` + where)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	feeds := make([]*Feed, 0)
	for rows.Next() {
		f := new(Feed)
		err := rows.Scan(&f.Id, &f.Url, &f.WebUrl, &f.Title)
		f.Type = "rss"
		if err != nil {
			return nil, err
		}
		feeds = append(feeds, f)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return feeds, nil
}

func (f *Feed) Update() {
	if len(f.Title) == 0 {
		return
	}

	if f.Id == 0 {
		return
	}

	if len(f.Url) == 0 {
		return
	}

	models.DB.Query(`UPDATE feed 
                     SET title=?, url=?, web_url=?
                     WHERE id=?`, f.Title, f.Url, f.WebUrl, f.Id)
}

func (f *Feed) Delete() {
	log.Println("lets delete some shiteeee")
	_, err := models.DB.Exec(`DELETE FROM feed 
                                  WHERE id=?`, f.Id)
	if err != nil {
		log.Println(err)
	}
}

func (f *Feed) ByUrl(url string) error {
	err := models.DB.QueryRow(`SELECT id, url, title 
                               FROM feed
                               WHERE url = ?`, url).Scan(&f.Id, &f.Url, &f.Title)
	if err != nil {
		return err
	}
	return nil
}

func (f *Feed) Create() error {
	res, err := models.DB.Exec(`INSERT INTO feed(url, title)
                                VALUES(?, ?)`, f.Url, f.Title)
	if err != nil {
		return err
	}

	id, _ := res.LastInsertId()
	f.Id = id

	return nil
}

// Given a string `url`, return to the best guess of the feed
func ResolveFeedURL(url string) string {
	resp, err := http.Get(url)
	if err != nil {
		// handle errors better
		return url
	}

	// Check content-type header first
	// if it's feed-ish, just use it
	contentType := resp.Header["Content-Type"][0]
	switch contentType {

	case "text/xml":
		return url
	case "text/rss+xml":
		return url
	case "application/rss+xml":
		return url
	case "application/atom+xml":
		return url
	}

	// goquery is probably overkill here
	doc, err := goquery.NewDocument(url)
	var f string

	// loop over each link element, return first one that is of type rss or atom
	f = ""
	doc.Find("link").Each(func(i int, s *goquery.Selection) {

		if f != "" {
			// we're done
			return
		}

		t := s.AttrOr("type", "")
		h := s.AttrOr("href", "")
		if t == "application/atom+xml" {
			f = h
		}
		if t == "application/rss+xml" {
			f = h
		}
	})

	// if we have nothing, just return the original url
	if f == "" {
		f = url
	}

	// if we don't start with http[s] its probably relative
	if f[0] != 'h' {
		f = url + f
	}
	return f
}
