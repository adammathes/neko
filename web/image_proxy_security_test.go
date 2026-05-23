package web

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// H4: SVG content cannot be rendered in our origin by the image proxy.
// SVG can contain <script> blocks that execute when navigated to as a
// top-level document. The proxy must either reject image/svg+xml outright
// or force it to be downloaded (Content-Disposition: attachment) and never
// served with an SVG-rendering content-type.
func TestImageProxy_RejectsSVG(t *testing.T) {
	cases := []string{
		"image/svg+xml",
		"image/svg+xml; charset=utf-8",
		"IMAGE/SVG+XML",
	}

	for _, ct := range cases {
		t.Run(ct, func(t *testing.T) {
			imgServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", ct)
				w.WriteHeader(http.StatusOK)
				w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`))
			}))
			defer imgServer.Close()

			encoded := base64.URLEncoding.EncodeToString([]byte(imgServer.URL + "/x.svg"))
			req := httptest.NewRequest("GET", "/"+encoded, nil)
			req.URL = &url.URL{Path: encoded}
			rr := httptest.NewRecorder()
			imageProxyHandler(rr, req)

			respCT := rr.Header().Get("Content-Type")
			if strings.Contains(strings.ToLower(respCT), "svg") {
				t.Errorf("image proxy returned SVG content-type %q; must reject or rewrite", respCT)
			}
			// Either the status is 4xx (rejected) or content-type was rewritten
			// to a non-rendering type. Both are acceptable; SVG MIME passthrough is not.
			if rr.Code == http.StatusOK && strings.Contains(strings.ToLower(respCT), "svg") {
				t.Errorf("SVG was passed through with status 200 and SVG content-type: %q", respCT)
			}
		})
	}
}

// H4: Non-image content-types must be rejected.
func TestImageProxy_RejectsNonImageContent(t *testing.T) {
	imgServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`<html><body><script>alert(1)</script></body></html>`))
	}))
	defer imgServer.Close()

	encoded := base64.URLEncoding.EncodeToString([]byte(imgServer.URL + "/x.html"))
	req := httptest.NewRequest("GET", "/"+encoded, nil)
	req.URL = &url.URL{Path: encoded}
	rr := httptest.NewRecorder()
	imageProxyHandler(rr, req)

	if rr.Code == http.StatusOK {
		t.Errorf("image proxy must not return 200 for non-image content; got status %d body=%q", rr.Code, rr.Body.String())
	}
}

// H4 (related): CSP must not include 'unsafe-eval' which materially weakens
// the script-src directive and isn't needed for the production Vite bundle.
func TestSecurityHeaders_NoUnsafeEval(t *testing.T) {
	handler := SecurityHeadersMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	csp := rr.Header().Get("Content-Security-Policy")
	if strings.Contains(csp, "'unsafe-eval'") {
		t.Errorf("CSP should not include 'unsafe-eval'; got: %s", csp)
	}
}
