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
let itemObserver: IntersectionObserver | null = null;

// Initial Layout (v2-style 2-pane)
export function renderLayout() {
  appEl = document.querySelector<HTMLDivElement>('#app');
  if (!appEl) return;
  appEl.className = `theme-${store.theme} font-${store.fontTheme}`;
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
          <section class="sidebar-section collapsible collapsed" id="section-tags">
            <h3>Tags <span class="caret">▶</span></h3>
            <ul id="tag-list"></ul>
          </section>
        </div>
        <div class="sidebar-footer">
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

  if (itemObserver) {
    itemObserver.disconnect();
    itemObserver = null;
  }
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

  // Use the actual scroll container as IntersectionObserver root
  const scrollRoot = document.getElementById('main-content');

  // Setup infinite scroll
  const sentinel = document.getElementById('load-more-sentinel');
  if (sentinel) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !store.loading && store.hasMore) {
        loadMore();
      }
    }, { root: scrollRoot, threshold: 0.1 });
    observer.observe(sentinel);
  }

  // Scroll listener for reading items
  // We attach this to the scrollable container: #main-content
  if (scrollRoot) {
    let timeoutId: number | null = null;
    const onScroll = () => {
      if (timeoutId === null) {
        timeoutId = window.setTimeout(() => {
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
          timeoutId = null;
        }, 250);
      }
    };
    // Remove existing listener if any (simplistic approach, ideally we track and remove)
    // Since renderItems is called multiple times, we might be adding multiple listeners?
    // attachLayoutListeners is called once, but renderItems is called on updates.
    // We should probably attaching the scroll listener in the layout setup, NOT here.
    // But we need access to 'items' which is in store.
    // Let's attach it here but be careful.
    // Actually, attaching to 'onscroll' property handles replacement automatically.
    scrollRoot.onscroll = onScroll;
  }
}

export function renderSettings() {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  contentArea.innerHTML = `
    <div class="settings-view">
      <h2>Settings</h2>
      
      <section class="settings-section">
        <h3>Add Feed</h3>
        <div class="add-feed-form">
          <input type="url" id="new-feed-url" placeholder="https://example.com/rss.xml">
          <button id="add-feed-btn">Add Feed</button>
        </div>
      </section>

      <section class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-group">
          <label>Theme</label>
          <div class="theme-options" id="theme-options">
            <button class="${store.theme === 'light' ? 'active' : ''}" data-theme="light">Light</button>
            <button class="${store.theme === 'dark' ? 'active' : ''}" data-theme="dark">Dark</button>
          </div>
        </div>
        <div class="settings-group" style="margin-top: 1rem;">
          <label>Font</label>
          <select id="font-selector">
            <option value="default" ${store.fontTheme === 'default' ? 'selected' : ''}>Default (Palatino)</option>
            <option value="serif" ${store.fontTheme === 'serif' ? 'selected' : ''}>Serif (Georgia)</option>
            <option value="sans" ${store.fontTheme === 'sans' ? 'selected' : ''}>Sans-Serif (Helvetica)</option>
            <option value="mono" ${store.fontTheme === 'mono' ? 'selected' : ''}>Monospace</option>
          </select>
        </div>
      </section>

      <section class="settings-section manage-feeds-section">
        <h3>Manage Feeds</h3>
        <ul class="manage-feed-list" style="list-style: none; padding: 0;">
          ${store.feeds.map(feed => `
            <li class="manage-feed-item" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.5rem;">
              <div class="feed-info">
                <div class="feed-title" style="font-weight: bold;">${feed.title || feed.url}</div>
                <div class="feed-url" style="font-size: 0.8em; color: var(--text-color); opacity: 0.6; overflow: hidden; text-overflow: ellipsis;">${feed.url}</div>
              </div>
              <div class="feed-actions" style="display: flex; gap: 0.5rem;">
                <input type="text" class="feed-tag-input" data-id="${feed._id}" value="${feed.category || ''}" placeholder="Tag" style="flex: 1;">
                <button class="update-feed-tag-btn" data-id="${feed._id}">Save</button>
                <button class="delete-feed-btn" data-id="${feed._id}" style="color: var(--error-color, #ff4444);">Delete</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>

      <section class="settings-section">
        <h3>Data Management</h3>
        <div class="data-actions">
          <button id="export-opml-btn">Export OPML</button>
          <div class="import-section" style="margin-top: 1rem;">
            <label for="import-opml-file" class="button">Import OPML</label>
            <input type="file" id="import-opml-file" accept=".opml,.xml" style="display: none;">
          </div>
        </div>
      </section>
    </div>
  `;

  // Attach settings listeners
  document.getElementById('theme-options')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn) {
      const theme = btn.getAttribute('data-theme')!;
      store.setTheme(theme);
      renderSettings();
    }
  });

  document.getElementById('font-selector')?.addEventListener('change', (e) => {
    store.setFontTheme((e.target as HTMLSelectElement).value);
  });

  document.getElementById('add-feed-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('new-feed-url') as HTMLInputElement;
    const url = input.value.trim();
    if (url) {
      const success = await addFeed(url);
      if (success) {
        input.value = '';
        alert('Feed added successfully!');
        fetchFeeds();
      } else {
        alert('Failed to add feed.');
      }
    }
  });

  document.getElementById('export-opml-btn')?.addEventListener('click', () => {
    window.location.href = '/api/export/opml';
  });

  document.getElementById('import-opml-file')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const success = await importOPML(file);
      if (success) {
        alert('OPML imported successfully! Crawling started.');
        fetchFeeds();
      } else {
        alert('Failed to import OPML.');
      }
    }
  });

  // Feed Management Listeners
  document.querySelectorAll('.delete-feed-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id')!);
      if (confirm('Are you sure you want to delete this feed?')) {
        await deleteFeed(id);
        fetchFeeds();
        // re-render settings to remove the deleted feed from list
        // delay slightly to allow feed fetch? No, fetchFeeds is async.
        // We should await fetchFeeds before re-rendering?
        // But fetchFeeds updates store, and store emits 'feeds-updated'.
        // Does 'feeds-updated' re-render settings?
        // No, 'feeds-updated' calls renderFeeds (the sidebar list).
        // So we need to explicitly call renderSettings() to update the management list.
        // But we should wait for fetchFeeds() to complete so store is updated.
        // wait... fetchFeeds() is async but we don't await result in the listener above?
        // Ah, fetchFeeds() returns Promise.
        await fetchFeeds();
        renderSettings();
      }
    });
  });

  document.querySelectorAll('.update-feed-tag-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id')!);
      const input = document.querySelector(`.feed-tag-input[data-id="${id}"]`) as HTMLInputElement;
      const category = input.value.trim();
      await updateFeed(id, { category });
      // updateFeed returns boolean, assuming success
      await fetchFeeds();
      await fetchTags();
      renderSettings(); // Update list to show persistence
      alert('Feed updated');
    });
  });
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

async function importOPML(file: File): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', 'opml');

    // We need to handle CSRF manually since apiFetch expects JSON or simple body
    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1];

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken || ''
      },
      body: formData
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to import OPML', err);
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
  try {
    const res = await apiFetch('/api/feed', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, _id: id })
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
    if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });

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
    appEl.className = `theme-${store.theme} font-${store.fontTheme}`;
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
