package feed

import (
	"adammathes.com/neko/models"
	"log"
)

type Feed struct {
	Id    int64  `json:"_id"`
	Url   string `json:"url"`
	Title string `json:"title"`
	// TODO: last_updated scan
}

func NewFeed(url string) error {
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
	return filter(" ORDER BY URL desc")
}

func filter(where string) ([]*Feed, error) {
	// todo: add back in title
	rows, err := models.DB.Query(`SELECT id, url, title
                                  FROM feed ` + where)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	feeds := make([]*Feed, 0)
	for rows.Next() {
		f := new(Feed)
		err := rows.Scan(&f.Id, &f.Url, &f.Title)
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
                     SET title=?, url=?
                     WHERE id=?`, f.Title, f.Url, f.Id)
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
