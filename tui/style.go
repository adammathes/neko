package tui

import "github.com/charmbracelet/lipgloss"

var (
	// Colors
	maroon   = lipgloss.Color("#800000")
	lavender = lipgloss.Color("#E6E6FA")
	gray     = lipgloss.Color("#808080")
	darkGray = lipgloss.Color("#404040")

	// Styles
	TitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lavender).
			Background(maroon).
			Padding(0, 1)

	ListStyle = lipgloss.NewStyle().
			Padding(1, 2)

	SelectedItemStyle = lipgloss.NewStyle().
				PaddingLeft(2).
				Foreground(lavender).
				Background(darkGray).
				Bold(true)

	ItemStyle = lipgloss.NewStyle().
			PaddingLeft(2)

	HeaderStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(maroon).
			MarginBottom(1)

	ContentStyle = lipgloss.NewStyle().
			Padding(1, 4)

	StatusStyle = lipgloss.NewStyle().
			Foreground(gray).
			Italic(true).
			MarginTop(1)
)
