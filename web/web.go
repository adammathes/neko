package web

import (
	"encoding/base64"
	"fmt"
	"io/fs"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"compress/gzip"
	"embed"
	"io"
	"sync"

	"adammathes.com/neko/api"
	"adammathes.com/neko/config"
	"golang.org/x/crypto/bcrypt"
)

var gzPool = sync.Pool{
	New: func() interface{} {
		gz, _ := gzip.NewWriterLevel(io.Discard, gzip.BestSpeed)
		return gz
	},
}

var (
	//go:embed static/*
	staticFiles embed.FS

	//go:embed dist/v2/*
	frontendFiles embed.FS

	//go:embed dist/vanilla/*
	vanillaFiles embed.FS
)

// init is no longer strictly needed for finding boxes with embed,
// but we'll keep it if any other initialization is needed later.
func init() {}

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
	// The files are in the 'static' subdirectory of the embedded FS
	f, err := staticFiles.Open("static/" + filename)
	if err != nil {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}
	defer f.Close()

	fi, _ := f.Stat()
	http.ServeContent(w, r, filename, fi.ModTime(), f.(io.ReadSeeker))
}

func apiLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
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

func NewRouter() http.Handler {
	mux := http.NewServeMux()

	// Static files from web/static
	staticSub, _ := fs.Sub(staticFiles, "static")
	mux.Handle("/static/", GzipMiddleware(http.StripPrefix("/static/", http.FileServer(http.FS(staticSub)))))

	// New Frontend (React/Vite) from web/dist/v2
	mux.Handle("/v2/", GzipMiddleware(http.StripPrefix("/v2/", http.HandlerFunc(ServeFrontend))))

	// New REST API
	apiRouter := api.NewRouter()
	mux.Handle("/api/", GzipMiddleware(http.StripPrefix("/api", AuthWrapHandler(apiRouter))))

	// Vanilla JS Prototype from web/dist/vanilla
	vanillaSub, _ := fs.Sub(vanillaFiles, "dist/vanilla")
	mux.Handle("/vanilla/", GzipMiddleware(http.StripPrefix("/vanilla/", http.FileServer(http.FS(vanillaSub)))))

	// Legacy routes for backward compatibility
	mux.HandleFunc("/stream/", AuthWrap(api.HandleStream))
	mux.HandleFunc("/item/", AuthWrap(api.HandleItem))
	mux.HandleFunc("/feed/", AuthWrap(api.HandleFeed))
	mux.HandleFunc("/tag/", AuthWrap(api.HandleCategory))
	mux.HandleFunc("/export/", AuthWrap(api.HandleExport))
	mux.HandleFunc("/crawl/", AuthWrap(api.HandleCrawl))

	mux.Handle("/image/", http.StripPrefix("/image/", AuthWrap(imageProxyHandler)))

	mux.HandleFunc("/login/", loginHandler)
	mux.HandleFunc("/logout/", logoutHandler)
	mux.HandleFunc("/api/login", apiLoginHandler)
	mux.HandleFunc("/api/logout", apiLogoutHandler)
	mux.HandleFunc("/api/auth", apiAuthStatusHandler)

	mux.Handle("/", GzipMiddleware(AuthWrap(http.HandlerFunc(indexHandler))))

	return mux
}

func Serve() {
	router := NewRouter()
	log.Fatal(http.ListenAndServe(":"+strconv.Itoa(config.Config.Port), router))
}

type gzipWriter struct {
	http.ResponseWriter
	gz *gzip.Writer
}

func (w *gzipWriter) Write(b []byte) (int, error) {
	if w.Header().Get("Content-Type") == "" {
		w.Header().Set("Content-Type", http.DetectContentType(b))
	}
	contentType := w.Header().Get("Content-Type")
	if w.gz == nil && isCompressible(contentType) && w.Header().Get("Content-Encoding") == "" {
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Del("Content-Length")
		gz := gzPool.Get().(*gzip.Writer)
		gz.Reset(w.ResponseWriter)
		w.gz = gz
	}
	if w.gz != nil {
		return w.gz.Write(b)
	}
	return w.ResponseWriter.Write(b)
}

func (w *gzipWriter) WriteHeader(status int) {
	if status != http.StatusOK && status != http.StatusCreated && status != http.StatusAccepted {
		w.ResponseWriter.WriteHeader(status)
		return
	}
	contentType := w.Header().Get("Content-Type")
	if isCompressible(contentType) && w.Header().Get("Content-Encoding") == "" {
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Del("Content-Length")
		gz := gzPool.Get().(*gzip.Writer)
		gz.Reset(w.ResponseWriter)
		w.gz = gz
	}
	w.ResponseWriter.WriteHeader(status)
}

func (w *gzipWriter) Flush() {
	if w.gz != nil {
		w.gz.Flush()
	}
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func isCompressible(contentType string) bool {
	ct := strings.ToLower(contentType)
	return strings.Contains(ct, "text/") ||
		strings.Contains(ct, "javascript") ||
		strings.Contains(ct, "json") ||
		strings.Contains(ct, "xml") ||
		strings.Contains(ct, "rss") ||
		strings.Contains(ct, "xhtml")
}

func GzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		gzw := &gzipWriter{ResponseWriter: w}
		next.ServeHTTP(gzw, r)
		if gzw.gz != nil {
			gzw.gz.Close()
			gzPool.Put(gzw.gz)
		}
	})
}

func apiLogoutHandler(w http.ResponseWriter, r *http.Request) {
	c := http.Cookie{Name: AuthCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: false}
	http.SetCookie(w, &c)
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok"}`)
}
