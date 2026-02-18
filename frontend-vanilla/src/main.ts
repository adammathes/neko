import './style.css';
import { apiFetch } from './api';
import { store } from './store';
import type { FilterType } from './store';
import { router } from './router';
import type { Feed, Item } from './types';
import { createFeedItem } from './components/FeedItem';

// Extend Window interface for app object (keeping for compatibility if needed, but removing inline dependencies)
declare global {
  interface Window {
    app: any;
  }
}

// Style theme management: load/unload CSS files
const STYLE_THEMES = ['default', 'refined', 'terminal', 'codex', 'sakura'] as const;

function loadStyleTheme(theme: string) {
  // Remove any existing theme stylesheet
  const existing = document.getElementById('style-theme-link');
  if (existing) existing.remove();

  // 'default' means no extra stylesheet
  if (theme === 'default') return;

  const link = document.createElement('link');
  link.id = 'style-theme-link';
  link.rel = 'stylesheet';
  link.href = `/v3/themes/${theme}.css`;
  document.head.appendChild(link);
}

// Global App State
let activeItemId: number | null = null;

// Cache elements (initialized in renderLayout)
let appEl: HTMLDivElement | null = null;

// Initial Layout (v2-style 2-pane)
export function renderLayout() {
  appEl = document.querySelector<HTMLDivElement>('#app');
  if (!appEl) return;
  // Apply both font themes (font-* for body, heading-font-* for headers)
  appEl.className = `theme-${store.theme} font-${store.fontTheme} heading-font-${store.headingFontTheme}`;
  appEl.innerHTML = `
    <div class="layout ${store.sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}">
      <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Toggle Sidebar">🐱</button>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-scroll">
          <section class="sidebar-section">
            <ul id="filter-list">
              <li class="filter-item" data-filter="unread"><a href="/v3/?filter=unread" data-nav="filter" data-value="unread">Unread</a></li>
              <li class="filter-item" data-filter="all"><a href="/v3/?filter=all" data-nav="filter" data-value="all">All</a></li>
              <li class="filter-item" data-filter="starred"><a href="/v3/?filter=starred" data-nav="filter" data-value="starred">Starred</a></li>
            </ul>
          </section>
          <div class="sidebar-search">
            <input type="search" id="search-input" placeholder="Search..." value="${store.searchQuery}">
          </div>
          <section class="sidebar-section">
            <ul>
              <li><a href="/v3/settings" data-nav="settings" class="new-feed-link">+ new</a></li>
            </ul>
          </section>
          <section class="sidebar-section collapsible collapsed" id="section-feeds">
            <h3>Feeds <span class="caret">▶</span></h3>
            <ul id="feed-list"></ul>
          </section>
          <!-- FIXME: Tags feature soft-deprecated 
          <section class="sidebar-section collapsible collapsed" id="section-tags">
            <h3>Tags <span class="caret">▶</span></h3>
            <ul id="tag-list"></ul>
          </section>
          -->
        </div>
        <div class="sidebar-footer">
          <div class="sidebar-quick-controls">
            <button id="sidebar-theme-toggle" class="sidebar-icon-btn" title="${store.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}">${store.theme === 'light' ? '☽' : '☀'}</button>
            <span class="sidebar-controls-divider"></span>
            <button class="sidebar-icon-btn sidebar-style-btn ${store.styleTheme === 'default' ? 'active' : ''}" data-style-theme="default" title="Default">○</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${store.styleTheme === 'refined' ? 'active' : ''}" data-style-theme="refined" title="Refined">◆</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${store.styleTheme === 'terminal' ? 'active' : ''}" data-style-theme="terminal" title="Terminal">▮</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${store.styleTheme === 'codex' ? 'active' : ''}" data-style-theme="codex" title="Codex">❧</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${store.styleTheme === 'sakura' ? 'active' : ''}" data-style-theme="sakura" title="Sakura">❀</button>
          </div>
          <a href="/v3/settings" data-nav="settings">Settings</a>
          <a href="#" id="logout-button">Logout</a>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        <div id="content-area"></div>
      </main>
    </div>
  `;

  attachLayoutListeners();
}

export function attachLayoutListeners() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value;
    router.updateQuery({ q: query });
  });

  const logoLink = document.getElementById('logo-link');
  logoLink?.addEventListener('click', () => router.navigate('/'));

  document.getElementById('logout-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  // Sidebar quick controls: light/dark toggle
  document.getElementById('sidebar-theme-toggle')?.addEventListener('click', () => {
    store.setTheme(store.theme === 'light' ? 'dark' : 'light');
  });

  // Sidebar quick controls: style theme emoji buttons
  document.querySelectorAll('.sidebar-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-style-theme');
      if (theme) store.setStyleTheme(theme);
    });
  });

  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => {
    store.toggleSidebar();
  });

  document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
    store.setSidebarVisible(false);
  });

  // Sidebar state is persisted via cookie; no auto-open on resize

  // Collapsible sections
  document.querySelectorAll('.sidebar-section.collapsible h3').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement?.classList.toggle('collapsed');
    });
  });

  // Event delegation for filters, tags, and feeds in sidebar
  const sidebar = document.getElementById('sidebar');
  sidebar?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (!link) {
      if (target.classList.contains('logo')) {
        e.preventDefault();
        router.navigate('/', {});
      }
      return;
    }

    const navType = link.getAttribute('data-nav');
    const currentQuery = Object.fromEntries(router.getCurrentRoute().query.entries());

    if (navType === 'filter') {
      e.preventDefault();
      const filter = link.getAttribute('data-value') as FilterType;
      const currentRoute = router.getCurrentRoute();
      if (currentRoute.path === '/settings') {
        router.navigate('/', { ...currentQuery, filter });
      } else {
        router.updateQuery({ filter });
      }
    } else if (navType === 'tag') {
      e.preventDefault();
      const tag = link.getAttribute('data-value')!;
      router.navigate(`/tag/${encodeURIComponent(tag)}`, currentQuery);
    } else if (navType === 'feed') {
      e.preventDefault();
      const feedId = link.getAttribute('data-value')!;
      const currentRoute = router.getCurrentRoute();
      if (store.activeFeedId === parseInt(feedId) && currentRoute.path !== '/settings') {
        router.navigate('/', currentQuery);
      } else {
        router.navigate(`/feed/${feedId}`, currentQuery);
      }
    } else if (navType === 'settings') {
      e.preventDefault();
      const currentRoute = router.getCurrentRoute();
      if (currentRoute.path === '/settings') {
        router.navigate('/', currentQuery);
      } else {
        router.navigate('/settings', currentQuery);
      }
    }

    // Auto-close sidebar on mobile after clicking a link
    if (window.innerWidth <= 768) {
      store.setSidebarVisible(false);
    }
  });

  // Event delegation for content area (items)
  const contentArea = document.getElementById('content-area');
  contentArea?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Handle Toggle Star
    const starBtn = target.closest('[data-action="toggle-star"]');
    if (starBtn) {
      const itemRow = starBtn.closest('[data-id]');
      if (itemRow) {
        const id = parseInt(itemRow.getAttribute('data-id')!);
        toggleStar(id);
      }
      return;
    }

    // Handle Scrape
    const scrapeBtn = target.closest('[data-action="scrape"]');
    if (scrapeBtn) {
      const itemRow = scrapeBtn.closest('[data-id]');
      if (itemRow) {
        const id = parseInt(itemRow.getAttribute('data-id')!);
        scrapeItem(id);
      }
      return;
    }

    // Handle Item interaction (mark as read on click title or row)
    const itemTitle = target.closest('[data-action="open"]');
    const itemRow = target.closest('.feed-item');
    if (itemRow && !itemTitle) { // Clicking the row itself (but not the link)
      const id = parseInt(itemRow.getAttribute('data-id')!);
      activeItemId = id;

      // Update visual selection
      document.querySelectorAll('.feed-item').forEach(el => {
        const itemId = parseInt(el.getAttribute('data-id') || '0');
        el.classList.toggle('selected', itemId === activeItemId);
      });

      const item = store.items.find(i => i._id === id);
      if (item && !item.read) {
        updateItem(id, { read: true });
      }
    }
  });
}

// --- Rendering Functions ---

export function renderFeeds() {
  const { feeds, activeFeedId } = store;
  const feedListEl = document.getElementById('feed-list');
  if (!feedListEl) return;
  feedListEl.innerHTML = feeds.map((feed: Feed) => `
    <li class="${feed._id === activeFeedId ? 'active' : ''}">
      <a href="/v3/feed/${feed._id}" data-nav="feed" data-value="${feed._id}">
        ${feed.title || feed.url}
      </a>
    </li>
  `).join('');
}

export function renderTags() {
  /* Soft deprecated.
  const tagList = document.getElementById('tag-list');
  if (!tagList) return;

  const { tags, activeTagName } = store;
  tagList.innerHTML = tags.map(tag => {
      const isActive = activeTagName === tag.title;
      return `<li class="tag-item ${isActive ? 'active' : ''}">
                <a href="/tag/${encodeURIComponent(tag.title)}" data-nav="tag" data-value="${tag.title}">${tag.title}</a>
              </li>`;
  }).join('');
  */
}

export function renderFilters() {
  const { filter } = store;
  const filterListEl = document.getElementById('filter-list');
  if (!filterListEl) return;
  filterListEl.querySelectorAll('li').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-filter') === filter);
  });
}

export function renderItems() {
  const { items, loading } = store;

  const contentArea = document.getElementById('content-area');
  if (!contentArea || router.getCurrentRoute().path === '/settings') return;

  if (loading && items.length === 0) {
    contentArea.innerHTML = '<p class="loading">Loading items...</p>';
    return;
  }

  if (items.length === 0) {
    contentArea.innerHTML = '<p class="empty">No items found.</p>';
    return;
  }

  contentArea.innerHTML = `
    <ul class="item-list">
      ${items.map((item: Item) => createFeedItem(item, item._id === activeItemId)).join('')}
    </ul>
    ${store.hasMore ? '<div id="load-more-sentinel" class="loading-more">Loading more...</div>' : ''}
  `;

  // Scroll listener on the scrollable container (#main-content) handles both:
  //   1. Infinite scroll — load more when near the bottom (like v1's proven approach)
  //   2. Mark-as-read — mark items read when scrolled past
  // Using onscroll assignment (not addEventListener) so each renderItems() call
  // replaces the previous handler without accumulating listeners.
  const scrollRoot = document.getElementById('main-content');
  if (scrollRoot) {
    let readTimeoutId: number | null = null;
    scrollRoot.onscroll = () => {
      // Infinite scroll check (container only)
      if (!store.loading && store.hasMore && scrollRoot.scrollHeight > scrollRoot.clientHeight) {
        if (scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight < 200) {
          loadMore();
        }
      }

      // Mark-as-read: debounced
      if (readTimeoutId === null) {
        readTimeoutId = window.setTimeout(() => {
          checkReadItems(scrollRoot);
          readTimeoutId = null;
        }, 250);
      }
    };
  }
}

function checkReadItems(scrollRoot: HTMLElement) {
  const containerRect = scrollRoot.getBoundingClientRect();
  store.items.forEach((item) => {
    if (item.read) return;

    const el = document.querySelector(`.feed-item[data-id="${item._id}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Mark as read if the bottom of the item is above the top of the container
      if (rect.bottom < containerRect.top) {
        updateItem(item._id, { read: true });
      }
    }
  });
}

// Polling fallback for infinite scroll (matches V1 behavior)
// This ensures that even if scroll events are missed or layout shifts occur without scroll,
// we still load more items when near the bottom.
if (typeof window !== 'undefined') {
  setInterval(() => {
    // We need to check if we are scrolling the window or an element.
    // In V3 layout, .main-content handles the scroll if it's overflow-y: auto.
    // But if .main-content is behaving like the body, we might need to check window.innerHeight.

    // Let's check the container first
    const scrollRoot = document.getElementById('main-content');
    // console.log('Polling...', { scrollRoot: !!scrollRoot, loading: store.loading, hasMore: store.hasMore });

    if (store.loading || !store.hasMore) return;

    if (scrollRoot) {
      // Check for read items periodically (robustness fallback)
      checkReadItems(scrollRoot);

      // Check container scroll (if container is scrollable)
      if (scrollRoot.scrollHeight > scrollRoot.clientHeight) {
        if (scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight < 200) {
          loadMore();
          return;
        }
      }
    }

    // Fallback: Check window scroll (if main-content isn't the scroller)
    // This matches V1 logic: $(document).height() - $(window).height() - $(window).scrollTop()
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const winHeight = window.innerHeight;
    const winScroll = window.scrollY || document.documentElement.scrollTop;

    // Only if document is actually scrollable
    if (docHeight > winHeight) {
      if (docHeight - winHeight - winScroll < 200) {
        loadMore();
      }
    }

  }, 1000);
}

// ... (add this variable at module level or inside renderSettings if possible, but module level is safer for persistence across clicks if renderSettings re-runs? No, event flow is synchronous: click button -> click file input. User selects file. Change event fires.
// Actually, file input click is async in terms of user action. renderSettings won't run in between unless something else triggers it.
// But to be safe, I'll update the function signature of importOPML to importData.

export function renderSettings() {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="settings-view">
      <h2>Settings</h2>
      
      <div class="settings-grid">
        <section class="settings-section">
          <h3>Data</h3>
          <div class="data-group">
            <div class="button-group">
              <a href="/api/export/opml" class="button" target="_blank">EXPORT OPML</a>
              <a href="/api/export/text" class="button" target="_blank">EXPORT TEXT</a>
              <a href="/api/export/json" class="button" target="_blank">EXPORT JSON</a>
            </div>
          </div>
          <div class="data-group" style="margin-top: 1rem;">
             <div class="button-group">
               <button class="import-btn" data-format="opml">IMPORT OPML</button>
               <button class="import-btn" data-format="text">IMPORT TEXT</button>
               <button class="import-btn" data-format="json">IMPORT JSON</button>
             </div>
             <input type="file" id="import-file" style="display: none;">
          </div>
        </section>

        <section class="settings-section">
          <h3>Theme</h3>
          <div class="settings-group">
            <div class="theme-options" id="theme-options">
              <button class="${store.theme === 'light' ? 'active' : ''}" data-theme="light">Light</button>
              <button class="${store.theme === 'dark' ? 'active' : ''}" data-theme="dark">Dark</button>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Style</h3>
          <div class="settings-group">
            <div class="theme-options" id="style-theme-options">
              ${STYLE_THEMES.map(t => `<button class="${store.styleTheme === t ? 'active' : ''}" data-style-theme="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('\n              ')}
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Fonts</h3>
          <div class="settings-group">
            <label>System & headings</label>
            <select id="heading-font-selector" style="margin-bottom: 1rem;">
              <option value="default" ${store.headingFontTheme === 'default' ? 'selected' : ''}>System (Helvetica Neue)</option>
              <option value="serif" ${store.headingFontTheme === 'serif' ? 'selected' : ''}>Serif (Georgia)</option>
              <option value="sans" ${store.headingFontTheme === 'sans' ? 'selected' : ''}>Sans-Serif (Inter/System)</option>
              <option value="mono" ${store.headingFontTheme === 'mono' ? 'selected' : ''}>Monospace</option>
            </select>

            <label>article body</label>
            <select id="font-selector">
              <option value="default" ${store.fontTheme === 'default' ? 'selected' : ''}>Default (Palatino)</option>
              <option value="serif" ${store.fontTheme === 'serif' ? 'selected' : ''}>Serif (Georgia)</option>
              <option value="sans" ${store.fontTheme === 'sans' ? 'selected' : ''}>Sans-Serif (Helvetica)</option>
              <option value="mono" ${store.fontTheme === 'mono' ? 'selected' : ''}>Monospace</option>
            </select>
          </div>
        </section>
      </div>

      <section class="settings-section manage-feeds-section">
        <h3>Manage Feeds</h3>
        
        <div class="add-feed-form" style="margin-bottom: 2rem;">
            <input type="url" id="new-feed-url" placeholder="https://example.com/rss.xml">
            <button id="add-feed-btn">ADD FEED</button>
        </div>

        <ul class="manage-feed-list">
          ${store.feeds.map(feed => `
            <li class="manage-feed-item">
              <div class="feed-info">
                <div class="feed-title">${feed.title || feed.url}</div>
                <div class="feed-url">${feed.url}</div>
              </div>
              <div class="feed-actions">
                <!-- FIXME: Tags feature is broken/unused in V3. Soft deprecated for now.
                <input type="text" class="feed-tag-input" data-id="${feed._id}" value="${feed.category || ''}" placeholder="Tag">
                <button class="update-feed-tag-btn" data-id="${feed._id}">SAVE</button>
                -->
                <button class="delete-feed-btn" data-id="${feed._id}">DELETE</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    </div>
  `;

  // --- Listeners ---

  // Theme (light/dark)
  document.getElementById('theme-options')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn) {
      store.setTheme(btn.getAttribute('data-theme')!);
      renderSettings();
    }
  });

  // Style Theme
  document.getElementById('style-theme-options')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn) {
      store.setStyleTheme(btn.getAttribute('data-style-theme')!);
    }
  });

  // Heading Font
  document.getElementById('heading-font-selector')?.addEventListener('change', (e) => {
    store.setHeadingFontTheme((e.target as HTMLSelectElement).value);
  });

  // Body Font
  document.getElementById('font-selector')?.addEventListener('change', (e) => {
    store.setFontTheme((e.target as HTMLSelectElement).value);
  });

  // Add Feed
  document.getElementById('add-feed-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('new-feed-url') as HTMLInputElement;
    const url = input.value.trim();
    if (url) {
      if (await addFeed(url)) {
        input.value = '';
        alert('Feed added successfully!');
        fetchFeeds();
      } else {
        alert('Failed to add feed.');
      }
    }
  });

  // Import Logic
  let pendingImportFormat = 'opml';
  const fileInput = document.getElementById('import-file') as HTMLInputElement;

  document.querySelectorAll('.import-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      pendingImportFormat = (e.currentTarget as HTMLElement).getAttribute('data-format') || 'opml';
      fileInput.click();
    });
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      if (await importData(file, pendingImportFormat)) {
        alert(`Import (${pendingImportFormat}) started! check logs.`);
        fetchFeeds();
      } else {
        alert('Failed to import.');
      }
    }
    fileInput.value = ''; // Reset
  });

  // Manage Feeds
  document.querySelectorAll('.delete-feed-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id')!);
      if (confirm('Delete this feed?')) {
        await deleteFeed(id);
        await fetchFeeds();
        renderSettings();
      }
    });
  });

  /* Soft deprecated.
  document.querySelectorAll('.update-feed-tag-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id')!);
      const input = document.querySelector(`.feed-tag-input[data-id="${id}"]`) as HTMLInputElement;
      await updateFeed(id, { category: input.value.trim() });
      await fetchFeeds();
      // await fetchTags();
      renderSettings();
      alert('Feed updated');
    });
  });
  */
}

async function addFeed(url: string): Promise<boolean> {
  try {
    const res = await apiFetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to add feed', err);
    return false;
  }
}

async function importData(file: File, format: string): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1];

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken || '' },
      body: formData
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to import', err);
    return false;
  }
}

export async function deleteFeed(id: number): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/feed/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Failed to delete feed', err);
    return false;
  }
}

export async function updateFeed(id: number, updates: Partial<Feed>): Promise<boolean> {
  const existing = store.feeds.find(f => f._id === id);
  if (!existing) {
    console.error('Feed not found in store', id);
    return false;
  }

  const payload = { ...existing, ...updates };

  try {
    const res = await apiFetch('/api/feed', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to update feed', err);
    return false;
  }
}

// --- Data Actions ---

export async function toggleStar(id: number) {
  const item = store.items.find(i => i._id === id);
  if (item) {
    updateItem(id, { starred: !item.starred });
  }
}

export async function scrapeItem(id: number) {
  const item = store.items.find(i => i._id === id);
  if (!item) return;

  try {
    const res = await apiFetch(`/api/item/${id}/content`);
    if (res.ok) {
      const data = await res.json();
      if (data.full_content) {
        updateItem(id, { full_content: data.full_content });
      }
    }
  } catch (err) {
    console.error('Failed to fetch full content', err);
  }
}

export async function updateItem(id: number, updates: Partial<Item>) {
  try {
    const res = await apiFetch(`/api/item/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      const item = store.items.find(i => i._id === id);
      if (item) {
        Object.assign(item, updates);
        // Selective DOM update to avoid full re-render
        const el = document.querySelector(`.feed-item[data-id="${id}"]`);
        if (el) {
          if (updates.read !== undefined) el.classList.toggle('read', updates.read);
          if (updates.starred !== undefined) {
            const starBtn = el.querySelector('.star-btn');
            if (starBtn) {
              starBtn.classList.toggle('is-starred', updates.starred);
              starBtn.classList.toggle('is-unstarred', !updates.starred);
              starBtn.setAttribute('title', updates.starred ? 'Unstar' : 'Star');
            }
          }
          if (updates.full_content) {
            // If full content was scraped, we might need to update description or re-render chunk
            renderItems(); // Full re-render is safer for content injection
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to update item', err);
  }
}

export async function fetchFeeds() {
  const res = await apiFetch('/api/feed/');
  if (res.ok) {
    const feeds = await res.json();
    store.setFeeds(feeds);
  }
}

export async function fetchTags() {
  const res = await apiFetch('/api/tag');
  if (res.ok) {
    const tags = await res.json();
    store.setTags(tags);
  }
}

export async function fetchItems(feedId?: string, tagName?: string, append: boolean = false) {
  store.setLoading(true);
  try {
    const params = new URLSearchParams();
    if (feedId) params.append('feed_id', feedId);
    if (tagName) params.append('tag', tagName);
    if (store.searchQuery) params.append('q', store.searchQuery);
    if (store.filter === 'starred' || store.filter === 'all') {
      params.append('read_filter', 'all');
    }
    if (store.filter === 'starred') {
      params.append('starred', 'true');
    }

    if (append && store.items.length > 0) {
      params.append('max_id', String(store.items[store.items.length - 1]._id));
    }

    const res = await apiFetch(`/api/stream?${params.toString()}`);
    if (res.ok) {
      const items = await res.json();
      // V1 logic: keep loading as long as we get results.
      // Backend limit is currently 15, so checking >= 50 caused premature stop.
      // We accept one extra empty fetch at the end to be robust against page size changes.
      store.setHasMore(items.length > 0);
      store.setItems(items, append);
    }
  } finally {
    store.setLoading(false);
  }
}

export async function loadMore() {
  const route = router.getCurrentRoute();
  fetchItems(route.params.feedId, route.params.tagName, true);
}

export async function logout() {
  await apiFetch('/api/logout', { method: 'POST' });
  window.location.href = '/login/';
}

// --- App Logic ---

function handleRoute() {
  const route = router.getCurrentRoute();

  const filterFromQuery = route.query.get('filter') as FilterType;
  store.setFilter(filterFromQuery || 'unread');

  const qFromQuery = route.query.get('q');
  if (qFromQuery !== null) {
    store.setSearchQuery(qFromQuery);
  }

  if (route.path === '/settings') {
    renderSettings();
    return;
  }

  if (route.path === '/feed' && route.params.feedId) {
    const id = parseInt(route.params.feedId);
    store.setActiveFeed(id);
    fetchItems(route.params.feedId);
    document.getElementById('section-feeds')?.classList.remove('collapsed');
  } else if (route.path === '/tag' && route.params.tagName) {
    store.setActiveTag(route.params.tagName);
    fetchItems(undefined, route.params.tagName);
    document.getElementById('section-tags')?.classList.remove('collapsed');
  } else {
    store.setActiveFeed(null);
    store.setActiveTag(null);
    fetchItems();
  }
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes((e.target as any).tagName)) return;

  switch (e.key) {
    case 'j':
      navigateItems(1);
      break;
    case 'k':
      navigateItems(-1);
      break;
    case 'r':
      if (activeItemId) {
        const item = store.items.find(i => i._id === activeItemId);
        if (item) updateItem(item._id, { read: !item.read });
      }
      break;
    case 's':
      if (activeItemId) {
        const item = store.items.find(i => i._id === activeItemId);
        if (item) updateItem(item._id, { starred: !item.starred });
      }
      break;
    case '/':
      e.preventDefault();
      document.getElementById('search-input')?.focus();
      break;
  }
});

function navigateItems(direction: number) {
  if (store.items.length === 0) return;
  const currentIndex = store.items.findIndex(i => i._id === activeItemId);
  let nextIndex;

  if (currentIndex === -1) {
    nextIndex = direction > 0 ? 0 : store.items.length - 1;
  } else {
    nextIndex = currentIndex + direction;
  }

  if (nextIndex >= 0 && nextIndex < store.items.length) {
    activeItemId = store.items[nextIndex]._id;

    // Update visual selection without full re-render for speed
    document.querySelectorAll('.feed-item').forEach(el => {
      const id = parseInt(el.getAttribute('data-id') || '0');
      el.classList.toggle('selected', id === activeItemId);
    });

    const el = document.querySelector(`.feed-item[data-id="${activeItemId}"]`);
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });

    if (!store.items[nextIndex].read) updateItem(activeItemId, { read: true });
  }
}

// Subscribe to store
store.on('feeds-updated', renderFeeds);
store.on('tags-updated', renderTags);
store.on('active-feed-updated', renderFeeds);
store.on('active-tag-updated', renderTags);
store.on('filter-updated', renderFilters);
store.on('search-updated', () => {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput && searchInput.value !== store.searchQuery) {
    searchInput.value = store.searchQuery;
  }
  handleRoute();
});
store.on('theme-updated', () => {
  if (!appEl) appEl = document.querySelector<HTMLDivElement>('#app');
  if (appEl) {
    // Re-apply classes with proper specificity logic
    appEl.className = `theme-${store.theme} font-${store.fontTheme} heading-font-${store.headingFontTheme}`;
  }
  // Update sidebar toggle icon
  const toggleBtn = document.getElementById('sidebar-theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = store.theme === 'light' ? '☽' : '☀';
    toggleBtn.title = store.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }
  // Also re-render settings if we are on settings page to update active state of buttons
  if (router.getCurrentRoute().path === '/settings') {
    renderSettings();
  }
});

store.on('sidebar-toggle', () => {
  const layout = document.querySelector('.layout');
  if (layout) {
    if (store.sidebarVisible) {
      layout.classList.remove('sidebar-hidden');
      layout.classList.add('sidebar-visible');
    } else {
      layout.classList.remove('sidebar-visible');
      layout.classList.add('sidebar-hidden');
    }
  }
});

store.on('style-theme-updated', () => {
  loadStyleTheme(store.styleTheme);
  // Update sidebar style emoji buttons
  document.querySelectorAll('.sidebar-style-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-style-theme') === store.styleTheme);
  });
  // Re-render settings if on settings page to update active state
  if (router.getCurrentRoute().path === '/settings') {
    renderSettings();
  }
});

store.on('items-updated', renderItems);
store.on('loading-state-changed', renderItems);

// Subscribe to router
router.addEventListener('route-changed', handleRoute);

// Compatibility app object (empty handlers, since we use delegation)
window.app = {
  navigate: (path: string) => router.navigate(path)
};

// Start
export async function init() {
  const authRes = await apiFetch('/api/auth');
  if (!authRes || authRes.status === 401) {
    window.location.href = '/login/';
    return;
  }

  renderLayout();
  loadStyleTheme(store.styleTheme);
  renderFilters();
  try {
    await Promise.all([fetchFeeds(), fetchTags()]);
  } catch (err) {
    console.error('Initial fetch failed', err);
  }
  handleRoute();
}

// Only auto-init if not in a test environment
if (typeof window !== 'undefined' && !(window as any).__VITEST__) {
  init();
}
