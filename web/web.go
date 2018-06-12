package web

import (
	"adammathes.com/neko/config"
	"adammathes.com/neko/crawler"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/GeertJohan/go.rice"
	"golang.org/x/crypto/bcrypt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"time"
)

func indexHandler(w http.ResponseWriter, r *http.Request) {
	serveBoxedFile(w, r, "ui.html")
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

	category := ""
	if r.FormValue("tag") != "" {
		category = r.FormValue("tag")
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
	items, err := item.Filter(int64(max_id), feed_id, category, unread_only, starred_only, 0)
	if err != nil {
		log.Println(err)
	}

	w.Header().Set("Content-Type", "application/json")
	js, _ := json.Marshal(items)
	w.Write(js)
}

func itemHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "PUT":
		var i item.Item
		err := json.NewDecoder(r.Body).Decode(&i)
		if err != nil {
			log.Println(err)
		} else {
			i.Save()
		}
	case "GET":
		fullTextHandler(w, r)
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

func categoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		categories, err := feed.Categories()
		if err != nil {
			log.Println(err)
		}

		js, err := json.Marshal(categories)
		if err != nil {
			log.Println(err)
		}
		w.Write(js)
		return
	}
}

func imageProxyHandler(w http.ResponseWriter, r *http.Request) {
	imgURL := r.URL.String()
	decodedURL, err := base64.URLEncoding.DecodeString(imgURL)

	// pseudo-caching
	if r.Header.Get("If-None-Match") == string(decodedURL) {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	if r.Header.Get("Etag") == string(decodedURL) {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	// set headers

	// grab the img
	c := &http.Client{
		// give up after 5 seconds
		Timeout: 5 * time.Second,
	}

	request, err := http.NewRequest("GET", string(decodedURL), nil)
	if err != nil {
		http.Error(w, "failed to proxy image", 404)
		return
	}

	userAgent := "neko RSS Reader Image Proxy +https://github.com/adammathes/neko"
	request.Header.Set("User-Agent", userAgent)
	resp, err := c.Do(request)

	if err != nil {
		http.Error(w, "failed to proxy image", 404)
		return
	}

	bts, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "failed to read proxy image", 404)
		return
	}

	w.Header().Set("ETag", string(decodedURL))
	w.Header().Set("Cache-Control", "public")
	w.Header().Set("Expires", time.Now().Add(48*time.Hour).Format(time.RFC1123))
	w.Write(bts)
	return
}

func fullTextHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("request: %v\n\n", r)

	fmt.Printf("url string: %s\n\n", r.URL.String())

	itemID, _ := strconv.Atoi(r.URL.String())
	//	fmt.Printf("item id: %v\n\n", itemID)

	if itemID == 0 {
		fmt.Printf("wah wah wah\n")
		return
	}

	i := item.ItemById(int64(itemID))
	// fmt.Println("item fetched: %v\n\n", i)

	if i.FullContent == "" {
		i.GetFullContent()
	}

	w.Header().Set("Content-Type", "application/json")
	js, _ := json.Marshal(i)
	w.Write(js)
}

var AuthCookie = "auth"
var SecondsInAYear = 60 * 60 * 24 * 365

func loginHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		serveBoxedFile(w, r, "login.html")
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

func serveBoxedFile(w http.ResponseWriter, r *http.Request, filename string) {
	box := rice.MustFindBox("../static")
	ui, err := box.Open(filename)
	if err != nil {
		panic(err)
	}
	fi, _ := ui.Stat()
	http.ServeContent(w, r, filename, fi.ModTime(), ui)
}

func Serve() {

	box := rice.MustFindBox("../static")
	staticFileServer := http.StripPrefix("/static/", http.FileServer(box.HTTPBox()))
	http.Handle("/static/", staticFileServer)

	http.HandleFunc("/stream/", AuthWrap(streamHandler))
	http.Handle("/item/", http.StripPrefix("/item/", AuthWrap(itemHandler)))
	http.HandleFunc("/feed/", AuthWrap(feedHandler))
	http.HandleFunc("/tag/", AuthWrap(categoryHandler))
	http.Handle("/image/", http.StripPrefix("/image/", AuthWrap(imageProxyHandler)))

	http.HandleFunc("/login/", loginHandler)
	http.HandleFunc("/logout/", logoutHandler)

	http.HandleFunc("/", AuthWrap(indexHandler))

	http.ListenAndServe(config.Config.WebServer, nil)
}
