package models

import (
	"path/filepath"
	"testing"

	"adammathes.com/neko/config"
)

func TestInitDB(t *testing.T) {
	config.Config.DBFile = ":memory:"
	InitDB()
	defer DB.Close()

	if DB == nil {
		t.Fatal("DB should not be nil after InitDB")
	}

	err := DB.Ping()
	if err != nil {
		t.Fatalf("DB.Ping() should succeed: %v", err)
	}

	// Verify schema was created by checking tables exist
	var name string
	err = DB.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='feed'").Scan(&name)
	if err != nil {
		t.Fatalf("feed table should exist: %v", err)
	}

	err = DB.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='item'").Scan(&name)
	if err != nil {
		t.Fatalf("item table should exist: %v", err)
	}
}

func TestInitDBError(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("InitDB should panic for invalid DB file")
		}
	}()
	// Using a directory path instead of a file should cause a failure in Ping
	config.Config.DBFile = t.TempDir()
	InitDB()
}

// SetupTestDB initializes an isolated SQLite database for testing.
func SetupTestDB(t *testing.T) {
	t.Helper()
	config.Config.DBFile = filepath.Join(t.TempDir(), "test.db")
	InitDB()
	t.Cleanup(func() {
		if DB != nil {
			DB.Close()
		}
	})
}
