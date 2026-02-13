package web

import (
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"adammathes.com/neko/api"
	"adammathes.com/neko/config"
	rice "github.com/GeertJohan/go.rice"
	"golang.org/x/crypto/bcrypt"
)

func indexHandler(w http.ResponseWriter, r *http.Request) {
	serveBoxedFile(w, r, "ui.html")
}

func imageProxyHandler(w http.ResponseWriter, r *http.Request) {
	imgURL := strings.TrimPrefix(r.URL.Path, "/")
	if imgURL == "" {
		http.Error(w, "no image url provided", http.StatusNotFound)
		return
	}

	decodedURL, err := base64.URLEncoding.DecodeString(imgURL)
	if err != nil {
		http.Error(w, "invalid image url", http.StatusNotFound)
		return
	}

	// pseudo-caching
	if r.Header.Get("If-None-Match") == string(decodedURL) {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	if r.Header.Get("Etag") == string(decodedURL) {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	// grab the img
	c := &http.Client{
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
	return err == nil
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

func AuthWrapHandler(wrapped http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if Authenticated(r) {
			wrapped.ServeHTTP(w, r)
		} else {
			http.Redirect(w, r, "/login/", 307)
		}
	})
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

func apiLoginHandler(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	password := r.FormValue("password")

	// support JSON body as well
	if username == "" && password == "" {
		// try parsing json
		/*
			type loginReq struct {
				Username string `json:"username"`
				Password string `json:"password"`
			}
			// left as todo for now as we can use form data from fetch too
		*/
	}

	if password == config.Config.DigestPassword {
		v, _ := bcrypt.GenerateFromPassword([]byte(password), 0)
		c := http.Cookie{Name: AuthCookie, Value: string(v), Path: "/", MaxAge: SecondsInAYear, HttpOnly: false}
		http.SetCookie(w, &c)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok"}`)
	} else {
		http.Error(w, `{"status":"error", "message":"bad login"}`, 401)
	}
}

func apiAuthStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if Authenticated(r) {
		fmt.Fprintf(w, `{"status":"ok", "authenticated":true}`)
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintf(w, `{"status":"error", "authenticated":false}`)
	}
}

func Serve() {
	box := rice.MustFindBox("../static")
	staticFileServer := http.StripPrefix("/static/", http.FileServer(box.HTTPBox()))
	http.Handle("/static/", staticFileServer)

	// New Frontend
	http.Handle("/v2/", http.StripPrefix("/v2/", http.HandlerFunc(ServeFrontend)))

	// New REST API
	apiRouter := api.NewRouter()
	http.Handle("/api/", http.StripPrefix("/api", AuthWrapHandler(apiRouter)))

	// Legacy routes for backward compatibility
	http.HandleFunc("/stream/", AuthWrap(api.HandleStream))
	http.HandleFunc("/item/", AuthWrap(api.HandleItem))
	http.HandleFunc("/feed/", AuthWrap(api.HandleFeed))
	http.HandleFunc("/tag/", AuthWrap(api.HandleCategory))
	http.HandleFunc("/export/", AuthWrap(api.HandleExport))
	http.HandleFunc("/crawl/", AuthWrap(api.HandleCrawl))

	http.Handle("/image/", http.StripPrefix("/image/", AuthWrap(imageProxyHandler)))

	http.HandleFunc("/login/", loginHandler)
	http.HandleFunc("/logout/", logoutHandler)
	http.HandleFunc("/api/login", apiLoginHandler)
	http.HandleFunc("/api/logout", apiLogoutHandler)
	http.HandleFunc("/api/auth", apiAuthStatusHandler)

	http.HandleFunc("/", AuthWrap(indexHandler))

	log.Fatal(http.ListenAndServe(":"+strconv.Itoa(config.Config.Port), nil))
}

func apiLogoutHandler(w http.ResponseWriter, r *http.Request) {
	c := http.Cookie{Name: AuthCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: false}
	http.SetCookie(w, &c)
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok"}`)
}
