// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFeeds, fetchItems, renderFeeds, renderItems, toggleStar, toggleRead } from './app.js';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('Vanilla JS App', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="app">
                <aside id="sidebar">
                    <nav id="feeds-nav">
                        <div class="search-container">
                            <input type="text" id="search-input" />
                        </div>
                    </nav>
                </aside>
                <main id="main">
                    <header id="main-header">
                        <h2 id="feed-title">All Items</h2>
                    </header>
                    <div id="entries-list"></div>
                </main>
            </div>
        `;
        fetchMock.mockReset();
    });

    describe('fetchFeeds', () => {
        it('should fetch feeds and render them', async () => {
            const mockFeeds = [{ id: 1, title: 'Test Feed', url: 'http://example.com' }];
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockFeeds,
            });

            await fetchFeeds();

            expect(fetchMock).toHaveBeenCalledWith('/api/feed/');
            const feedItems = document.querySelectorAll('.feed-item');
            // "All Items", "Unread Items", "Starred Items", plus 1 feed = 4 items
            expect(feedItems.length).toBe(4);
            expect(feedItems[3].textContent).toBe('Test Feed');
        });

        it('should handle errors gracefully', async () => {
            fetchMock.mockRejectedValue(new Error('Network error'));
            await expect(fetchFeeds()).rejects.toThrow('Network error');
            expect(document.getElementById('feeds-nav').innerHTML).toContain('Error loading feeds');
        });
    });

    describe('fetchItems', () => {
        it('should fetch items and render them', async () => {
            const mockItems = [{
                id: 101,
                title: 'Item 1',
                url: 'http://example.com/1',
                feed: { title: 'Feed A' },
                starred: false,
                read: false
            }];
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockItems,
            });

            await fetchItems();

            expect(fetchMock).toHaveBeenCalledWith('/api/stream/');
            const entries = document.querySelectorAll('.entry');
            expect(entries.length).toBe(1);
            expect(entries[0].querySelector('.entry-title').textContent).toBe('Item 1');
        });

        it('should handle filters', async () => {
            fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

            await fetchItems(123, 'unread', 'query');

            const expectedUrl = '/api/stream/?feed_id=123&read_filter=unread&q=query';
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('feed_id=123'));
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('read_filter=unread'));
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('q=query'));
        });
    });

    describe('renderFeeds', () => {
        it('should render system feeds and user feeds', async () => {
            const feeds = [
                { id: 1, title: 'Feed 1', url: 'u1' },
                { id: 2, title: 'Feed 2', url: 'u2' }
            ];
            // Mock fetch for the click handler
            fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

            renderFeeds(feeds);

            const items = document.querySelectorAll('.feed-item');
            expect(items.length).toBe(5); // All, Unread, Starred, Feed 1, Feed 2

            // Click handler test: All Items
            items[0].click();
            expect(items[0].classList.contains('active')).toBe(true);
            expect(document.getElementById('feed-title').textContent).toBe('All Items');
            expect(fetchMock).toHaveBeenCalledWith('/api/stream/');

            // Click handler test: Unread Items
            items[1].click();
            expect(items[1].classList.contains('active')).toBe(true);
            expect(document.getElementById('feed-title').textContent).toBe('Unread Items');
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('read_filter=unread'));

            // Click handler test: Starred Items
            items[2].click();
            expect(items[2].classList.contains('active')).toBe(true);
            expect(document.getElementById('feed-title').textContent).toBe('Starred Items');
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('starred=true'));

            // Click handler test: Specific Feed
            items[3].click();
            expect(items[3].classList.contains('active')).toBe(true);
            expect(document.getElementById('feed-title').textContent).toBe('Feed 1');
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('feed_id=1'));

            // Wait for async operations to complete to avoid unhandled rejections
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    });

    describe('renderItems', () => {
        it('should render "No items found" if empty', () => {
            renderItems([]);
            expect(document.getElementById('entries-list').innerHTML).toContain('No items found');
        });

        it('should render items with correct controls', () => {
            const items = [{
                id: 1,
                title: 'Test',
                url: 'http://test.com',
                starred: true,
                read: false,
                feed: { title: 'Feed' },
                created_at: new Date().toISOString()
            }];
            renderItems(items);

            const starBtn = document.querySelector('.btn-star');
            expect(starBtn.textContent).toBe('★');
            expect(starBtn.classList.contains('active')).toBe(true);

            const readBtn = document.querySelector('.btn-read');
            expect(readBtn.textContent).toBe('Mark Read');
            expect(readBtn.classList.contains('unread')).toBe(true);
        });
    });

    describe('Interaction Toggles', () => {
        let btn;
        beforeEach(() => {
            btn = document.createElement('button');
            document.body.appendChild(btn);
        });
        afterEach(() => {
            if (btn) btn.remove();
        });

        it('should toggle star status', async () => {
            fetchMock.mockResolvedValue({ ok: true });

            const newStatus = await toggleStar(1, false, btn);

            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/item/1'), expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ id: 1, starred: true })
            }));
            expect(newStatus).toBe(true);
            expect(btn.textContent).toBe('★');
        });

        it('should toggle read status', async () => {
            fetchMock.mockResolvedValue({ ok: true });

            // Setup DOM for title dimming
            const header = document.createElement('div');
            header.className = 'entry-header';
            const title = document.createElement('a');
            title.className = 'entry-title';
            header.appendChild(btn); // btn inside header
            header.appendChild(title);
            document.body.appendChild(header);

            const newStatus = await toggleRead(1, false, btn);

            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/item/1'), expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ id: 1, read: true })
            }));
            expect(newStatus).toBe(true);
            expect(title.classList.contains('read')).toBe(true);
        });

    });

    describe('Error Handling', () => {
        it('fetchItems should handle existing list element error', async () => {
            fetchMock.mockRejectedValue(new Error('Fetch failed'));
            await expect(fetchItems()).rejects.toThrow('Fetch failed');
            expect(document.getElementById('entries-list').innerHTML).toContain('Error loading items');
        });
    });

    describe('init', () => {
        it('should initialize app if elements exist', async () => {
            // Mock fetch for the init calls
            fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

            const addEventListenerSpy = vi.spyOn(document.getElementById('search-input'), 'addEventListener');
            // init is already imported
            const { init } = await import('./app.js');
            // Reset mocks
            fetchMock.mockClear();

            init();

            expect(fetchMock).toHaveBeenCalledTimes(2); // fetchFeeds + fetchItems
            expect(addEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function));

            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should do nothing if feeds-nav missing', async () => {
            document.body.innerHTML = ''; // Clear DOM
            fetchMock.mockClear();
            const { init } = await import('./app.js');

            init();

            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe('Search Interaction', () => {
        it('should trigger search on Enter', async () => {
            // Mock fetch for the init calls & search
            fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

            // Re-setup DOM and Init
            const { init } = await import('./app.js');
            init();
            fetchMock.mockClear();

            const searchInput = document.getElementById('search-input');
            searchInput.value = 'test query';

            // Create Enter keypress event
            const event = new KeyboardEvent('keypress', { key: 'Enter' });
            searchInput.dispatchEvent(event);

            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('q=test+query'));
            expect(document.getElementById('feed-title').textContent).toBe('Search: test query');

            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should ignore empty search', async () => {
            // Mock fetch for the init calls
            fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

            const { init } = await import('./app.js');
            init();
            fetchMock.mockClear();

            const searchInput = document.getElementById('search-input');
            searchInput.value = '   ';

            const event = new KeyboardEvent('keypress', { key: 'Enter' });
            searchInput.dispatchEvent(event);

            expect(fetchMock).not.toHaveBeenCalled();

            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    });
});
