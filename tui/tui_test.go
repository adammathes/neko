package tui

import (
	"testing"

	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	tea "github.com/charmbracelet/bubbletea"
)

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
}
