package main

import (
	"os"
	"path/filepath"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
)

func TestRunHelp(t *testing.T) {
	err := Run([]string{"--help"})
	if err != nil {
		t.Errorf("Run(--help) should not error, got %v", err)
	}
}

func TestRunInvalidFlag(t *testing.T) {
	err := Run([]string{"--invalid"})
	if err == nil {
		t.Error("Run(--invalid) should error")
	}
}

func TestRunCrawl(t *testing.T) {
	// Setup test DB
	config.Config.DBFile = filepath.Join(t.TempDir(), "test_main.db")
	models.InitDB()
	defer models.DB.Close()

	// Use --update flag
	err := Run([]string{"-u", "-d", config.Config.DBFile})
	if err != nil {
		t.Errorf("Run(-u) should not error, got %v", err)
	}
}

func TestBackgroundCrawlZero(t *testing.T) {
	backgroundCrawl(0) // Should return immediately
}

func TestRunServerConfig(t *testing.T) {
	// Setup test DB
	config.Config.DBFile = filepath.Join(t.TempDir(), "test_main_server.db")
	models.InitDB()
	defer models.DB.Close()

	// Use config.Config.Port = -1 to signal Run to exit instead of starting server
	config.Config.Port = -1
	err := Run([]string{"-d", config.Config.DBFile})
	if err != nil {
		t.Errorf("Run should not error with Port=-1, got %v", err)
	}
}

func TestRunAdd(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_add.db")
	err := Run([]string{"-d", dbPath, "-a", "http://example.com/rss"})
	if err != nil {
		t.Errorf("Run -a failed: %v", err)
	}
}

func TestRunExport(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_export.db")
	err := Run([]string{"-d", dbPath, "-x", "text"})
	if err != nil {
		t.Errorf("Run -x failed: %v", err)
	}
}

func TestRunOptions(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_options.db")
	err := Run([]string{"-d", dbPath, "-v", "-i", "-s", "-1"})
	if err != nil {
		t.Errorf("Run with options failed: %v", err)
	}
}

func TestRunSetPassword(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_pass.db")
	err := Run([]string{"-d", dbPath, "-p", "newpassword"})
	if err != nil {
		t.Errorf("Run -p should succeed, got %v", err)
	}
	if config.Config.DigestPassword != "newpassword" {
		t.Errorf("Expected password to be updated")
	}
}

func TestRunConfigError(t *testing.T) {
	err := Run([]string{"-c", "/nonexistent/config.yaml"})
	if err == nil {
		t.Error("Run should error for nonexistent config file")
	}
}

func TestRunExportFormat(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_export_format.db")
	err := Run([]string{"-d", dbPath, "-x", "json"})
	if err != nil {
		t.Errorf("Run -x json failed: %v", err)
	}
}

func TestRunConfigInvalidContent(t *testing.T) {
	tmpDir := t.TempDir()
	confPath := filepath.Join(tmpDir, "bad.yaml")
	os.WriteFile(confPath, []byte("invalid: : yaml"), 0644)
	err := Run([]string{"-c", confPath})
	if err == nil {
		t.Error("Run should error for malformed config file")
	}
}

func TestRunNoArgs(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_noargs.db")
	config.Config.Port = -1
	err := Run([]string{"-d", dbPath})
	if err != nil {
		t.Errorf("Run with no args failed: %v", err)
	}
}
