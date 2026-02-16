import './style.css';
import { apiFetch } from './api';
import { store } from './store';
import type { FilterType } from './store';
import { router } from './router';
import type { Feed, Item, Category } from './types';
import { createFeedItem } from './components/FeedItem';

// Extend Window interface for app object (keeping for compatibility if needed, but removing inline dependencies)
declare global {
  interface Window {
    app: any;
  }
}

// Global App State
let activeItemId: number | null = null;

// Cache elements (initialized in renderLayout)
let appEl: HTMLDivElement | null = null;

// Initial Layout (v2-style 2-pane)
export function renderLayout() {
  appEl = document.querySelector<HTMLDivElement>('#app');
  if (!appEl) return;
  appEl.className = `theme-${store.theme} font-${store.fontTheme}`;
  appEl.innerHTML = `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <h2 id="logo-link">Neko v3</h2>
        </div>
        <div class="sidebar-search">
          <input type="search" id="search-input" placeholder="Search..." value="${store.searchQuery}">
        </div>
        <div class="sidebar-scroll">
          <section class="sidebar-section">
            <h3>Filters</h3>
            <ul id="filter-list">
              <li class="filter-item" data-filter="unread"><a href="/v3/?filter=unread" data-nav="filter" data-value="unread">Unread</a></li>
              <li class="filter-item" data-filter="all"><a href="/v3/?filter=all" data-nav="filter" data-value="all">All</a></li>
              <li class="filter-item" data-filter="starred"><a href="/v3/?filter=starred" data-nav="filter" data-value="starred">Starred</a></li>
            </ul>
          </section>
          <section class="sidebar-section">
            <h3>Tags</h3>
            <ul id="tag-list"></ul>
          </section>
          <section class="sidebar-section">
            <h3>Feeds</h3>
            <ul id="feed-list"></ul>
          </section>
        </div>
        <div class="sidebar-footer">
          <a href="/v3/settings" id="settings-link">Settings</a>
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

  const logoutBtn = document.getElementById('logout-button');
  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  const settingsLink = document.getElementById('settings-link');
  settingsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/settings');
  });

  // Event delegation for filters, tags, and feeds in sidebar
  const sidebar = document.getElementById('sidebar');
  sidebar?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (!link) return;

    const navType = link.getAttribute('data-nav');
    const currentQuery = Object.fromEntries(router.getCurrentRoute().query.entries());

    if (navType === 'filter') {
      e.preventDefault();
      const filter = link.getAttribute('data-value') as FilterType;
      router.updateQuery({ filter });
    } else if (navType === 'tag') {
      e.preventDefault();
      const tag = link.getAttribute('data-value')!;
      router.navigate(`/tag/${encodeURIComponent(tag)}`, currentQuery);
    } else if (navType === 'feed') {
      e.preventDefault();
      const feedId = link.getAttribute('data-value')!;
      router.navigate(`/feed/${feedId}`, currentQuery);
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
      // We can add "expand" logic here if we want but v2 shows it by default if loaded
      // For now, let's just mark as read if it's unread
      const id = parseInt(itemRow.getAttribute('data-id')!);
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
  const { tags, activeTagName } = store;
  const tagListEl = document.getElementById('tag-list');
  if (!tagListEl) return;
  tagListEl.innerHTML = tags.map((tag: Category) => `
    <li class="${tag.title === activeTagName ? 'active' : ''}">
      <a href="/v3/tag/${encodeURIComponent(tag.title)}" data-nav="tag" data-value="${tag.title}">
        ${tag.title}
      </a>
    </li>
  `).join('');
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
      ${items.map((item: Item) => createFeedItem(item)).join('')}
    </ul>
    ${store.hasMore ? '<div id="load-more-sentinel" class="loading-more">Loading more...</div>' : ''}
  `;

  // Setup infinite scroll
  const sentinel = document.getElementById('load-more-sentinel');
  if (sentinel) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !store.loading && store.hasMore) {
        loadMore();
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
  }
}

export function renderSettings() {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  contentArea.innerHTML = `
        <div class="settings-view">
            <h2>Settings</h2>
            <section class="settings-section">
                <h3>Theme</h3>
                <div class="theme-options" id="theme-options">
                    <button class="${store.theme === 'light' ? 'active' : ''}" data-theme="light">Light</button>
                    <button class="${store.theme === 'dark' ? 'active' : ''}" data-theme="dark">Dark</button>
                </div>
            </section>
            <section class="settings-section">
                <h3>Font</h3>
                <select id="font-selector">
                    <option value="default" ${store.fontTheme === 'default' ? 'selected' : ''}>Default (Palatino)</option>
                    <option value="serif" ${store.fontTheme === 'serif' ? 'selected' : ''}>Serif (Georgia)</option>
                    <option value="sans" ${store.fontTheme === 'sans' ? 'selected' : ''}>Sans-Serif (Helvetica)</option>
                    <option value="mono" ${store.fontTheme === 'mono' ? 'selected' : ''}>Monospace</option>
                </select>
            </section>
        </div>
    `;

  // Attach settings listeners
  const themeOptions = document.getElementById('theme-options');
  themeOptions?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn) {
      const theme = btn.getAttribute('data-theme')!;
      store.setTheme(theme);
      renderSettings(); // Re-render to show active
    }
  });

  const fontSelector = document.getElementById('font-selector') as HTMLSelectElement;
  fontSelector?.addEventListener('change', () => {
    store.setFontTheme(fontSelector.value);
  });
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
      store.setHasMore(items.length >= 50);
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
  } else if (route.path === '/tag' && route.params.tagName) {
    store.setActiveTag(route.params.tagName);
    fetchItems(undefined, route.params.tagName);
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
  let index = store.items.findIndex(i => i._id === activeItemId);
  index += direction;
  if (index >= 0 && index < store.items.length) {
    activeItemId = store.items[index]._id;
    const el = document.querySelector(`.feed-item[data-id="${activeItemId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
    // Optional: mark as read when keyboard navigating
    if (!store.items[index].read) updateItem(activeItemId, { read: true });
    // Since we are in 2-pane, we just scroll to it.
  } else if (index === -1) {
    activeItemId = store.items[0]._id;
    const el = document.querySelector(`.feed-item[data-id="${activeItemId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
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
    appEl.className = `theme-${store.theme} font-${store.fontTheme}`;
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
// Start
export async function init() {
  const authRes = await apiFetch('/api/auth');
  if (!authRes || authRes.status === 401) {
    window.location.href = '/login/';
    return;
  }

  renderLayout();
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
