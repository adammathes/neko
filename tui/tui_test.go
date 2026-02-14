package tui

import (
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"adammathes.com/neko/config"
	"adammathes.com/neko/models"
	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	tea "github.com/charmbracelet/bubbletea"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	config.Config.DBFile = filepath.Join(t.TempDir(), "test.db")
	models.InitDB()
	t.Cleanup(func() {
		if models.DB != nil {
			models.DB.Close()
		}
	})
}

func seedData(t *testing.T) {
	t.Helper()
	f := &feed.Feed{Url: "http://example.com", Title: "Test Feed", Category: "tech"}
	f.Create()

	i := &item.Item{
		Title:  "Test Item",
		Url:    "http://example.com/1",
		FeedId: f.Id,
	}
	i.Create()
}

func TestNewModel(t *testing.T) {
	m := NewModel()
	if m.state != sidebarFocus {
		t.Errorf("Expected initial state sidebarFocus, got %v", m.state)
	}
}

func TestUpdateWindowSizeNoPanic(t *testing.T) {
	m := NewModel()
	msg := tea.WindowSizeMsg{Width: 80, Height: 24}
	newModel, _ := m.Update(msg)
	tm := newModel.(Model)
	if tm.width != 80 || tm.height != 24 {
		t.Errorf("Expected size 80x24, got %dx%d", tm.width, tm.height)
	}
	if !tm.ready {
		t.Error("Model should be ready after WindowSizeMsg")
	}
}

func TestStateTransitions(t *testing.T) {
	setupTestDB(t)
	m := NewModel()
	m1, _ := m.Update(tea.WindowSizeMsg{Width: 80, Height: 24})
	m = m1.(Model)

	// Feed loaded
	feeds := []*feed.Feed{{Id: 1, Title: "Test Feed"}}
	m2, _ := m.Update(feedsMsg(feeds))
	tm2 := m2.(Model)
	if len(tm2.feedData) != 1 {
		t.Fatal("Expected 1 feed")
	}

	// Items loaded
	items := []*item.Item{{Id: 1, Title: "Test Item", Description: "Desc"}}
	// Simulate switching to item focus via Enter (which triggers loadItems)
	// But explicitly setting state for unit test
	tm2.state = sidebarFocus // Ensure we are in sidebar
	// Update with itemsMsg
	m3, _ := tm2.Update(itemsMsg(items))
	tm3 := m3.(Model)

	// In the new implementation, loading items doesn't auto-switch focus unless logic says so.
	// But let's check if the items are populated.
	if len(tm3.itemData) != 1 {
		t.Fatal("Expected 1 item")
	}

	// Manually switch focus to items (simulating Tab or logic)
	tm3.state = itemFocus

	// Test entering content view
	// Needs selection first. In unit test, list selection might be 0 by default but items need to be set in list model.
	// The list model update happens in Update command usually, but here we just updated data.
	// We need to sync list items.
	// In Update(itemsMsg), we do `m.items.SetItems(...)`. So list should have items.

	// Select item 0
	tm3.items.Select(0)

	m4, _ := tm3.Update(tea.KeyMsg{Type: tea.KeyEnter})
	tm4m := m4.(Model)
	if tm4m.state != contentFocus {
		t.Errorf("Expected state contentFocus, got %v", tm4m.state)
	}
	if !strings.Contains(tm4m.content.View(), "Test Item") {
		t.Error("Expected content view to show item title")
	}

	// Back from content to items
	m5, _ := tm4m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})
	tm5m := m5.(Model)
	if tm5m.state != itemFocus {
		t.Errorf("Expected back to itemFocus, got %v", tm5m.state)
	}
}

func TestTuiCommands(t *testing.T) {
	setupTestDB(t)
	seedData(t)

	m := NewModel()
	cmd := m.Init()
	if cmd == nil {
		t.Fatal("Init should return a command")
	}

	msg := loadFeeds()
	feeds, ok := msg.(feedsMsg)
	if !ok || len(feeds) == 0 {
		t.Errorf("loadFeeds should return feedsMsg, got %T", msg)
	}

	msg2 := loadItems(feeds[0].Id)()
	_, ok = msg2.(itemsMsg)
	if !ok {
		t.Errorf("loadItems should return itemsMsg, got %T", msg2)
	}
}

func TestUpdateError(t *testing.T) {
	m := NewModel()
	msg := errMsg(fmt.Errorf("test error"))
	newModel, cmd := m.Update(msg)
	tm := newModel.(Model)
	if tm.err == nil {
		t.Error("Expected error to be set in model")
	}
	if cmd == nil {
		t.Error("Expected tea.Quit command (non-nil)")
	}
}

func TestSwitchFocus(t *testing.T) {
	m := NewModel()
	m.state = sidebarFocus

	// Tab to switch
	m1, _ := m.Update(tea.KeyMsg{Type: tea.KeyTab})
	if m1.(Model).state != itemFocus {
		t.Error("Tab from sidebar should go to itemFocus")
	}

	m2, _ := m1.Update(tea.KeyMsg{Type: tea.KeyTab})
	if m2.(Model).state != sidebarFocus {
		t.Error("Tab from itemFocus should go back to sidebarFocus")
	}
}

func TestView(t *testing.T) {
	m := NewModel()
	// Trigger WindowSizeMsg to make it ready and size components
	m1, _ := m.Update(tea.WindowSizeMsg{Width: 80, Height: 24})
	tm := m1.(Model)

	v := tm.View()
	// It should render "Feeds" and "Items" (titles of lists)
	if !strings.Contains(v, "Feeds") {
		t.Error("View should contain Feeds")
	}
	if !strings.Contains(v, "Items") {
		t.Error("View should contain Items")
	}
}
