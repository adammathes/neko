/*
Package neko/models implements behavior for the entities necessary for the subscription services and handles persistence via a mysql/maridb database
*/
package models

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"

	"adammathes.com/neko/config"
	"adammathes.com/neko/internal/vlog"
)

var DB *sql.DB

func InitDB() {
	var err error
	//    DB, err = sql.Open("mysql", dataSourceName)
	vlog.Printf("using sqlite3 db file %s\n", config.Config.DBFile)

	DB, err = sql.Open("sqlite3", config.Config.DBFile)
	if err != nil {
		log.Panic(err)
	}

	if err = DB.Ping(); err != nil {
		log.Panic(err)
	}

	schema := `
CREATE TABLE IF NOT EXISTS feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  url varchar(100) NOT NULL UNIQUE,
  web_url varchar(255) NOT NULL DEFAULT '',
  title varchar(255) NOT NULL DEFAULT '',
  last_updated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category varchar(255) NOT NULL DEFAULT 'uncategorized'
);
CREATE INDEX feed_url ON feed (url);
CREATE INDEX feed_category ON feed (category);

CREATE TABLE IF NOT EXISTS item (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  feed_id int(11) NOT NULL,
  title text NOT NULL DEFAULT '',
  url varchar(255) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  publish_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_state tinyint(1) NOT NULL DEFAULT '0',
  starred tinyint(1) NOT NULL DEFAULT '0',
  full_content text NOT NULL DEFAULT '',
  header_image text NOT NULL DEFAULT '',
  CONSTRAINT item_ibfk_1 FOREIGN KEY (feed_id) REFERENCES feed(id) ON DELETE CASCADE
);
CREATE INDEX item_url ON item (url);
CREATE INDEX item_publish_date ON item (publish_date);
CREATE INDEX item_feed_id ON item (feed_id);
CREATE INDEX item_read_state ON item (read_state);

CREATE VIRTUAL TABLE fts_item using fts4(content="item", title, url, description);
CREATE TRIGGER item_bu BEFORE UPDATE ON item BEGIN
  DELETE FROM fts_item WHERE docid=old.rowid;
END;
CREATE TRIGGER item_bd BEFORE DELETE ON item BEGIN
  DELETE FROM fts_item WHERE docid=old.rowid;
END;
CREATE TRIGGER item_au AFTER UPDATE ON item BEGIN
  INSERT INTO fts_item(docid, title, url, description) VALUES(new.rowid, new.title, new.url, new.description);
END;
CREATE TRIGGER item_ai AFTER INSERT ON item BEGIN
  INSERT INTO fts_item(docid, title, url, description) VALUES(new.rowid, new.title, new.url, new.description);
END;

	INSERT INTO fts_item(fts_item) VALUES('rebuild');
`

	_, _ = DB.Exec(schema)
}
