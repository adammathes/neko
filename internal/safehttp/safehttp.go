package safehttp

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

var (
	privateIPBlocks []*net.IPNet
	AllowLocal      bool // For testing
)

func init() {
	for _, cidr := range []string{
		"127.0.0.0/8",    // IPv4 loopback
		"10.0.0.0/8",     // RFC1918
		"172.16.0.0/12",  // RFC1918
		"192.168.0.0/16", // RFC1918
		"169.254.0.0/16", // IPv4 link-local
		"::1/128",        // IPv6 loopback
		"fe80::/10",      // IPv6 link-local
		"fc00::/7",       // IPv6 unique local addr
	} {
		_, block, _ := net.ParseCIDR(cidr)
		privateIPBlocks = append(privateIPBlocks, block)
	}
}

func isPrivateIP(ip net.IP) bool {
	if AllowLocal {
		return false
	}
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}
	for _, block := range privateIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

// dialFunc is the minimal interface SafeDialer needs from a *net.Dialer.
type dialFunc func(ctx context.Context, network, address string) (net.Conn, error)

// SafeDialer returns a DialContext that resolves the destination hostname,
// rejects any private/loopback/link-local IP, and then dials the validated
// IP literal directly. Passing an IP literal — instead of the original
// hostname — prevents a DNS rebinding TOCTOU bypass where a malicious
// nameserver returns a public IP for the safety check and a private IP
// for the actual dial.
func SafeDialer(dialer *net.Dialer) dialFunc {
	return safeDialerWith(dialer.DialContext)
}

func safeDialerWith(dial dialFunc) dialFunc {
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			host = address
			port = ""
		}

		// IP literal: validate and dial as-is.
		if ip := net.ParseIP(host); ip != nil {
			if isPrivateIP(ip) {
				return nil, fmt.Errorf("connection to private IP %s is not allowed", ip)
			}
			return dial(ctx, network, address)
		}

		// Hostname: resolve, validate every returned IP, then pick
		// one and dial the IP literal so the inner dialer cannot
		// be tricked into re-resolving to a different address.
		ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
		if err != nil {
			return nil, err
		}
		if len(ips) == 0 {
			return nil, fmt.Errorf("no addresses resolved for %s", host)
		}
		for _, ip := range ips {
			if isPrivateIP(ip) {
				return nil, fmt.Errorf("connection to private IP %s is not allowed", ip)
			}
		}

		// Try each validated IP in order until one connects.
		var lastErr error
		for _, ip := range ips {
			target := ip.String()
			if port != "" {
				target = net.JoinHostPort(ip.String(), port)
			}
			conn, derr := dial(ctx, network, target)
			if derr == nil {
				return conn, nil
			}
			lastErr = derr
		}
		return nil, lastErr
	}
}

func NewSafeClient(timeout time.Duration) *http.Client {
	dialer := &net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.DialContext = SafeDialer(dialer)
	transport.Proxy = nil // Disable proxy to ensure SSRF checks are not bypassed

	return &http.Client{
		Timeout:   timeout,
		Transport: &H2FallbackTransport{Transport: transport},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("too many redirects")
			}

			host, _, err := net.SplitHostPort(req.URL.Host)
			if err != nil {
				host = req.URL.Host
			}

			if ip := net.ParseIP(host); ip != nil {
				if isPrivateIP(ip) {
					return fmt.Errorf("redirect to private IP %s is not allowed", ip)
				}
			} else {
				ips, err := net.DefaultResolver.LookupIP(req.Context(), "ip", host)
				if err != nil {
					return err
				}

				for _, ip := range ips {
					if isPrivateIP(ip) {
						return fmt.Errorf("redirect to private IP %s is not allowed", ip)
					}
				}
			}
			return nil
		},
	}
}

// H2FallbackTransport wraps an *http.Transport and retries failed requests with HTTP/1.1
// if an HTTP/2 protocol error is detected. This is useful for crawling external feeds
// where some servers may have buggy HTTP/2 implementations.
type H2FallbackTransport struct {
	Transport *http.Transport
}

func (t *H2FallbackTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := t.Transport.RoundTrip(req)
	if err != nil && isHTTP2Error(err) && (req.Method == "GET" || req.Method == "HEAD" || req.Body == nil) {
		// Clone the transport and disable HTTP/2 for the retry
		h1Transport := t.Transport.Clone()
		h1Transport.TLSNextProto = make(map[string]func(string, *tls.Conn) http.RoundTripper)
		h1Transport.ForceAttemptHTTP2 = false
		return h1Transport.RoundTrip(req)
	}
	return resp, err
}

func isHTTP2Error(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "http2") ||
		strings.Contains(msg, "stream error") ||
		strings.Contains(msg, "goaway") ||
		strings.Contains(msg, "protocol")
}
