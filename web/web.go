package web

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
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
	"adammathes.com/neko/internal/safehttp"
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
	c := safehttp.NewSafeClient(5 * time.Second)

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
			c := http.Cookie{Name: AuthCookie, Value: string(v), Path: "/", MaxAge: SecondsInAYear, HttpOnly: true}
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
	c := http.Cookie{Name: AuthCookie, MaxAge: 0, Path: "/", HttpOnly: true}
	http.SetCookie(w, &c)
	fmt.Fprintf(w, "you are logged out")
}

func Authenticated(r *http.Request) bool {
	// If no password is configured, authentication is not required
	if config.Config.DigestPassword == "" {
		return true
	}

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

	// If no password is configured, authentication is not required
	if config.Config.DigestPassword == "" {
		// Still set a dummy auth cookie for consistency
		c := http.Cookie{Name: AuthCookie, Value: "noauth", Path: "/", MaxAge: SecondsInAYear, HttpOnly: true}
		http.SetCookie(w, &c)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok"}`)
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
		c := http.Cookie{Name: AuthCookie, Value: string(v), Path: "/", MaxAge: SecondsInAYear, HttpOnly: true}
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

func NewRouter(cfg *config.Settings) http.Handler {
	mux := http.NewServeMux()

	// Static files from web/static
	staticSub, _ := fs.Sub(staticFiles, "static")
	mux.Handle("/static/", GzipMiddleware(http.StripPrefix("/static/", http.FileServer(http.FS(staticSub)))))

	// New Frontend (React/Vite) from web/dist/v2
	// Default route
	mux.Handle("/", GzipMiddleware(http.HandlerFunc(ServeFrontend)))
	// Also keep /v2/ for explicit access
	mux.Handle("/v2/", GzipMiddleware(http.StripPrefix("/v2/", http.HandlerFunc(ServeFrontend))))

	// Legacy UI at /v1/
	mux.Handle("/v1/", GzipMiddleware(http.StripPrefix("/v1/", AuthWrap(http.HandlerFunc(indexHandler)))))

	// New REST API
	apiServer := api.NewServer(cfg)
	// We need to mount the raw mux from apiServer if we want /api/ access,
	// BUT apiServer.ServeMux handles /stream, /item/ etc. at root.
	// We probably want to mount apiServer routes under /api/?
	// The original code mounted apiRouter under /api/.
	// api.NewRouter() returned a mux with /stream etc.
	// So apiServer.ServeMux is a mux with /stream.
	// mux.Handle("/api/", ... http.StripPrefix("/api", ...)) works if apiServer handles /stream.
	// Wait, /api/stream -> StripPrefix -> /stream. apiServer handles /stream. Correct.
	mux.Handle("/api/", GzipMiddleware(http.StripPrefix("/api", AuthWrapHandler(apiServer))))

	// Legacy routes for backward compatibility
	mux.HandleFunc("/stream/", AuthWrap(apiServer.HandleStream))
	mux.HandleFunc("/item/", AuthWrap(apiServer.HandleItem))
	mux.HandleFunc("/feed/", AuthWrap(apiServer.HandleFeed))
	mux.HandleFunc("/tag/", AuthWrap(apiServer.HandleCategory))
	mux.HandleFunc("/export/", AuthWrap(apiServer.HandleExport))
	mux.HandleFunc("/crawl/", AuthWrap(apiServer.HandleCrawl))

	mux.Handle("/image/", http.StripPrefix("/image/", AuthWrap(imageProxyHandler)))

	mux.HandleFunc("/login/", loginHandler)
	mux.HandleFunc("/logout/", logoutHandler)
	mux.HandleFunc("/api/login", apiLoginHandler)
	mux.HandleFunc("/api/logout", apiLogoutHandler)
	mux.HandleFunc("/api/auth", apiAuthStatusHandler)

	// Removed default root handler for legacy UI

	return SecurityHeadersMiddleware(CSRFMiddleware(cfg, mux))
}

func Serve(cfg *config.Settings) {
	router := NewRouter(cfg)
	log.Fatal(http.ListenAndServe(":"+strconv.Itoa(cfg.Port), router))
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
	c := http.Cookie{Name: AuthCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true}
	http.SetCookie(w, &c)
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok"}`)
}

func generateRandomToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}

func CSRFMiddleware(cfg *config.Settings, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("csrf_token")
		var token string
		if err != nil {
			token = generateRandomToken(16)
			http.SetCookie(w, &http.Cookie{
				Name:     "csrf_token",
				Value:    token,
				Path:     "/",
				HttpOnly: false, // accessible by JS
				SameSite: http.SameSiteNoneMode,
				Secure:   cfg.SecureCookies,
			})
		} else {
			token = cookie.Value
		}

		if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodDelete {
			headerToken := r.Header.Get("X-CSRF-Token")
			if headerToken == "" || headerToken != token {
				http.Error(w, "CSRF token mismatch", http.StatusForbidden)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func SecurityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// Content-Security-Policy
		// default-src 'self'
		// style-src 'self' 'unsafe-inline' (for React/styled-components if used)
		// img-src 'self' data: * (RSS images can be from anywhere)
		// connect-src 'self' (API calls)
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: *; connect-src 'self'; frame-ancestors 'none';")
		next.ServeHTTP(w, r)
	})
}
