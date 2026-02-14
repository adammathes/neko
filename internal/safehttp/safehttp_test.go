package safehttp

import (
	"net"
	"testing"
	"time"
)

func TestSafeClient(t *testing.T) {
	client := NewSafeClient(2 * time.Second)

	// Localhost should fail
	t.Log("Testing localhost...")
	_, err := client.Get("http://127.0.0.1:8080")
	if err == nil {
		t.Error("Expected error for localhost request, got nil")
	} else {
		t.Logf("Got expected error: %v", err)
	}

	// Private IP should fail
	t.Log("Testing private IP...")
	_, err = client.Get("http://10.0.0.1")
	if err == nil {
		t.Error("Expected error for private IP request, got nil")
	} else {
		t.Logf("Got expected error: %v", err)
	}
}

func TestIsPrivateIP(t *testing.T) {
	tests := []struct {
		ip       string
		expected bool
	}{
		{"127.0.0.1", true},
		{"10.0.0.1", true},
		{"172.16.0.1", true},
		{"192.168.1.1", true},
		{"169.254.1.1", true},
		{"8.8.8.8", false},
		{"1.1.1.1", false},
		{"::1", true},
		{"fe80::1", true},
		{"fc00::1", true},
	}

	for _, tc := range tests {
		if res := isPrivateIP(net.ParseIP(tc.ip)); res != tc.expected {
			t.Errorf("isPrivateIP(%s) = %v, want %v", tc.ip, res, tc.expected)
		}
	}
}
