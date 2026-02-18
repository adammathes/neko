package safehttp

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
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

func SafeDialer(dialer *net.Dialer) func(context.Context, string, string) (net.Conn, error) {
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		host, _, err := net.SplitHostPort(address)
		if err != nil {
			host = address
		}

		if ip := net.ParseIP(host); ip != nil {
			if isPrivateIP(ip) {
				return nil, fmt.Errorf("connection to private IP %s is not allowed", ip)
			}
		} else {
			ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
			if err != nil {
				return nil, err
			}

			for _, ip := range ips {
				if isPrivateIP(ip) {
					return nil, fmt.Errorf("connection to private IP %s is not allowed", ip)
				}
			}
		}

		return dialer.DialContext(ctx, network, address)
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

	// Disable HTTP/2 to avoid "unhandled response frame type" errors from servers with
	// non-standard HTTP/2 implementations, which is common among various RSS feed hosts.
	transport.ForceAttemptHTTP2 = false
	transport.TLSNextProto = make(map[string]func(string, *tls.Conn) http.RoundTripper)

	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
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
