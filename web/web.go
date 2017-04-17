package web

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"adammathes.com/neko/crawler"
	"encoding/json"
	"fmt"
	"golang.org/x/crypto/bcrypt"
	"log"
	"net/http"
	"path"
	"strconv"
)

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, staticFilePath("ui.html"))
}

func streamHandler(w http.ResponseWriter, r *http.Request) {

	max_id := 0
	if r.FormValue("max_id") != "" {
		max_id, _ = strconv.Atoi(r.FormValue("max_id"))
	}

	feed_id := int64(0)
	if r.FormValue("feed_url") != "" {
		feed_url := r.FormValue("feed_url")
		var f feed.Feed
		f.ByUrl(feed_url)
		feed_id = f.Id
	}

	unread_only := true
	if r.FormValue("read_filter") != "" {
		unread_only = false
	}

	starred_only := false
	if r.FormValue("starred") != "" {
		starred_only = true
	}

	var items []*item.Item
	items, err := item.Filter(int64(max_id), feed_id, unread_only, starred_only)
	if err != nil {
		log.Println(err)
	}

	w.Header().Set("Content-Type", "application/json")
	js, _ := json.Marshal(items)
	w.Write(js)
}

func itemHandler(w http.ResponseWriter, r *http.Request) {
	var i item.Item
	err := json.NewDecoder(r.Body).Decode(&i)
	if err != nil {
		log.Println(err)
	} else {
		i.Save()
	}
	defer r.Body.Close()
}

func feedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		feeds, err := feed.All()
		if err != nil {
			log.Println(err)
		}

		js, err := json.Marshal(feeds)
		if err != nil {
			log.Println(err)
		}
		w.Write(js)
		return
	}

	var f feed.Feed
	err := json.NewDecoder(r.Body).Decode(&f)
	if err != nil {
		log.Println(err)
	}

	switch r.Method {
	case "POST":
		feed.NewFeed(f.Url)
		f.ByUrl(f.Url)
		ch := make(chan string)
		// log.Println("crawling")
		crawler.CrawlFeed(&f, ch)
		log.Println(<-ch)
	case "PUT":
		f.Update()
	case "DELETE":
		feed_id, err := strconv.Atoi(r.URL.Path[len("/feed/"):])
		if err != nil {
			log.Println(err)
			return
		}
		f.Id = int64(feed_id)
		f.Delete()
	}
}

var AuthCookie = "auth"
var SecondsInAYear = 60 * 60 * 24 * 365

func loginHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		http.ServeFile(w, r, staticFilePath("login.html"))
	case "POST":
		password := r.FormValue("password")
		if password == config.Config.DigestPassword {
			v, _ := bcrypt.GenerateFromPassword([]byte(password), 0)
			c := http.Cookie{Name: AuthCookie, Value: string(v), Path: "/", MaxAge: SecondsInAYear, HttpOnly: false}
			http.SetCookie(w, &c)
			http.Redirect(w, r, "/", 307)
		} else {
			http.Error(w, "bad login", 401)
		}
	default:
		http.Error(w, "nope", 500)
	}
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	c := http.Cookie{Name: AuthCookie, MaxAge: 0, Path: "/", HttpOnly: false}
	http.SetCookie(w, &c)
	fmt.Fprintf(w, "you are logged out")
}

func Authenticated(r *http.Request) bool {
	pc, err := r.Cookie("auth")
	if err != nil {
		return false
	}
	err = bcrypt.CompareHashAndPassword([]byte(pc.Value), []byte(config.Config.DigestPassword))
	if err == nil {
		return true
	}
	return false
}

func AuthWrap(wrapped http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if Authenticated(r) {
			wrapped(w, r)
		} else {
			http.Redirect(w, r, "/login/", 307)
		}
	}
}

func Serve() {
	fs := http.FileServer(http.Dir(config.Config.StaticDir))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/stream/", AuthWrap(streamHandler))
	http.HandleFunc("/item/", AuthWrap(itemHandler))
	http.HandleFunc("/feed/", AuthWrap(feedHandler))

	http.HandleFunc("/login/", loginHandler)
	http.HandleFunc("/logout/", logoutHandler)

	http.HandleFunc("/", AuthWrap(indexHandler))

	http.ListenAndServe(config.Config.WebServer, nil)
}

// given a path, prepend config.Config.StaticDir
// TODO: compile these into the binary to remove dependency on the files
func staticFilePath(p string) string {
	return path.Join(config.Config.StaticDir, p)
}
