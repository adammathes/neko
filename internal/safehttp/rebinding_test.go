package safehttp

import (
	"context"
	"net"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// rebindingResolver returns a public IP on the first lookup and a private IP
// on subsequent lookups. This simulates a DNS rebinding attack where the
// attacker's nameserver flips the answer between the safety-check lookup and
// the actual dial.
type rebindingResolver struct {
	calls    int32
	firstIP  net.IP
	laterIP  net.IP
}

func (r *rebindingResolver) Resolve(_ context.Context, _ string) []net.IPAddr {
	n := atomic.AddInt32(&r.calls, 1)
	if n == 1 {
		return []net.IPAddr{{IP: r.firstIP}}
	}
	return []net.IPAddr{{IP: r.laterIP}}
}

// H3: TOCTOU DNS rebinding. The SafeDialer must not be tricked by a resolver
// that returns a public IP for the safety check and a private IP for the
// actual dial. The fix is to dial the resolved IP directly, not the
// original hostname.
func TestSafeDialer_DNSRebindingTOCTOU(t *testing.T) {
	// We can't easily plug a fake resolver into net.DefaultResolver,
	// so instead we verify the behavioral contract: SafeDialer must
	// connect to the IP it validated, not redo DNS resolution.
	//
	// Strategy: configure a Dialer whose Resolver returns *only* a
	// private IP. After SafeDialer's first lookup says "public, OK"
	// (we use a hostname that resolves publicly), the dial must
	// either (a) connect to the validated public IP, or (b) re-check
	// using the same resolver — but it must NOT silently dial the
	// private IP that a malicious resolver provides on the second hit.

	orig := AllowLocal
	AllowLocal = false
	defer func() { AllowLocal = orig }()

	// Use a hostname that we know resolves; combined with a Dialer
	// that uses a different resolver, we can observe whether the
	// re-lookup happens.
	dialer := &net.Dialer{
		Timeout: 2 * time.Second,
		Resolver: &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				// Refuse all DNS — if the dialer re-resolves we'll
				// see an error mentioning DNS, which proves the
				// dialer wasn't told to use the validated IP.
				return nil, &net.DNSError{
					Err:  "resolver disabled in test",
					Name: address,
				}
			},
		},
	}
	safeDial := SafeDialer(dialer)

	// Use a host that will resolve through the system resolver in
	// SafeDialer's validation step. example.com is a public host.
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := safeDial(ctx, "tcp", "example.com:80")
	if err == nil {
		// A successful connection here would actually be unexpected
		// (the test environment may not have outbound); but the
		// important thing is that we did not dial the wrong IP.
		return
	}

	// If we get a DNS error here it means the dialer re-resolved
	// using its (disabled) resolver — which is exactly the
	// TOCTOU bug. The fix passes the validated IP to DialContext
	// so the dialer's resolver isn't consulted.
	if strings.Contains(err.Error(), "resolver disabled in test") {
		t.Fatalf("SafeDialer re-resolved hostname instead of dialing validated IP (TOCTOU): %v", err)
	}
}

// Even more direct: after a successful safety check, the dialed address
// passed to net.Dialer.DialContext must be an IP literal, not the original
// hostname.
func TestSafeDialer_DialsValidatedIPLiteral(t *testing.T) {
	orig := AllowLocal
	AllowLocal = false
	defer func() { AllowLocal = orig }()

	var dialed string
	wrappedDialer := &recordingDialer{
		inner: &net.Dialer{Timeout: 1 * time.Second},
		seen:  &dialed,
	}

	safeDial := safeDialerWith(wrappedDialer.dialContext)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Use a host with a likely-public A record. The dial itself
	// will probably fail (we don't really want to connect to port 1)
	// but we only care what address was passed to the dialer.
	_, _ = safeDial(ctx, "tcp", "example.com:1")

	if dialed == "" {
		t.Skip("dial was never invoked (DNS unavailable in test env)")
	}
	host, _, err := net.SplitHostPort(dialed)
	if err != nil {
		t.Fatalf("dialed address not host:port: %q", dialed)
	}
	if net.ParseIP(host) == nil {
		t.Errorf("SafeDialer must pass an IP literal to the inner dialer, got hostname %q", host)
	}
}

type recordingDialer struct {
	inner *net.Dialer
	seen  *string
}

func (r *recordingDialer) dialContext(ctx context.Context, network, address string) (net.Conn, error) {
	*r.seen = address
	return r.inner.DialContext(ctx, network, address)
}
