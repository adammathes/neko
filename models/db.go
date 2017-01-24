/*
Package neko/models implements behavior for the entities necessary for the subscription services and handles persistence via a mysql/maridb database
*/
package models

import (
    "database/sql"
	_ "github.com/go-sql-driver/mysql"
    "log"
)

var DB *sql.DB

func InitDB(dataSourceName string) {
    var err error
    DB, err = sql.Open("mysql", dataSourceName)
    if err != nil {
        log.Panic(err)
    }

    if err = DB.Ping(); err != nil {
        log.Panic(err)
    }
}
