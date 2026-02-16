import './style.css';
import { apiFetch } from './api';
import { store } from './store';
import { router } from './router';
import type { Feed, Item } from './types';
import { createFeedItem } from './components/FeedItem';

// Cache elements
const appEl = document.querySelector<HTMLDivElement>('#app')!;

// Initial Layout
appEl.innerHTML = `
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Neko v3</h2>
      </div>
      <ul id="feed-list" class="feed-list"></ul>
    </aside>
    <section class="item-list-pane">
      <header class="top-bar">
        <h1 id="view-title">All Items</h1>
      </header>
      <div id="item-list-container" class="item-list-container"></div>
    </section>
    <main class="item-detail-pane">
      <div id="item-detail-content" class="item-detail-content">
        <div class="empty-state">Select an item to read</div>
      </div>
    </main>
  </div>
`;

const feedListEl = document.getElementById('feed-list')!;
const viewTitleEl = document.getElementById('view-title')!;
const itemListEl = document.getElementById('item-list-container')!;
const itemDetailEl = document.getElementById('item-detail-content')!;

// --- Rendering Functions ---

function renderFeeds() {
  const { feeds, activeFeedId } = store;
  feedListEl.innerHTML = feeds.map((feed: Feed) =>
    createFeedItem(feed, feed._id === activeFeedId)
  ).join('');
}

function renderItems() {
  const { items, loading } = store;

  if (loading) {
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
        <li class="item-row ${item.read ? 'read' : ''}" data-id="${item._id}">
          <div class="item-title">${item.title}</div>
          <div class="item-meta">${item.feed_title || ''}</div>
        </li>
      `).join('')}
    </ul>
  `;

  // Add click listeners to items
  itemListEl.querySelectorAll('.item-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt(row.getAttribute('data-id') || '0');
      selectItem(id);
    });
  });
}

async function selectItem(id: number) {
  const item = store.items.find((i: Item) => i._id === id);
  if (!item) return;

  // Mark active row
  itemListEl.querySelectorAll('.item-row').forEach(row => {
    row.classList.toggle('active', parseInt(row.getAttribute('data-id') || '0') === id);
  });

  // Render basic detail
  itemDetailEl.innerHTML = `
    <article class="item-detail">
      <header>
        <h1><a href="${item.url}" target="_blank">${item.title}</a></h1>
        <div class="item-meta">
          From ${item.feed_title || 'Unknown'} on ${new Date(item.publish_date).toLocaleString()}
        </div>
      </header>
      <div id="full-content" class="full-content">
        ${item.description || 'No description available.'}
      </div>
    </article>
  `;

  // Mark as read if not already
  if (!item.read) {
    try {
      await apiFetch(`/api/item/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });
      item.read = true;
      const row = itemListEl.querySelector(`.item-row[data-id="${id}"]`);
      if (row) row.classList.add('read');
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
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

async function fetchItems(feedId?: string, tagName?: string) {
  store.setLoading(true);
  try {
    let url = '/api/stream';
    const params = new URLSearchParams();
    if (feedId) params.append('feed_id', feedId);
    if (tagName) params.append('tag', tagName);

    const res = await apiFetch(`${url}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch items');
    const items = await res.json();
    store.setItems(items);
    itemDetailEl.innerHTML = '<div class="empty-state">Select an item to read</div>';
  } catch (err) {
    console.error(err);
    store.setItems([]);
  } finally {
    store.setLoading(false);
  }
}

// --- App Logic ---

function handleRoute() {
  const route = router.getCurrentRoute();

  if (route.path === '/feed' && route.params.feedId) {
    const id = parseInt(route.params.feedId);
    store.setActiveFeed(id);
    const feed = store.feeds.find((f: Feed) => f._id === id);
    viewTitleEl.textContent = feed ? feed.title : `Feed ${id}`;
    fetchItems(route.params.feedId);
  } else if (route.path === '/tag' && route.params.tagName) {
    store.setActiveFeed(null);
    viewTitleEl.textContent = `Tag: ${route.params.tagName}`;
    fetchItems(undefined, route.params.tagName);
  } else {
    store.setActiveFeed(null);
    viewTitleEl.textContent = 'All Items';
    fetchItems();
  }
}

// Subscribe to store
store.on('feeds-updated', renderFeeds);
store.on('active-feed-updated', renderFeeds);
store.on('items-updated', renderItems);
store.on('loading-state-changed', renderItems);

// Subscribe to router
router.addEventListener('route-changed', handleRoute);

// Global app object for inline handlers
(window as any).app = {
  navigate: (path: string) => router.navigate(path)
};

// Start
async function init() {
  const authRes = await apiFetch('/api/auth');
  if (authRes.status === 401) {
    window.location.href = '/login/';
    return;
  }

  await fetchFeeds();
  handleRoute(); // handles initial route
}

init();
