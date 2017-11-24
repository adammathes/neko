package item

import (
	"adammathes.com/neko/models"
	"adammathes.com/neko/vlog"
	"fmt"
	"github.com/advancedlogic/GoOse"
	"github.com/microcosm-cc/bluemonday"
	"github.com/russross/blackfriday"
	"log"
)

type Item struct {
	Id int64 `json:"_id,string,omitempty"`

	Title string `json:"title"`
	Url   string `json:"url"`

	Description string `json:"description"`
	PublishDate string `json:"publish_date"`

	FeedId    int64
	FeedTitle string `json:"feed_title"`
	FeedUrl   string `json:"feed_url"`

	ReadState bool `json:"read"`
	Starred   bool `json:"starred"`

	FullContent string `json:"full_content"`
	HeaderImage string `json:"header_image"`
}

func (i *Item) Print() {
	fmt.Printf("id: %d\n", i.Id)
	fmt.Printf("title: %s\n", i.Title)
	fmt.Printf("ReadState: %d\n", i.ReadState)
}

func (i *Item) Create() error {
	res, err := models.DB.Exec(`INSERT INTO 
                                item(title, url, description, publish_date, feed_id)
                                VALUES(?, ?, ?, ?, ?)`, i.Title, i.Url, i.Description, i.PublishDate, i.FeedId)
	if err != nil {
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
		log.Println(err)
	}
}

func (i *Item) FullSave() {
	_, err := models.DB.Exec(`UPDATE item
                              SET title=?, url=?, description=?, feed_id=? 
                              WHERE id=?`, i.Title, i.Url, i.Description, i.FeedId, i.Id)
	if err != nil {
		log.Println(err)
	}
}

func (i *Item) GetFullContent() {
	g := goose.New()
	article, err := g.ExtractFromURL(i.Url)
	if err != nil {
		vlog.Println(err)
		return
	}

	if article.TopNode == nil {
		return
	}

	var md, img string
	md = ""
	img = ""
	md = string(blackfriday.MarkdownCommon([]byte(article.CleanedText)))

	ht, err := article.TopNode.Html()
	if err != nil {
		vlog.Println(err)
		return
	}

	p := bluemonday.NewPolicy()
	p.AllowElements("blockquote", "a", "img", "p", "h1", "h2", "h3", "h4", "b", "i", "em", "strong")
	p.AllowAttrs("href").OnElements("a")
	p.AllowAttrs("src", "alt").OnElements("img")
	md = p.Sanitize(ht)

	img = article.TopImage

	_, err = models.DB.Exec(`UPDATE item
                              SET full_content=?, header_image=?
                              WHERE id=?`, md, img, i.Id)
	if err != nil {
		vlog.Println(err)
	}
}

func Filter(max_id int64, feed_id int64, unread_only bool, starred_only bool) ([]*Item, error) {

	var args []interface{}

	query := `SELECT item.id, item.title, item.url, item.description, 
                     item.read_state, item.starred, item.publish_date,
                     item.full_content, item.header_image,
                     feed.url, feed.title
              FROM item,feed 
              WHERE item.feed_id=feed.id  `

	if max_id != 0 {
		query = query + "AND item.id < ? "
		args = append(args, max_id)
	}

	if feed_id != 0 {
		query = query + " AND feed.id=? "
		args = append(args, feed_id)
	}

	if unread_only {
		query = query + " AND item.read_state=0 "
	}

	if starred_only {
		query = query + " AND item.starred=1 "
	}

	query = query + "ORDER BY item.id DESC LIMIT 15"
	// log.Println(query)
	// log.Println(args...)

	rows, err := models.DB.Query(query, args...)
	if err != nil {
		log.Println(err)
		return nil, err
	}
	defer rows.Close()

	p := bluemonday.NewPolicy()
	p.AllowElements("blockquote", "a", "img", "p", "h1", "h2", "h3", "h4", "b", "i", "em", "strong")
	p.AllowAttrs("href").OnElements("a")
	p.AllowAttrs("src", "alt").OnElements("img")

	items := make([]*Item, 0)
	for rows.Next() {
		i := new(Item)
		err := rows.Scan(&i.Id, &i.Title, &i.Url, &i.Description, &i.ReadState, &i.Starred, &i.PublishDate, &i.FullContent, &i.HeaderImage, &i.FeedUrl, &i.FeedTitle)
		if err != nil {
			log.Println(err)
			return nil, err
		}

		// sanitize all fields from external input
		// should do this at ingest time, probably, for efficiency
		// but still may need to adjust rules
		i.Title = p.Sanitize(i.Title)
		i.Description = p.Sanitize(i.Description)
		i.Url = p.Sanitize(i.Url)
		i.FeedTitle = p.Sanitize(i.FeedTitle)
		i.FeedUrl = p.Sanitize(i.FeedUrl)
		i.FullContent = p.Sanitize(i.FullContent)
		i.HeaderImage = p.Sanitize(i.HeaderImage)
		items = append(items, i)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
