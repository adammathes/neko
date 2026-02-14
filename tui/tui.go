package tui

import (
	"fmt"

	"adammathes.com/neko/models/feed"
	"adammathes.com/neko/models/item"
	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type sessionState int

const (
	sidebarFocus sessionState = iota
	itemFocus
	contentFocus
)

// itemString implements list.Item
type itemString string

func (i itemString) FilterValue() string { return string(i) }

type Model struct {
	state   sessionState
	sidebar list.Model
	items   list.Model
	content viewport.Model

	feedData []*feed.Feed
	itemData []*item.Item

	selectedFeed *feed.Feed
	selectedItem *item.Item

	width  int
	height int
	err    error

	ready bool
}

func NewModel() Model {
	// sidebar
	s := list.New([]list.Item{}, list.NewDefaultDelegate(), 0, 0)
	s.Title = "Feeds"
	s.SetShowHelp(false)
	s.DisableQuitKeybindings()

	// items
	i := list.New([]list.Item{}, list.NewDefaultDelegate(), 0, 0)
	i.Title = "Items"
	i.SetShowHelp(false)
	i.DisableQuitKeybindings()

	return Model{
		state:   sidebarFocus,
		sidebar: s,
		items:   i,
		content: viewport.New(0, 0),
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

const (
	SpecialFeedAllId     = -100
	SpecialFeedUnreadId  = -101
	SpecialFeedStarredId = -102
)

func loadFeeds() tea.Msg {
	feeds, err := feed.All()
	if err != nil {
		return errMsg(err)
	}
	special := []*feed.Feed{
		{Id: SpecialFeedUnreadId, Title: "Unread"},
		{Id: SpecialFeedAllId, Title: "All"},
		{Id: SpecialFeedStarredId, Title: "Starred"},
	}
	return feedsMsg(append(special, feeds...))
}

func loadItems(feedID int64) tea.Cmd {
	return func() tea.Msg {
		var items []*item.Item
		var err error

		switch feedID {
		case SpecialFeedAllId:
			items, err = item.Filter(0, 0, "", false, false, 0, "")
		case SpecialFeedUnreadId:
			items, err = item.Filter(0, 0, "", true, false, 0, "")
		case SpecialFeedStarredId:
			items, err = item.Filter(0, 0, "", false, true, 0, "")
		default:
			items, err = item.Filter(0, feedID, "", false, false, 0, "")
		}

		if err != nil {
			return errMsg(err)
		}
		return itemsMsg(items)
	}
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.ready = true

		// Layout: Sidebar 30%, Main 70%
		sidebarWidth := int(float64(m.width) * 0.3)
		mainWidth := m.width - sidebarWidth - 4 // minus borders/padding

		m.sidebar.SetSize(sidebarWidth, m.height-2)
		m.items.SetSize(mainWidth, m.height-2)
		m.content.Width = mainWidth
		m.content.Height = m.height - 4

	case feedsMsg:
		m.feedData = msg
		items := make([]list.Item, len(m.feedData))
		for i, f := range m.feedData {
			items[i] = itemString(f.Title)
		}
		m.sidebar.SetItems(items)

	case itemsMsg:
		m.itemData = msg
		m.updateListItems()
		// Switch focus to items when loaded?
		// Maybe keep focus where it was, or auto-switch
		// User expectation: Enter on feed -> focus items
		// But loadItems is async.
		// Let's rely on explicit focus switch or handle it here if intent was "select feed".
		// For now, let's keep focus as is, but if we just selected a feed, maybe we are still in sidebar.
		// Actually, standard TUI behavior: Enter on sidebar -> focus items.
		if m.state == sidebarFocus {
			m.state = itemFocus
		}

	case errMsg:
		m.err = msg
		return m, tea.Quit

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			if m.state == contentFocus {
				m.state = itemFocus
				return m, nil
			}
			return m, tea.Quit

		case "tab":
			if m.state == sidebarFocus {
				m.state = itemFocus
			} else if m.state == itemFocus {
				m.state = sidebarFocus
			}
			return m, nil

		case "esc":
			if m.state == contentFocus {
				m.state = itemFocus
				return m, nil
			}
			if m.state == itemFocus {
				m.state = sidebarFocus
				return m, nil
			}

		case "s":
			if m.state == itemFocus || m.state == contentFocus {
				if m.selectedItem != nil {
					m.selectedItem.Starred = !m.selectedItem.Starred
					m.selectedItem.Save()
					m.updateListItems()
				}
			}

		case "m", "r":
			if m.state == itemFocus || m.state == contentFocus {
				if m.selectedItem != nil {
					m.selectedItem.ReadState = !m.selectedItem.ReadState
					m.selectedItem.Save()
					m.updateListItems()
				}
			}

		case "o":
			if m.selectedItem != nil {
				_ = openUrl(m.selectedItem.Url)
			}

		case "enter":
			if m.state == sidebarFocus {
				idx := m.sidebar.Index()
				if idx >= 0 && idx < len(m.feedData) {
					m.selectedFeed = m.feedData[idx]
					return m, loadItems(m.selectedFeed.Id)
				}
			} else if m.state == itemFocus {
				idx := m.items.Index()
				if idx >= 0 && idx < len(m.itemData) {
					m.selectedItem = m.itemData[idx]
					// Mark as read when opening
					if !m.selectedItem.ReadState {
						m.selectedItem.ReadState = true
						m.selectedItem.Save()
						m.updateListItems()
					}

					formattedContent := fmt.Sprintf("%s\n\n%s",
						HeaderStyle.Render(m.selectedItem.Title),
						m.selectedItem.Description)
					m.content.SetContent(formattedContent)
					m.content.YPosition = 0
					m.state = contentFocus
				}
			}
		}
	}

	// Route messages to components based on focus
	if m.state == sidebarFocus {
		m.sidebar, cmd = m.sidebar.Update(msg)
		cmds = append(cmds, cmd)
	} else if m.state == itemFocus {
		m.items, cmd = m.items.Update(msg)
		cmds = append(cmds, cmd)
	} else if m.state == contentFocus {
		m.content, cmd = m.content.Update(msg)
		cmds = append(cmds, cmd)
	}

	return m, tea.Batch(cmds...)
}

func (m *Model) updateListItems() {
	if len(m.itemData) == 0 {
		return
	}
	items := make([]list.Item, len(m.itemData))
	for i, it := range m.itemData {
		title := it.Title
		if it.Starred {
			title = "★ " + title
		}
		if !it.ReadState {
			title = "● " + title
		}
		items[i] = itemString(title)
	}
	m.items.SetItems(items)
}

func openUrl(url string) error {
	// Simple xdg-open wrapper, ignored for now or use exec
	return nil
}

func (m Model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v", m.err)
	}
	if !m.ready {
		return "Initializing..."
	}

	var sidebarView, mainView string

	// Render Sidebar
	if m.state == sidebarFocus {
		sidebarView = ActivePaneStyle.Render(m.sidebar.View())
	} else {
		sidebarView = PaneStyle.Render(m.sidebar.View())
	}

	// Render Main Area (Item List or Content)
	if m.state == contentFocus {
		mainView = ActivePaneStyle.Render(m.content.View())
	} else {
		if m.state == itemFocus {
			mainView = ActivePaneStyle.Render(m.items.View())
		} else {
			mainView = PaneStyle.Render(m.items.View())
		}
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, sidebarView, mainView)
}

func Run() error {
	p := tea.NewProgram(NewModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		return err
	}
	return nil
}
