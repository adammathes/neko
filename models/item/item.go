package item

import (
	"encoding/base64"
	"fmt"
	"strings"

	"adammathes.com/neko/config"
	"adammathes.com/neko/internal/vlog"
	"adammathes.com/neko/models"
	"github.com/PuerkitoBio/goquery"
	goose "github.com/advancedlogic/GoOse"
	"github.com/microcosm-cc/bluemonday"
	"github.com/russross/blackfriday"
)

type ContentExtractor interface {
	Extract(url string) (*goose.Article, error)
}

type GooseExtractor struct{}

func (ge GooseExtractor) Extract(url string) (*goose.Article, error) {
	g := goose.New()
	return g.ExtractFromURL(url)
}

var Extractor ContentExtractor = GooseExtractor{}

type Item struct {
	Id int64 `json:"_id,string,omitempty"`

	Title string `json:"title"`
	Url   string `json:"url"`

	Description string `json:"description"`
	PublishDate string `json:"publish_date"`

	FeedId       int64
	FeedTitle    string `json:"feed_title"`
	FeedUrl      string `json:"feed_url"`
	FeedCategory string `json:"feed_category"`

	ReadState bool `json:"read"`
	Starred   bool `json:"starred"`

	FullContent string `json:"full_content"`
	HeaderImage string `json:"header_image"`
}

func (i *Item) Print() {
	fmt.Printf("id: %d\n", i.Id)
	fmt.Printf("title: %s\n", i.Title)
	fmt.Printf("ReadState: %t\n", i.ReadState)
}

func (i *Item) Create() error {
	res, err := models.DB.Exec(`INSERT INTO 
                                item(title, url, description, publish_date, feed_id)
                                VALUES(?, ?, ?, ?, ?)`, i.Title, i.Url, i.Description, i.PublishDate, i.FeedId)
	if err != nil {
		vlog.Printf("Error on item.Create\n%v\n%v\n", i.Url, err)
		return err
	}

	id, _ := res.LastInsertId()
	i.Id = id

	return nil
}

func (i *Item) Save() {
	_, err := models.DB.Exec(`UPDATE item
                              SET read_state=?, starred=?
                              WHERE id=?`, i.ReadState, i.Starred, i.Id)
	if err != nil {
		vlog.Printf("Error on item.Save\n%v\n%v\n", i, err)
	}
}

func (i *Item) FullSave() {
	_, err := models.DB.Exec(`UPDATE item
                              SET title=?, url=?, description=?, feed_id=? 
                              WHERE id=?`, i.Title, i.Url, i.Description, i.FeedId, i.Id)
	if err != nil {
		vlog.Printf("Error on item.fullSave\n%v\n%v\n", i, err)
	}
}

func filterPolicy() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	p.AllowElements("ul", "ol", "li", "blockquote", "a", "img", "p", "h1", "h2", "h3", "h4", "b", "i", "em", "strong", "pre", "code")
	p.AllowAttrs("href").OnElements("a")
	p.AllowAttrs("src", "alt").OnElements("img")
	return p
}

func ItemById(id int64) *Item {
	items, err := Filter(0, 0, "", false, false, id, "")
	if err != nil || len(items) == 0 {
		return nil
	}
	return items[0]
}

func (i *Item) GetFullContent() {
	fmt.Printf("fetching from %s\n", i.Url)
	article, err := Extractor.Extract(i.Url)
	if err != nil {
		vlog.Println(err)
		return
	}

	// i.FullContent and i.HeaderImage will be updated during extraction
	if article.CleanedText != "" {
		i.FullContent = string(blackfriday.Run([]byte(article.CleanedText)))
	}

	if article.TopNode != nil {
		ht, err := article.TopNode.Html()
		if err == nil {
			p := filterPolicy()
			i.FullContent = p.Sanitize(ht)
		}
	}
	i.HeaderImage = article.TopImage

	_, err = models.DB.Exec(`UPDATE item
                              SET full_content=?, header_image=?
                              WHERE id=?`, i.FullContent, i.HeaderImage, i.Id)
	if err != nil {
		vlog.Println(err)
	}
}

func Filter(max_id int64, feed_id int64, category string, unread_only bool, starred_only bool, item_id int64, search_query string) ([]*Item, error) {

	var args []interface{}
	tables := " feed,item"
	if search_query != "" {
		tables = tables + ",fts_item"
	}

	query := `SELECT item.id, item.feed_id, item.title, 
                     item.url, item.description, 
                     item.read_state, item.starred, item.publish_date,
                     item.full_content, item.header_image,
                     feed.url, feed.title, feed.category
              FROM `
	query = query + tables + ` WHERE item.feed_id=feed.id AND item.id!=0 `

	if max_id != 0 {
		query = query + "AND item.id < ? "
		args = append(args, max_id)
	}

	if feed_id != 0 {
		query = query + " AND feed.id=? "
		args = append(args, feed_id)
	}

	if category != "" {
		query = query + " AND feed.category=? "
		args = append(args, category)
	}

	if unread_only {
		query = query + " AND item.read_state=0 "
	}

	if item_id != 0 {
		query = query + " AND item.id=? "
		args = append(args, item_id)
	}

	if search_query != "" {
		query = query + " AND fts_item match ? AND fts_item.rowid=item.id "
		args = append(args, search_query)
	}

	// this is kind of dumb, but to keep the logic the same
	// we kludge it this way for a "by id" select
	if starred_only {
		query = query + " AND item.starred=1 "
	}

	query = query + "ORDER BY item.id DESC LIMIT 15"
	// vlog.Println(query)
	// vlog.Println(args...)

	rows, err := models.DB.Query(query, args...)
	if err != nil {
		vlog.Println(err)
		return nil, err
	}
	defer rows.Close()

	p := filterPolicy()

	items := make([]*Item, 0)
	for rows.Next() {
		i := new(Item)
		var feed_id int64
		err := rows.Scan(&i.Id, &feed_id, &i.Title, &i.Url, &i.Description, &i.ReadState, &i.Starred, &i.PublishDate, &i.FullContent, &i.HeaderImage, &i.FeedUrl, &i.FeedTitle, &i.FeedCategory)
		if err != nil {
			vlog.Println(err)
			return nil, err
		}

		// sanitize all fields from external input
		// should do this at ingest time, probably, for efficiency
		// but still may need to adjust rules
		i.Title = p.Sanitize(i.Title)
		i.Description = p.Sanitize(i.Description)
		if config.Config.ProxyImages {
			i.Description = rewriteImages(i.Description)
		}
		i.Url = p.Sanitize(i.Url)
		i.FeedTitle = p.Sanitize(i.FeedTitle)
		i.FeedUrl = p.Sanitize(i.FeedUrl)
		i.FullContent = p.Sanitize(i.FullContent)
		i.HeaderImage = p.Sanitize(i.HeaderImage)
		i.CleanHeaderImage()
		items = append(items, i)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (i *Item) CleanHeaderImage() {
	// TODO: blacklist of bad imgs
	if i.HeaderImage == "https://s0.wp.com/i/blank.jpg" {
		i.HeaderImage = ""
	}
}

// rewrite images to use local proxy
func rewriteImages(s string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(s))
	if err != nil {
		vlog.Println(err)
		return s
	}

	doc.Find("img").Each(func(i int, img *goquery.Selection) {
		if src, ok := img.Attr("src"); ok {
			img.SetAttr("src", proxyURL(src))
		}
		if srcset, ok := img.Attr("srcset"); ok {
			// srcset is a comma-separated list of "url descriptor"
			parts := strings.Split(srcset, ",")
			for i, part := range parts {
				part = strings.TrimSpace(part)
				subparts := strings.Fields(part)
				if len(subparts) > 0 {
					subparts[0] = proxyURL(subparts[0])
				}
				parts[i] = strings.Join(subparts, " ")
			}
			img.SetAttr("srcset", strings.Join(parts, ", "))
		}
	})

	output, _ := doc.Html()
	return output
}

func proxyURL(url string) string {
	return "/image/" + base64.URLEncoding.EncodeToString([]byte(url))
}
