package item

import (
	"strings"
	"testing"

	"adammathes.com/neko/models"
)

// H1: filterPolicy must strip javascript:, data:, vbscript:, file: and other
// dangerous URL schemes from href and src attributes.
func TestFilterPolicy_StripsDangerousURLSchemes(t *testing.T) {
	p := filterPolicy()

	cases := []struct {
		name    string
		input   string
		mustNot []string
	}{
		{
			name:    "javascript href",
			input:   `<a href="javascript:alert(1)">click</a>`,
			mustNot: []string{"javascript:"},
		},
		{
			name:    "JAVASCRIPT href uppercase",
			input:   `<a href="JAVASCRIPT:alert(1)">click</a>`,
			mustNot: []string{"javascript:", "JAVASCRIPT:"},
		},
		{
			name:    "javascript with whitespace",
			input:   `<a href=" javascript:alert(1)">click</a>`,
			mustNot: []string{"javascript:"},
		},
		{
			name:    "vbscript href",
			input:   `<a href="vbscript:msgbox(1)">click</a>`,
			mustNot: []string{"vbscript:"},
		},
		{
			name:    "data URI href",
			input:   `<a href="data:text/html,<script>alert(1)</script>">click</a>`,
			mustNot: []string{"data:"},
		},
		{
			name:    "file URI href",
			input:   `<a href="file:///etc/passwd">read</a>`,
			mustNot: []string{"file:"},
		},
		{
			name:    "javascript img src",
			input:   `<img src="javascript:alert(1)">`,
			mustNot: []string{"javascript:"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := p.Sanitize(tc.input)
			lc := strings.ToLower(got)
			for _, banned := range tc.mustNot {
				if strings.Contains(lc, strings.ToLower(banned)) {
					t.Errorf("policy left dangerous scheme %q in output: %q", banned, got)
				}
			}
		})
	}
}

// H1: filterPolicy must keep safe http/https/mailto schemes intact.
func TestFilterPolicy_KeepsSafeURLSchemes(t *testing.T) {
	p := filterPolicy()

	cases := []string{
		`<a href="https://example.com/x">ok</a>`,
		`<a href="http://example.com/y">ok</a>`,
		`<a href="mailto:user@example.com">mail</a>`,
		`<img src="https://example.com/pic.jpg" alt="pic">`,
	}

	for _, in := range cases {
		t.Run(in, func(t *testing.T) {
			out := p.Sanitize(in)
			if !strings.Contains(out, "<a") && !strings.Contains(out, "<img") {
				t.Errorf("safe URL stripped: in=%q out=%q", in, out)
			}
		})
	}
}

// H1: Item URL validation must reject non-http(s) schemes before storage.
func TestSafeURL_RejectsDangerousSchemes(t *testing.T) {
	dangerous := []string{
		"javascript:alert(1)",
		"JaVaScRiPt:alert(1)",
		" javascript:alert(1)",
		"\tjavascript:alert(1)",
		"vbscript:msgbox(1)",
		"data:text/html,<script>",
		"file:///etc/passwd",
		"about:blank",
	}
	for _, u := range dangerous {
		t.Run(u, func(t *testing.T) {
			if SafeURL(u) {
				t.Errorf("SafeURL(%q) returned true, want false", u)
			}
		})
	}
}

func TestSafeURL_AcceptsSafeURLs(t *testing.T) {
	safe := []string{
		"http://example.com",
		"https://example.com/path?x=1",
		"https://example.com/",
		"mailto:user@example.com",
	}
	for _, u := range safe {
		t.Run(u, func(t *testing.T) {
			if !SafeURL(u) {
				t.Errorf("SafeURL(%q) returned false, want true", u)
			}
		})
	}
}

// H1: After Filter() reads from DB, an item URL that is a javascript: URL
// must be sanitized to empty (or http(s)) so it cannot be rendered as a link.
func TestFilter_SanitizesItemURL(t *testing.T) {
	setupTestDB(t)
	feedId := createTestFeed(t)

	// Insert raw javascript: URL directly into the DB (simulating
	// a legacy row, or bypass of NewFeed validation).
	_, err := models.DB.Exec(
		`INSERT INTO item(title, url, description, publish_date, feed_id, read_state, starred)
		 VALUES(?, ?, ?, ?, ?, ?, ?)`,
		"x", "javascript:alert(1)", "desc", "2024-01-01 00:00:00", feedId, 0, 0,
	)
	if err != nil {
		t.Fatal(err)
	}

	items, err := Filter(0, nil, "", false, false, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("want 1 item, got %d", len(items))
	}
	if strings.Contains(strings.ToLower(items[0].Url), "javascript:") {
		t.Errorf("Filter must strip javascript: URLs; got Url=%q", items[0].Url)
	}
}
