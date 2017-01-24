package web

import (
	"encoding/json"
	"github.com/abbot/go-http-auth"
	"log"
	"neko/config"
	"neko/models/feed"
	"neko/models/item"
	"net/http"
	"strconv"
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

func Secret(user, realm string) string {
	if user == config.Config.Username {
		return config.Config.DigestPassword
	}
	return ""
}

func AuthWrap(a *auth.DigestAuth, wrapped http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if username, authinfo := a.CheckAuth(r); username == "" {
			a.RequireAuth(w, r)
		} else {
			_ = &auth.AuthenticatedRequest{Request: *r, Username: username}
			if authinfo != nil {
				w.Header().Set(a.Headers.V().AuthInfo, *authinfo)
			}
			wrapped(w, r)
		}
	}
}

func Serve() {
	authenticator := auth.NewDigestAuthenticator(config.Config.Realm, Secret)
	authenticator.PlainTextSecrets = true

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/stream/", AuthWrap(authenticator, streamHandler))
	http.HandleFunc("/item/", AuthWrap(authenticator, itemHandler))
	http.HandleFunc("/feed/", AuthWrap(authenticator, feedHandler))
	http.HandleFunc("/", AuthWrap(authenticator, indexHandler))

	log.Fatal(http.ListenAndServe(config.Config.WebServer, nil))
}
