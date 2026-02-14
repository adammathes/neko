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
	"github.com/charmbracelet/bubbles/list"
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
	if m.state != viewFeeds {
		t.Errorf("Expected initial state viewFeeds, got %v", m.state)
	}
}

func TestUpdateWindowSizeNoPanic(t *testing.T) {
	m := NewModel()
	// This should not panic even if lists are empty
	msg := tea.WindowSizeMsg{Width: 80, Height: 24}
	newModel, _ := m.Update(msg)
	tm := newModel.(Model)
	if tm.width != 80 || tm.height != 24 {
		t.Errorf("Expected size 80x24, got %dx%d", tm.width, tm.height)
	}
}

func TestStateTransitions(t *testing.T) {
	m := NewModel()
	m1, _ := m.Update(tea.WindowSizeMsg{Width: 80, Height: 24})
	m = m1.(Model)

	// Feed loaded
	feeds := []*feed.Feed{{Id: 1, Title: "Test Feed"}}
	m2, _ := m.Update(feedsMsg(feeds))
	tm2 := m2.(Model)
	if len(tm2.feeds) != 1 {
		t.Fatal("Expected 1 feed")
	}

	// Items loaded
	items := []*item.Item{{Id: 1, Title: "Test Item", Description: "Desc"}}
	tm2.selectedFeed = feeds[0] // Simulate selection
	m3, _ := tm2.Update(itemsMsg(items))
	tm3 := m3.(Model)
	if tm3.state != viewItems {
		t.Errorf("Expected state viewItems, got %v", tm3.state)
	}
	if len(tm3.items) != 1 {
		t.Fatal("Expected 1 item")
	}

	// Back to feeds
	m4, _ := tm3.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})
	tm4 := m4.(Model)
	if tm4.state != viewFeeds {
		t.Errorf("Expected back to viewFeeds, got %v", tm4.state)
	}

	// Test entering content view
	tm5, _ := tm3.Update(tea.KeyMsg{Type: tea.KeyEnter})
	tm5m := tm5.(Model)
	if tm5m.state != viewContent {
		t.Errorf("Expected state viewContent, got %v", tm5m.state)
	}
	if !strings.Contains(tm5m.contentView.View(), "Test Item") {
		t.Error("Expected content view to show item title")
	}

	// Back from content to items
	tm6, _ := tm5.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})
	tm6m := tm6.(Model)
	if tm6m.state != viewItems {
		t.Errorf("Expected back to viewItems, got %v", tm6m.state)
	}

	// Test View for all states
	if v := m.View(); !strings.Contains(v, "NEKO TUI") {
		t.Error("View should contain title")
	}
	if v := tm2.View(); !strings.Contains(v, "Feeds") {
		t.Error("View should contain Feeds list")
	}
	if v := tm3.View(); !strings.Contains(v, "Items") && !strings.Contains(v, "Test Feed") {
		t.Error("View should contain Items list or Feed title")
	}
	if v := tm5m.View(); !strings.Contains(v, "Test Item") {
		t.Error("View should contain Item title in content view")
	}

	// Test scrolling in content view
	// Scroll down
	tmS1, _ := tm5m.Update(tea.KeyMsg{Type: tea.KeyDown})
	// Home/End
	tmS2, _ := tmS1.(Model).Update(tea.KeyMsg{Type: tea.KeyEnd})
	tmS3, _ := tmS2.(Model).Update(tea.KeyMsg{Type: tea.KeyHome})

	if tmS3.(Model).state != viewContent {
		t.Errorf("Should stay in viewContent, got %v", tmS3.(Model).state)
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

func TestItemString(t *testing.T) {
	is := itemString("hello")
	if is.FilterValue() != "hello" {
		t.Errorf("Expected 'hello', got %s", is.FilterValue())
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

func TestUpdateCtrlC(t *testing.T) {
	m := NewModel()
	msg := tea.KeyMsg{Type: tea.KeyCtrlC}
	_, cmd := m.Update(msg)
	if cmd == nil {
		t.Error("Expected tea.Quit command")
	}
}

func TestViewError(t *testing.T) {
	m := NewModel()
	m.err = fmt.Errorf("fatal error")
	v := m.View()
	if !strings.Contains(v, "Error: fatal error") {
		t.Errorf("Expected view to show error, got %q", v)
	}
}

func TestUpdateEscNotFeeds(t *testing.T) {
	m := NewModel()
	m.state = viewItems
	m1, _ := m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	if m1.(Model).state != viewFeeds {
		t.Error("Esc in viewItems should go to viewFeeds")
	}
}

func TestLoadFeedsError(t *testing.T) {
	setupTestDB(t)
	models.DB.Close()
	msg := loadFeeds()
	if _, ok := msg.(errMsg); !ok {
		t.Errorf("Expected errMsg on DB close, got %T", msg)
	}
}

func TestLoadItemsError(t *testing.T) {
	setupTestDB(t)
	models.DB.Close()
	msg := loadItems(1)()
	if _, ok := msg.(errMsg); !ok {
		t.Errorf("Expected errMsg on DB close, got %T", msg)
	}
}

func TestUpdateItemsMsg(t *testing.T) {
	m := NewModel()
	msg := itemsMsg([]*item.Item{{Title: "Test Item"}})
	m1, _ := m.Update(msg)
	tm := m1.(Model)
	if tm.state != viewItems {
		t.Errorf("Expected state viewItems, got %v", tm.state)
	}
	if len(tm.items) != 1 {
		t.Errorf("Expected 1 item, got %d", len(tm.items))
	}
}

func TestUpdateEnterItems(t *testing.T) {
	m := NewModel()
	m.state = viewItems
	m.items = []*item.Item{{Title: "Test Item", Description: "Content"}}
	m.itemList = list.New([]list.Item{itemString("Test Item")}, list.NewDefaultDelegate(), 0, 0)

	m1, _ := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	tm := m1.(Model)
	if tm.state != viewContent {
		t.Errorf("Expected state viewContent, got %v", tm.state)
	}
}

func TestUpdateTuiMoreKeys(t *testing.T) {
	m := NewModel()

	// Test 'q'
	_, cmd := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})
	if cmd == nil {
		t.Error("Expected Quit command for 'q'")
	}

	// Test 'r'
	_, cmd = m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("r")})
	if cmd == nil {
		t.Error("Expected loadFeeds command for 'r'")
	}

	// Test 'esc' when already at viewFeeds
	m.state = viewFeeds
	m3, _ := m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	if m3.(Model).state != viewFeeds {
		t.Error("Esc at viewFeeds should keep viewFeeds")
	}
}
