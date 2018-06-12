/*
Package neko/models implements behavior for the entities necessary for the subscription services and handles persistence via a mysql/maridb database
*/
package models

import (
	"adammathes.com/neko/config"
	"database/sql"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/mattn/go-sqlite3"
	"log"
)

var DB *sql.DB

func InitDB() {
	var err error
	//    DB, err = sql.Open("mysql", dataSourceName)
	DB, err = sql.Open(config.Config.DBDriver, config.Config.DBServer)
	if err != nil {
		log.Panic(err)
	}

	if err = DB.Ping(); err != nil {
		log.Panic(err)
	}
}
