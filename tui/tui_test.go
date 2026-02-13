package tui

import (
	"strings"
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
}
