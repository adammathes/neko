# Creating a New Theme

Neko's style theme system layers an additional CSS file on top of the base
stylesheet. The base `style.css` defines CSS custom properties (variables) and
all component styles. A theme file overrides whichever of those it wants.

## Quick Start

1. Create a new CSS file in `frontend-vanilla/public/themes/yourtheme.css`
2. Register the theme name in `frontend-vanilla/src/main.ts` — add it to the
   `STYLE_THEMES` array:
   ```ts
   const STYLE_THEMES = ['default', 'refined', 'terminal', 'codex', 'sakura', 'yourtheme'] as const;
   ```
3. Rebuild: `cd frontend-vanilla && npm run build`
4. Copy output: `cp -r dist/* ../web/dist/v3/`

That's it. The theme will appear in Settings > Style and in the sidebar cycle
button.

## How it works

When a user picks a style theme, JavaScript inserts a `<link>` tag:

```html
<link id="style-theme-link" rel="stylesheet" href="/v3/themes/yourtheme.css">
```

This loads *after* the base stylesheet, so any rules you write will override
the defaults via normal CSS cascade (same specificity = last one wins). When
the user switches to "Default," the link tag is removed entirely.

The theme CSS files live in `public/themes/` so Vite copies them as-is into the
build output (no hashing, no bundling). They're plain CSS — no build step
required for the theme file itself.

## CSS Variables You Can Override

The base stylesheet defines these custom properties on `:root` (light mode)
and `.theme-dark` (dark mode):

```css
/* Colors */
--bg-color          /* Page background */
--text-color        /* Primary text */
--sidebar-bg        /* Sidebar background */
--link-color        /* Links and titles */
--border-color      /* Borders, rules, dividers */
--accent-color      /* Interactive accent (selection, focus) */

/* Fonts */
--font-body         /* Body/article text (default: Palatino stack) */
--font-heading      /* Dynamic heading font (user-selectable) */
--font-heading-system  /* System heading font (Helvetica Neue stack) */
--font-sans         /* Sans-serif stack (Inter/system-ui) */
--font-mono         /* Monospace stack (Courier New) */
```

### Supporting both light and dark mode

Your theme should define colors for both modes:

```css
/* Light mode */
:root {
  --bg-color: #faf8f4;
  --text-color: #2c2c2c;
  --link-color: #8b4513;
  /* ... */
}

/* Dark mode */
.theme-dark {
  --bg-color: #1c1a17;
  --text-color: #d4cfc6;
  --link-color: #c9956b;
  /* ... */
}
```

The light/dark toggle adds/removes the `theme-dark` class on `#app`. Your
theme's `.theme-dark` rules will override your `:root` rules when active.

**Important:** The base stylesheet has some `.theme-dark .sidebar` rules that
set the sidebar to a grey background with dark text. If your theme wants a
different dark-mode sidebar, you'll need to override those specifically:

```css
.theme-dark .sidebar { background: ...; }
.theme-dark .sidebar-section li a { color: ...; }
.theme-dark .sidebar-section h3 { color: ...; }
.theme-dark .sidebar-footer a { color: ...; }
```

## Key Selectors Reference

### Layout
- `.sidebar` — Fixed sidebar (11rem wide)
- `.main-content` — Scrollable content area
- `.main-content > *` — Content max-width container (default: 35em)

### Feed items
- `.feed-item` — Individual article wrapper
- `.item-title` — Article title/link
- `.dateline` — Date + feed source line
- `.item-description` — Article body content
- `.star-btn` / `.star-btn.is-starred` / `.star-btn.is-unstarred` — Star toggle
- `.scrape-btn` — "text" button for full-content fetch

### Settings page
- `.settings-view` — Settings container
- `.settings-section` / `.settings-section h3` — Section blocks
- `.settings-group` / `.data-group` — Form groups
- `.theme-options` — Button row for theme/style selectors
- `.button-group` — Button row for export/import
- `.manage-feed-list` / `.manage-feed-item` — Feed management list

### Buttons
- `button` / `.button` — All buttons and button-styled links
- `button.active` — Currently selected option

### Sidebar details
- `.sidebar-section h3` — Section headers (FEEDS, TAGS)
- `.sidebar-section li a` — Feed/filter links
- `.sidebar-section li.active a` — Selected item
- `.sidebar-footer` — Bottom area (settings, logout, controls)
- `.sidebar-quick-controls` / `.sidebar-icon-btn` — Theme toggle icons

## Tips

- **Override fonts broadly.** Set `font-family` on `body` for article text and
  on `.sidebar`, `.settings-view`, `button` for UI elements.
- **Use the cascade.** You don't need `!important` — your theme loads after the
  base stylesheet. Just match or exceed the specificity of the base rule.
- **Keep it to overrides.** Don't redefine layout or structural properties
  unless you have a reason. Focus on colors, typography, and spacing.
- **Test both modes.** Always check your theme in both light and dark.
- **Note on font overrides:** The user can independently select heading and body
  fonts in Settings > Fonts. These apply CSS classes like `.font-sans`,
  `.heading-font-serif`, etc. Your theme's font choices will be the "default"
  that users see before changing font settings.

## Existing Themes

| Theme      | Character |
|------------|-----------|
| `default`  | No extra CSS — the base stylesheet as-is |
| `refined`  | Tightened spacing, better typographic rhythm, polished details |
| `terminal` | Monospace, green phosphor accent, CRT scanlines in dark mode |
| `codex`    | Book-inspired: warm cream paper, serif type, fleuron separators |
| `sakura`   | Japanese aesthetic: restrained palette, muted rose accent, calm spacing |
