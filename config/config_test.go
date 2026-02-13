package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInitEmpty(t *testing.T) {
	// Reset global
	Config = Settings{}

	err := Init("")
	if err != nil {
		t.Fatalf("Init with empty string should not error: %v", err)
	}

	// Defaults should be set
	if Config.DBFile != "neko.db" {
		t.Errorf("expected default DBFile 'neko.db', got %q", Config.DBFile)
	}
	if Config.Port != 4994 {
		t.Errorf("expected default Port 4994, got %d", Config.Port)
	}
	if Config.CrawlMinutes != 60 {
		t.Errorf("expected default CrawlMinutes 60, got %d", Config.CrawlMinutes)
	}
}

func TestInitWithValidFile(t *testing.T) {
	Config = Settings{}

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.yaml")
	content := []byte("database: test.db\nhttp: 8080\npassword: secret\nminutes: 30\nimageproxy: true\n")
	if err := os.WriteFile(configPath, content, 0644); err != nil {
		t.Fatal(err)
	}

	err := Init(configPath)
	if err != nil {
		t.Fatalf("Init should not error with valid file: %v", err)
	}

	if Config.DBFile != "test.db" {
		t.Errorf("expected DBFile 'test.db', got %q", Config.DBFile)
	}
	if Config.Port != 8080 {
		t.Errorf("expected Port 8080, got %d", Config.Port)
	}
	if Config.DigestPassword != "secret" {
		t.Errorf("expected password 'secret', got %q", Config.DigestPassword)
	}
	if Config.CrawlMinutes != 30 {
		t.Errorf("expected CrawlMinutes 30, got %d", Config.CrawlMinutes)
	}
	if !Config.ProxyImages {
		t.Error("expected ProxyImages true")
	}
}

func TestInitWithMissingFile(t *testing.T) {
	Config = Settings{}
	err := Init("/nonexistent/config.yaml")
	if err == nil {
		t.Fatal("Init with missing file should return error")
	}
}

func TestInitWithInvalidYAML(t *testing.T) {
	Config = Settings{}

	dir := t.TempDir()
	configPath := filepath.Join(dir, "bad.yaml")
	content := []byte("{{{{not valid yaml at all")
	if err := os.WriteFile(configPath, content, 0644); err != nil {
		t.Fatal(err)
	}

	err := Init(configPath)
	if err == nil {
		t.Fatal("Init with invalid YAML should return error")
	}
}

func TestAddDefaultsNoOverride(t *testing.T) {
	// When values are already set, addDefaults should not overwrite
	Config = Settings{
		DBFile:       "custom.db",
		Port:         9999,
		CrawlMinutes: 120,
	}
	addDefaults()

	if Config.DBFile != "custom.db" {
		t.Errorf("addDefaults should not override DBFile, got %q", Config.DBFile)
	}
	if Config.Port != 9999 {
		t.Errorf("addDefaults should not override Port, got %d", Config.Port)
	}
	if Config.CrawlMinutes != 120 {
		t.Errorf("addDefaults should not override CrawlMinutes, got %d", Config.CrawlMinutes)
	}
}

func TestReadConfigValid(t *testing.T) {
	Config = Settings{}

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.yaml")
	content := []byte("database: mydb.db\nhttp: 5000\n")
	if err := os.WriteFile(configPath, content, 0644); err != nil {
		t.Fatal(err)
	}

	err := readConfig(configPath)
	if err != nil {
		t.Fatalf("readConfig should not error: %v", err)
	}
	if Config.DBFile != "mydb.db" {
		t.Errorf("expected DBFile 'mydb.db', got %q", Config.DBFile)
	}
	if Config.Port != 5000 {
		t.Errorf("expected Port 5000, got %d", Config.Port)
	}
}
