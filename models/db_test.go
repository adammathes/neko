package models

import (
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

// SetupTestDB initializes an in-memory SQLite database for testing.
// Call this from other packages' tests to get a working DB.
func SetupTestDB(t *testing.T) {
	t.Helper()
	config.Config.DBFile = ":memory:"
	InitDB()
	t.Cleanup(func() {
		if DB != nil {
			DB.Close()
		}
	})
}
