package tui

import (
	"fmt"
	"strings"

	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
)

type viewState int

const (
	viewFeeds viewState = iota
	viewItems
	viewContent
)

type itemString string

func (i itemString) FilterValue() string { return string(i) }

type Model struct {
	state        viewState
	feedList     list.Model
	itemList     list.Model
	contentView  viewport.Model
	feeds        []*feed.Feed
	items        []*item.Item
	selectedFeed *feed.Feed
	selectedItem *item.Item
	err          error
	width        int
	height       int
}

func NewModel() Model {
	m := Model{
		state: viewFeeds,
	}
	// Initialize lists and viewport with empty items to avoid nil dereference
	m.feedList = list.New([]list.Item{}, list.NewDefaultDelegate(), 0, 0)
	m.itemList = list.New([]list.Item{}, list.NewDefaultDelegate(), 0, 0)
	m.contentView = viewport.New(0, 0)
	return m
}

func (m Model) Init() tea.Cmd {
	return loadFeeds
}

type (
	feedsMsg []*feed.Feed
	itemsMsg []*item.Item
	errMsg   error
)

func loadFeeds() tea.Msg {
	feeds, err := feed.All()
	if err != nil {
		return errMsg(err)
	}
	return feedsMsg(feeds)
}

func loadItems(feedID int64) tea.Cmd {
	return func() tea.Msg {
		items, err := item.Filter(0, feedID, "", false, false, 0, "")
		if err != nil {
			return errMsg(err)
		}
		return itemsMsg(items)
	}
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.feedList.SetSize(msg.Width, msg.Height-4)
		m.itemList.SetSize(msg.Width, msg.Height-4)
		m.contentView.Width = msg.Width - 4
		m.contentView.Height = msg.Height - 8

	case feedsMsg:
		m.feeds = msg
		items := make([]list.Item, len(m.feeds))
		for i, f := range m.feeds {
			items[i] = itemString(f.Title)
		}
		m.feedList = list.New(items, list.NewDefaultDelegate(), m.width, m.height-4)
		m.feedList.Title = "Feeds"

	case itemsMsg:
		m.items = msg
		items := make([]list.Item, len(m.items))
		for i, it := range m.items {
			items[i] = itemString(it.Title)
		}
		m.itemList = list.New(items, list.NewDefaultDelegate(), m.width, m.height-4)
		if m.selectedFeed != nil {
			m.itemList.Title = m.selectedFeed.Title
		} else {
			m.itemList.Title = "Items"
		}
		m.state = viewItems

	case errMsg:
		m.err = msg
		return m, tea.Quit

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit

		case "q", "esc":
			if m.state == viewFeeds {
				return m, tea.Quit
			}
			if m.state == viewItems {
				m.state = viewFeeds
			} else {
				m.state = viewItems
			}

		case "r":
			if m.state == viewFeeds {
				return m, loadFeeds
			}

		case "enter":
			if m.state == viewFeeds {
				idx := m.feedList.Index()
				if idx >= 0 && idx < len(m.feeds) {
					m.selectedFeed = m.feeds[idx]
					return m, loadItems(m.selectedFeed.Id)
				}
			} else if m.state == viewItems {
				idx := m.itemList.Index()
				if idx >= 0 && idx < len(m.items) {
					m.selectedItem = m.items[idx]

					content := fmt.Sprintf("%s\n\n%s",
						HeaderStyle.Render(m.selectedItem.Title),
						m.selectedItem.Description)

					m.contentView.SetContent(content)
					m.contentView.YPosition = 0
					m.state = viewContent
				}
			}
		}
	}

	if m.state == viewFeeds {
		m.feedList, cmd = m.feedList.Update(msg)
	} else if m.state == viewItems {
		m.itemList, cmd = m.itemList.Update(msg)
	} else if m.state == viewContent {
		m.contentView, cmd = m.contentView.Update(msg)
	}

	return m, cmd
}

func (m Model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v", m.err)
	}

	var s strings.Builder
	s.WriteString(TitleStyle.Render("NEKO TUI") + "\n\n")

	switch m.state {
	case viewFeeds:
		s.WriteString(m.feedList.View())
	case viewItems:
		s.WriteString(m.itemList.View())
	case viewContent:
		if m.selectedItem != nil {
			s.WriteString(m.contentView.View() + "\n")
			s.WriteString(StatusStyle.Render("Press 'q' or 'esc' to go back | j/k or arrows to scroll"))
		}
	}

	return s.String()
}

func Run() error {
	p := tea.NewProgram(NewModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		return err
	}
	return nil
}
