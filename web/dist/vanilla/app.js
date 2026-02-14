document.addEventListener('DOMContentLoaded', () => {
    fetchFeeds();
    fetchItems(); // Default to fetching recent items

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                document.getElementById('feed-title').textContent = `Search: ${query}`;
                document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
                fetchItems(null, null, query);
            }
        }
    });
});

export async function fetchFeeds(apiBase = '') {
    try {
        const response = await fetch(`${apiBase}/api/feed/`);
        if (!response.ok) throw new Error('Failed to fetch feeds');
        const feeds = await response.json();
        renderFeeds(feeds);
        return feeds;
    } catch (err) {
        console.error(err);
        const nav = document.getElementById('feeds-nav');
        if (nav) nav.innerHTML = '<div class="error">Error loading feeds</div>';
        throw err;
    }
}

export async function fetchItems(feedId = null, filter = null, query = null, apiBase = '') {
    const listEl = document.getElementById('entries-list');
    if (listEl) listEl.innerHTML = '<div class="loading">Loading items...</div>';

    let url = `${apiBase}/api/stream/`;
    const params = new URLSearchParams();
    if (feedId) params.append('feed_id', feedId);
    if (filter === 'unread') params.append('read_filter', 'unread');
    if (filter === 'starred') params.append('starred', 'true');
    if (query) params.append('q', query);

    if ([...params].length > 0) {
        url += '?' + params.toString();
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch items');
        const items = await response.json();
        renderItems(items);
        return items;
    } catch (err) {
        console.error(err);
        if (listEl) listEl.innerHTML = '<div class="error">Error loading items</div>';
        throw err;
    }
}

export function renderFeeds(feeds) {
    const nav = document.getElementById('feeds-nav');
    if (!nav) return;

    // Clear existing items but keep search container if present
    const searchContainer = nav.querySelector('.search-container');
    nav.innerHTML = '';
    if (searchContainer) nav.appendChild(searchContainer);

    const allLink = document.createElement('div');
    allLink.className = 'feed-item';
    allLink.textContent = 'All Items';
    allLink.onclick = () => {
        document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
        allLink.classList.add('active');
        const title = document.getElementById('feed-title');
        if (title) title.textContent = 'All Items';
        fetchItems();
    };
    nav.appendChild(allLink);

    const unreadLink = document.createElement('div');
    unreadLink.className = 'feed-item';
    unreadLink.textContent = 'Unread Items';
    unreadLink.onclick = () => {
        document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
        unreadLink.classList.add('active');
        const title = document.getElementById('feed-title');
        if (title) title.textContent = 'Unread Items';
        fetchItems(null, 'unread');
    };
    nav.appendChild(unreadLink);

    const starredLink = document.createElement('div');
    starredLink.className = 'feed-item';
    starredLink.textContent = 'Starred Items';
    starredLink.onclick = () => {
        document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
        starredLink.classList.add('active');
        const title = document.getElementById('feed-title');
        if (title) title.textContent = 'Starred Items';
        fetchItems(null, 'starred');
    };
    nav.appendChild(starredLink);

    if (Array.isArray(feeds)) {
        feeds.forEach(feed => {
            const div = document.createElement('div');
            div.className = 'feed-item';
            div.textContent = feed.title || feed.url;
            div.title = feed.url;
            div.onclick = () => {
                document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
                const title = document.getElementById('feed-title');
                if (title) title.textContent = feed.title;
                fetchItems(feed.id);
            };
            nav.appendChild(div);
        });
    }
}

export function renderItems(items) {
    const list = document.getElementById('entries-list');
    if (!list) return;
    list.innerHTML = '';

    if (!items || items.length === 0) {
        list.innerHTML = '<div class="empty">No items found.</div>';
        return;
    }

    items.forEach(item => {
        const article = document.createElement('article');
        article.className = 'entry';

        const date = new Date(item.published_at || item.created_at).toLocaleString();

        article.innerHTML = `
            <header class="entry-header">
                <div class="entry-controls">
                    <button class="btn-star ${item.starred ? 'active' : ''}" data-id="${item.id}" data-starred="${item.starred}">${item.starred ? '★' : '☆'}</button>
                    <button class="btn-read ${item.read ? 'read' : 'unread'}" data-id="${item.id}" data-read="${item.read}">${item.read ? 'Mark Unread' : 'Mark Read'}</button>
                </div>
                <a href="${item.url}" class="entry-title ${item.read ? 'read' : ''}" target="_blank">${item.title}</a>
                <div class="entry-meta">
                    ${item.feed ? `<span class="feed-name">${item.feed.title}</span> • ` : ''}
                    <span class="date">${date}</span>
                </div>
            </header>
            <div class="entry-content">
                ${item.description || ''}
            </div>
        `;

        // Add event listeners programmatically to avoid inline onclick with modules
        const starBtn = article.querySelector('.btn-star');
        starBtn.onclick = () => toggleStar(item.id, item.starred, starBtn);

        const readBtn = article.querySelector('.btn-read');
        readBtn.onclick = () => toggleRead(item.id, item.read, readBtn);

        list.appendChild(article);
    });
}

export async function toggleStar(id, currentStatus, btn, apiBase = '') {
    const newStatus = !currentStatus;
    try {
        const response = await fetch(`${apiBase}/api/item/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, starred: newStatus })
        });
        if (!response.ok) throw new Error('Failed to toggle star');

        // Update UI
        btn.textContent = newStatus ? '★' : '☆';
        btn.classList.toggle('active');
        btn.onclick = () => toggleStar(id, newStatus, btn, apiBase);

        // Update data attributes
        btn.dataset.starred = newStatus;

        return newStatus;
    } catch (err) {
        console.error(err);
        alert('Error toggling star');
        throw err;
    }
}

export async function toggleRead(id, currentStatus, btn, apiBase = '') {
    const newStatus = !currentStatus;
    try {
        const response = await fetch(`${apiBase}/api/item/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, read: newStatus })
        });
        if (!response.ok) throw new Error('Failed to toggle read');

        // Update UI
        btn.textContent = newStatus ? 'Mark Unread' : 'Mark Read';
        btn.classList.toggle('read');
        btn.classList.toggle('unread');
        btn.onclick = () => toggleRead(id, newStatus, btn, apiBase);

        // Update data attributes
        btn.dataset.read = newStatus;

        // Find title and dim it if read
        const header = btn.closest('.entry-header');
        if (header) {
            const title = header.querySelector('.entry-title');
            if (title) {
                if (newStatus) {
                    title.classList.add('read');
                } else {
                    title.classList.remove('read');
                }
            }
        }

        return newStatus;
    } catch (err) {
        console.error(err);
        alert('Error toggling read status');
        throw err;
    }
}

export function init() {
    if (typeof document !== 'undefined') {
        // Only run if we're in a browser environment with these elements
        if (document.getElementById('feeds-nav')) {
            fetchFeeds();
            fetchItems();

            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const query = searchInput.value.trim();
                        if (query) {
                            const title = document.getElementById('feed-title');
                            if (title) title.textContent = `Search: ${query}`;
                            document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
                            fetchItems(null, null, query);
                        }
                    }
                });
            }
        }
    }
}
