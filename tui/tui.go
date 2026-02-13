package tui

import (
	"fmt"
	"strings"

	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
)

type viewState int

const (
	viewFeeds viewState = iota
	viewItems
	viewContent
)

type itemDelegate struct{}

func (d itemDelegate) Height() int                               { return 1 }
func (d itemDelegate) Spacing() int                              { return 0 }
func (d itemDelegate) Update(msg tea.Msg, m *list.Model) tea.Cmd { return nil }
func (d itemDelegate) Render(w strings.Builder, m list.Model, index int, listItem list.Item) {
	str, ok := listItem.(itemString)
	if !ok {
		return
	}

	if index == m.Index() {
		fmt.Fprint(&w, SelectedItemStyle.Render(string(str)))
	} else {
		fmt.Fprint(&w, ItemStyle.Render(string(str)))
	}
}

type itemString string

func (i itemString) FilterValue() string { return string(i) }

type Model struct {
	state        viewState
	feedList     list.Model
	itemList     list.Model
	feeds        []*feed.Feed
	items        []*item.Item
	selectedFeed *feed.Feed
	selectedItem *item.Item
	err          error
	width        int
	height       int
}

func NewModel() Model {
	return Model{
		state: viewFeeds,
	}
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
		m.itemList.Title = m.selectedFeed.Title
		m.state = viewItems

	case errMsg:
		m.err = msg
		return m, tea.Quit

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			if m.state == viewFeeds {
				return m, tea.Quit
			}
			if m.state == viewItems {
				m.state = viewFeeds
			} else {
				m.state = viewItems
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
					m.state = viewContent
				}
			}
		}
	}

	if m.state == viewFeeds {
		m.feedList, cmd = m.feedList.Update(msg)
	} else if m.state == viewItems {
		m.itemList, cmd = m.itemList.Update(msg)
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
			s.WriteString(HeaderStyle.Render(m.selectedItem.Title) + "\n")
			s.WriteString(ContentStyle.Render(m.selectedItem.Description) + "\n\n")
			s.WriteString(StatusStyle.Render("Press 'q' or 'esc' to go back"))
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
