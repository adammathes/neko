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

async function fetchItems(feedId = null) {
    const listEl = document.getElementById('entries-list');
    listEl.innerHTML = '<div class="loading">Loading items...</div>';

    let url = '/api/stream/';
    if (feedId) {
        url += `?feed_id=${feedId}`;
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
        document.getElementById('feed-title').textContent = 'All Items';
        fetchItems();
    };
    nav.appendChild(allLink);

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
                <a href="${item.url}" class="entry-title" target="_blank">${item.title}</a>
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
