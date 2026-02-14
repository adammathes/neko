package vlog

import (
	"bytes"
	"fmt"
	"os"
	"testing"
)

func captureStdout(f func()) string {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	f()

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	buf.ReadFrom(r)
	return buf.String()
}

func TestPrintfVerbose(t *testing.T) {
	VERBOSE = true
	defer func() { VERBOSE = false }()

	output := captureStdout(func() {
		Printf("hello %s", "world")
	})
	expected := fmt.Sprintf("hello %s", "world")
	if output != expected {
		t.Errorf("expected %q, got %q", expected, output)
	}
}

func TestPrintfSilent(t *testing.T) {
	VERBOSE = false

	output := captureStdout(func() {
		Printf("hello %s", "world")
	})
	if output != "" {
		t.Errorf("expected empty output when not verbose, got %q", output)
	}
}

func TestPrintlnVerbose(t *testing.T) {
	VERBOSE = true
	defer func() { VERBOSE = false }()

	output := captureStdout(func() {
		Println("hello", "world")
	})
	expected := fmt.Sprintln("hello", "world")
	if output != expected {
		t.Errorf("expected %q, got %q", expected, output)
	}
}

func TestPrintlnSilent(t *testing.T) {
	VERBOSE = false

	output := captureStdout(func() {
		Println("hello", "world")
	})
	if output != "" {
		t.Errorf("expected empty output when not verbose, got %q", output)
	}
}

func TestInit(t *testing.T) {
	// init() sets VERBOSE to false
	if VERBOSE != false {
		t.Error("VERBOSE should default to false")
	}
}
