import './style.css';
import { apiFetch } from './api';
import { store } from './store';
import type { FilterType } from './store';
import { router } from './router';
import type { Feed, Item, Category } from './types';
import { createFeedItem } from './components/FeedItem';

// Extend Window interface for app object
declare global {
  interface Window {
    app: any;
  }
}

// Cache elements
const appEl = document.querySelector<HTMLDivElement>('#app')!;

// Initial Layout
function renderLayout() {
  appEl.className = `theme-${store.theme} font-${store.fontTheme}`;
  appEl.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2 onclick="window.app.navigate('/')" style="cursor: pointer">Neko v3</h2>
        </div>
        <div class="sidebar-search">
          <input type="search" id="search-input" placeholder="Search..." value="${store.searchQuery}">
        </div>
        <div class="sidebar-scroll">
          <section class="sidebar-section">
            <h3>Filters</h3>
            <ul id="filter-list" class="filter-list">
              <li class="filter-item" data-filter="unread"><a href="#" onclick="event.preventDefault(); window.app.setFilter('unread')">Unread</a></li>
              <li class="filter-item" data-filter="all"><a href="#" onclick="event.preventDefault(); window.app.setFilter('all')">All</a></li>
              <li class="filter-item" data-filter="starred"><a href="#" onclick="event.preventDefault(); window.app.setFilter('starred')">Starred</a></li>
            </ul>
          </section>
          <section class="sidebar-section">
            <h3>Tags</h3>
            <ul id="tag-list" class="tag-list"></ul>
          </section>
          <section class="sidebar-section">
            <h3>Feeds</h3>
            <ul id="feed-list" class="feed-list"></ul>
          </section>
        </div>
        <div class="sidebar-footer">
          <a href="#" onclick="event.preventDefault(); window.app.navigate('/settings')">Settings</a>
          <a href="#" onclick="event.preventDefault(); window.app.logout()">Logout</a>
        </div>
      </aside>
      <section class="item-list-pane">
        <header class="top-bar">
          <h1 id="view-title">All Items</h1>
        </header>
        <div id="item-list-container" class="item-list-container"></div>
      </section>
      <main class="item-detail-pane" id="main-pane">
        <div id="item-detail-content" class="item-detail-content">
          <div class="empty-state">Select an item to read</div>
        </div>
      </main>
    </div>
  `;

  // Attach search listener
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value;
    window.app.setSearch(query);
  });
}

renderLayout();

const feedListEl = document.getElementById('feed-list')!;
const tagListEl = document.getElementById('tag-list')!;
const filterListEl = document.getElementById('filter-list')!;
const viewTitleEl = document.getElementById('view-title')!;
const itemListEl = document.getElementById('item-list-container')!;
const itemDetailEl = document.getElementById('item-detail-content')!;

let activeItemId: number | null = null;

// --- Rendering Functions ---

function renderFeeds() {
  const { feeds, activeFeedId } = store;
  if (!feedListEl) return;
  feedListEl.innerHTML = feeds.map((feed: Feed) =>
    createFeedItem(feed, feed._id === activeFeedId)
  ).join('');
}

function renderTags() {
  const { tags, activeTagName } = store;
  if (!tagListEl) return;
  tagListEl.innerHTML = tags.map((tag: Category) => `
    <li class="tag-item ${tag.title === activeTagName ? 'active' : ''}">
      <a href="/v3/tag/${encodeURIComponent(tag.title)}" class="tag-link" onclick="event.preventDefault(); window.app.navigate('/tag/${encodeURIComponent(tag.title)}')">
        ${tag.title}
      </a>
    </li>
  `).join('');
}

function renderFilters() {
  const { filter } = store;
  if (!filterListEl) return;
  filterListEl.querySelectorAll('.filter-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-filter') === filter);
  });
}

function renderItems() {
  const { items, loading } = store;
  if (!itemListEl) return;

  if (loading && items.length === 0) {
    itemListEl.innerHTML = '<p class="loading">Loading items...</p>';
    return;
  }

  if (items.length === 0) {
    itemListEl.innerHTML = '<p class="empty">No items found.</p>';
    return;
  }

  itemListEl.innerHTML = `
    <ul class="item-list">
      ${items.map((item: Item) => `
        <li class="item-row ${item.read ? 'read' : ''} ${item._id === activeItemId ? 'active' : ''}" data-id="${item._id}">
          <div class="item-title">${item.title}</div>
          <div class="item-meta">${item.feed_title || ''}</div>
        </li>
      `).join('')}
    </ul>
    ${store.hasMore ? '<div id="load-more" class="load-more">Loading more...</div>' : ''}
  `;

  // Add click listeners to items
  itemListEl.querySelectorAll('.item-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt(row.getAttribute('data-id') || '0');
      selectItem(id);
    });
  });

  // Infinite scroll observer
  const loadMoreEl = document.getElementById('load-more');
  if (loadMoreEl) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !store.loading && store.hasMore) {
        loadMore();
      }
    }, { threshold: 0.1 });
    observer.observe(loadMoreEl);
  }
}

async function selectItem(id: number, scroll: boolean = false) {
  activeItemId = id;
  const item = store.items.find((i: Item) => i._id === id);
  if (!item) return;

  // Mark active row
  itemListEl.querySelectorAll('.item-row').forEach(row => {
    const rowId = parseInt(row.getAttribute('data-id') || '0');
    row.classList.toggle('active', rowId === id);
    if (scroll && rowId === id) {
      row.scrollIntoView({ block: 'nearest' });
    }
  });

  // Render basic detail
  itemDetailEl.innerHTML = `
    <article class="item-detail">
      <header>
        <h1><a href="${item.url}" target="_blank">${item.title}</a></h1>
        <div class="item-meta">
          From ${item.feed_title || 'Unknown'} on ${new Date(item.publish_date).toLocaleString()}
        </div>
        <div class="item-actions">
           <button onclick="window.app.toggleStar(${item._id})">${item.starred ? '★ Unstar' : '☆ Star'}</button>
           <button onclick="window.app.toggleRead(${item._id})">${item.read ? 'Unread' : 'Read'}</button>
        </div>
      </header>
      <div id="full-content" class="full-content">
        ${item.description || 'No description available.'}
      </div>
    </article>
  `;

  // Mark as read if not already
  if (!item.read) {
    updateItem(item._id, { read: true });
  }

  // Fetch full content if missing
  if (item.url && (!item.full_content || item.full_content === item.description)) {
    try {
      const res = await apiFetch(`/api/item/${item._id}/content`);
      if (res.ok) {
        const data = await res.json();
        if (data.full_content) {
          item.full_content = data.full_content;
          const contentEl = document.getElementById('full-content');
          if (contentEl) contentEl.innerHTML = data.full_content;
        }
      }
    } catch (err) {
      console.error('Failed to fetch full content', err);
    }
  }
}

async function updateItem(id: number, updates: Partial<Item>) {
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
        const row = itemListEl.querySelector(`.item-row[data-id="${id}"]`);
        if (row) {
          if (updates.read !== undefined) row.classList.toggle('read', updates.read);
        }
        // Update detail view if active
        if (activeItemId === id) {
          const starBtn = itemDetailEl.querySelector('.item-actions button');
          if (starBtn && updates.starred !== undefined) {
            starBtn.textContent = updates.starred ? '★ Unstar' : '☆ Star';
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to update item', err);
  }
}

function renderSettings() {
  viewTitleEl.textContent = 'Settings';
  itemListEl.innerHTML = '';
  itemDetailEl.innerHTML = `
        <div class="settings-view">
            <h2>Settings</h2>
            <section class="settings-section">
                <h3>Theme</h3>
                <div class="theme-options">
                    <button class="${store.theme === 'light' ? 'active' : ''}" onclick="window.app.setTheme('light')">Light</button>
                    <button class="${store.theme === 'dark' ? 'active' : ''}" onclick="window.app.setTheme('dark')">Dark</button>
                </div>
            </section>
            <section class="settings-section">
                <h3>Font</h3>
                <select onchange="window.app.setFontTheme(this.value)">
                    <option value="default" ${store.fontTheme === 'default' ? 'selected' : ''}>Default</option>
                    <option value="serif" ${store.fontTheme === 'serif' ? 'selected' : ''}>Serif</option>
                    <option value="mono" ${store.fontTheme === 'mono' ? 'selected' : ''}>Monospace</option>
                </select>
            </section>
        </div>
    `;
}

// --- Data Actions ---

async function fetchFeeds() {
  try {
    const res = await apiFetch('/api/feed/');
    if (!res.ok) throw new Error('Failed to fetch feeds');
    const feeds = await res.json();
    store.setFeeds(feeds);
  } catch (err) {
    console.error(err);
  }
}

async function fetchTags() {
  try {
    const res = await apiFetch('/api/tag');
    if (!res.ok) throw new Error('Failed to fetch tags');
    const tags = await res.json();
    store.setTags(tags);
  } catch (err) {
    console.error(err);
  }
}

async function fetchItems(feedId?: string, tagName?: string, append: boolean = false) {
  store.setLoading(true);
  try {
    let url = '/api/stream';
    const params = new URLSearchParams();
    if (feedId) params.append('feed_id', feedId);
    if (tagName) params.append('tag', tagName);
    if (store.searchQuery) params.append('q', store.searchQuery);

    if (store.filter === 'unread') params.append('read', 'false');
    if (store.filter === 'starred') params.append('starred', 'true');

    if (append && store.items.length > 0) {
      params.append('max_id', String(store.items[store.items.length - 1]._id));
    }

    const res = await apiFetch(`${url}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch items');
    const items = await res.json();

    store.setHasMore(items.length >= 50);
    store.setItems(items, append);

    if (!append) {
      activeItemId = null;
      itemDetailEl.innerHTML = '<div class="empty-state">Select an item to read</div>';
    }
  } catch (err) {
    console.error(err);
    if (!append) store.setItems([]);
  } finally {
    store.setLoading(false);
  }
}

async function loadMore() {
  const route = router.getCurrentRoute();
  fetchItems(route.params.feedId, route.params.tagName, true);
}

// --- App Logic ---

function handleRoute() {
  const route = router.getCurrentRoute();

  const filterFromQuery = route.query.get('filter') as FilterType;
  if (filterFromQuery && ['unread', 'all', 'starred'].includes(filterFromQuery)) {
    store.setFilter(filterFromQuery);
  }

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
    const feed = store.feeds.find((f: Feed) => f._id === id);
    viewTitleEl.textContent = feed ? feed.title : `Feed ${id}`;
    fetchItems(route.params.feedId);
  } else if (route.path === '/tag' && route.params.tagName) {
    store.setActiveTag(route.params.tagName);
    viewTitleEl.textContent = `Tag: ${route.params.tagName}`;
    fetchItems(undefined, route.params.tagName);
  } else {
    store.setActiveFeed(null);
    store.setActiveTag(null);
    viewTitleEl.textContent = 'All Items';
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
    selectItem(store.items[index]._id, true);
  }
}

// Subscribe to store
store.on('feeds-updated', renderFeeds);
store.on('tags-updated', renderTags);
store.on('active-feed-updated', renderFeeds);
store.on('active-tag-updated', renderTags);
store.on('filter-updated', () => {
  renderFilters();
  handleRoute();
});
store.on('search-updated', () => {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput && searchInput.value !== store.searchQuery) {
    searchInput.value = store.searchQuery;
  }
  handleRoute();
});
store.on('theme-updated', () => {
  appEl.className = `theme-${store.theme} font-${store.fontTheme}`;
});

store.on('items-updated', renderItems);
store.on('loading-state-changed', renderItems);

// Subscribe to router
router.addEventListener('route-changed', handleRoute);

// Global app object for inline handlers
window.app = {
  navigate: (path: string) => router.navigate(path),
  setFilter: (filter: FilterType) => router.updateQuery({ filter }),
  setSearch: (q: string) => {
    router.updateQuery({ q });
  },
  setTheme: (t: string) => store.setTheme(t),
  setFontTheme: (f: string) => store.setFontTheme(f),
  toggleStar: (id: number) => {
    const item = store.items.find(i => i._id === id);
    if (item) updateItem(id, { starred: !item.starred });
  },
  toggleRead: (id: number) => {
    const item = store.items.find(i => i._id === id);
    if (item) updateItem(id, { read: !item.read });
  },
  logout: async () => {
    await apiFetch('/api/logout', { method: 'POST' });
    window.location.href = '/login/';
  }
};

// Start
async function init() {
  const authRes = await apiFetch('/api/auth');
  if (authRes.status === 401) {
    window.location.href = '/login/';
    return;
  }

  renderFilters();
  await Promise.all([fetchFeeds(), fetchTags()]);
  handleRoute(); // handles initial route
}

init();
