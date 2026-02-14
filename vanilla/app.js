document.addEventListener('DOMContentLoaded', () => {
    fetchFeeds();
    fetchItems(); // Default to fetching recent items
});

async function fetchFeeds() {
    try {
        const response = await fetch('/api/feed/');
        if (!response.ok) throw new Error('Failed to fetch feeds');
        const feeds = await response.json();
        renderFeeds(feeds);
    } catch (err) {
        console.error(err);
        document.getElementById('feeds-nav').innerHTML = '<div class="error">Error loading feeds</div>';
    }
}

async function fetchItems(feedId = null, filter = null) {
    const listEl = document.getElementById('entries-list');
    listEl.innerHTML = '<div class="loading">Loading items...</div>';

    let url = '/api/stream/';
    const params = new URLSearchParams();
    if (feedId) params.append('feed_id', feedId);
    if (filter === 'unread') params.append('read_filter', 'unread');
    if (filter === 'starred') params.append('starred', 'true');

    if ([...params].length > 0) {
        url += '?' + params.toString();
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch items');
        const items = await response.json();
        renderItems(items);
    } catch (err) {
        console.error(err);
        listEl.innerHTML = '<div class="error">Error loading items</div>';
    }
}

function renderFeeds(feeds) {
    const nav = document.getElementById('feeds-nav');
    nav.innerHTML = '';

    const allLink = document.createElement('div');
    allLink.className = 'feed-item';
    allLink.textContent = 'All Items';
    allLink.onclick = () => {
        document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
        allLink.classList.add('active');
        document.getElementById('feed-title').textContent = 'All Items';
        fetchItems();
    };
    nav.appendChild(allLink);

    const unreadLink = document.createElement('div');
    unreadLink.className = 'feed-item';
    unreadLink.textContent = 'Unread Items';
    unreadLink.onclick = () => {
        document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
        unreadLink.classList.add('active');
        document.getElementById('feed-title').textContent = 'Unread Items';
        fetchItems(null, 'unread');
    };
    nav.appendChild(unreadLink);

    const starredLink = document.createElement('div');
    starredLink.className = 'feed-item';
    starredLink.textContent = 'Starred Items';
    starredLink.onclick = () => {
        document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
        starredLink.classList.add('active');
        document.getElementById('feed-title').textContent = 'Starred Items';
        fetchItems(null, 'starred');
    };
    nav.appendChild(starredLink);

    feeds.forEach(feed => {
        const div = document.createElement('div');
        div.className = 'feed-item';
        div.textContent = feed.title || feed.url;
        div.title = feed.url;
        div.onclick = () => {
            document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            document.getElementById('feed-title').textContent = feed.title;
            fetchItems(feed.id);
        };
        nav.appendChild(div);
    });
}

function renderItems(items) {
    const list = document.getElementById('entries-list');
    list.innerHTML = '';

    if (items.length === 0) {
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
                    <button class="btn-star ${item.starred ? 'active' : ''}" onclick="toggleStar(${item.id}, ${item.starred}, this)">${item.starred ? '★' : '☆'}</button>
                    <button class="btn-read ${item.read ? 'read' : 'unread'}" onclick="toggleRead(${item.id}, ${item.read}, this)">${item.read ? 'Mark Unread' : 'Mark Read'}</button>
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
        list.appendChild(article);
    });
}

async function toggleStar(id, currentStatus, btn) {
    const newStatus = !currentStatus;
    try {
        const response = await fetch(`/api/item/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, starred: newStatus })
        });
        if (!response.ok) throw new Error('Failed to toggle star');

        // Update UI
        btn.textContent = newStatus ? '★' : '☆';
        btn.classList.toggle('active');
        btn.onclick = () => toggleStar(id, newStatus, btn);
    } catch (err) {
        console.error(err);
        alert('Error toggling star');
    }
}

async function toggleRead(id, currentStatus, btn) {
    const newStatus = !currentStatus;
    try {
        const response = await fetch(`/api/item/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, read: newStatus })
        });
        if (!response.ok) throw new Error('Failed to toggle read');

        // Update UI
        btn.textContent = newStatus ? 'Mark Unread' : 'Mark Read';
        btn.classList.toggle('read');
        btn.classList.toggle('unread');
        btn.onclick = () => toggleRead(id, newStatus, btn);

        // Find title and dim it if read
        const header = btn.closest('.entry-header');
        const title = header.querySelector('.entry-title');
        if (newStatus) {
            title.classList.add('read');
        } else {
            title.classList.remove('read');
        }

    } catch (err) {
        console.error(err);
        alert('Error toggling read status');
    }
}
