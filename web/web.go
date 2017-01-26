package web

import (
	"encoding/json"
	"fmt"
	// "github.com/abbot/go-http-auth"
	"log"
	"neko/config"
	"neko/models/feed"
	"neko/models/item"
	"net/http"
	"strconv"
	"golang.org/x/crypto/bcrypt"
)

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/ui.html")
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

	var items []*item.Item
	items, err := item.Filter(int64(max_id), feed_id, unread_only)
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

func loginHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		http.ServeFile(w, r, "static/login.html")
	case "POST":
		password := r.FormValue("password")	
		if password == config.Config.DigestPassword {
			v,_ := bcrypt.GenerateFromPassword([]byte(password), 0)
			c := http.Cookie{ Name: AuthCookie, Value: string(v), Path: "/", MaxAge: 5000, HttpOnly:false }
			http.SetCookie(w, &c)
			fmt.Fprintf(w, "you are logged in")
		} else {
			http.Error(w, "nope", 401)
		}		
	default:
		http.Error(w, "nope", 500)
	}
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	c := http.Cookie{ Name: AuthCookie, MaxAge: 0, Path: "/", HttpOnly:false }
	http.SetCookie(w, &c)
	fmt.Fprintf(w, "you are logged in")
}

func Authenticated(r *http.Request) bool {
	pc,err := r.Cookie("auth")
	log.Printf("%v", pc)
	if err != nil {
		return false
	}

	err = bcrypt.CompareHashAndPassword( []byte(pc.Value), []byte(config.Config.DigestPassword) )
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
			http.Error(w, "nope", 401)
		}
	}
}

func Serve() {
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/stream/", AuthWrap(streamHandler))
	http.HandleFunc("/item/", AuthWrap(itemHandler))
	http.HandleFunc("/feed/", AuthWrap(feedHandler))

	http.HandleFunc("/login/", loginHandler)
	http.HandleFunc("/logout/", logoutHandler)

	http.HandleFunc("/", AuthWrap(indexHandler))


	http.ListenAndServe(config.Config.WebServer, nil)
}
