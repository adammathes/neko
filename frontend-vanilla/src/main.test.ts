import { describe, it, expect, vi, beforeEach } from 'vitest';
import { store } from './store';
import { router } from './router';
import {
    renderLayout,
    renderFeeds,
    renderTags,
    renderFilters,
    renderItems,
    renderSettings,
    fetchFeeds,
    fetchTags,
    fetchItems,
    init,
    logout
} from './main';
import { apiFetch } from './api';

// Mock api
vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

// Mock IntersectionObserver as a constructor
class MockIntersectionObserver {
    constructor() {
        // unused
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

describe('main application logic', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/',
            pathname: '/v3/',
            search: '',
            assign: vi.fn(),
            replace: vi.fn()
        });
        vi.stubGlobal('history', {
            pushState: vi.fn()
        });
        // Mock scrollIntoView which is missing in JSDOM
        Element.prototype.scrollIntoView = vi.fn();
        vi.clearAllMocks();
        // Reset store
        store.setFeeds([]);
        store.setTags([]);
        store.setItems([]);

        // Setup default auth response
        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => []
        } as Response);
    });

    it('renderLayout should create sidebar and main content', () => {
        renderLayout();
        expect(document.getElementById('sidebar')).not.toBeNull();
        expect(document.getElementById('content-area')).not.toBeNull();
        expect(document.getElementById('sidebar-toggle-btn')).not.toBeNull();
    });

    it('renderFeeds should populate feed list', () => {
        renderLayout();
        store.setFeeds([{ _id: 1, title: 'Test Feed', url: 'test', web_url: 'test', category: 'tag' }]);
        renderFeeds();
        const feedList = document.getElementById('feed-list');
        expect(feedList?.innerHTML).toContain('Test Feed');
    });

    it('renderTags should populate tag list', () => {
        renderLayout();
        store.setTags([{ title: 'Test Tag' } as any]);
        renderTags();
        const tagList = document.getElementById('tag-list');
        expect(tagList?.innerHTML).toContain('Test Tag');
    });

    it('renderFilters should update active filter', () => {
        renderLayout();
        store.setFilter('starred');
        renderFilters();
        const starredFilter = document.querySelector('[data-filter="starred"]');
        expect(starredFilter?.classList.contains('active')).toBe(true);
    });

    it('renderItems should populate content area', () => {
        renderLayout();
        store.setItems([{ _id: 1, title: 'Item 1', url: 'test', publish_date: '2023-01-01' } as any]);
        renderItems();
        const contentArea = document.getElementById('content-area');
        expect(contentArea?.innerHTML).toContain('Item 1');
    });

    it('renderSettings should show theme and font options', () => {
        renderLayout();
        renderSettings();
        expect(document.querySelector('.settings-view')).not.toBeNull();
        expect(document.getElementById('font-selector')).not.toBeNull();
    });

    it('fetchFeeds should update store', async () => {
        vi.mocked(apiFetch).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ _id: 1, title: 'API Feed' }]
        } as Response);

        await fetchFeeds();
        expect(store.feeds).toHaveLength(1);
        expect(store.feeds[0].title).toBe('API Feed');
    });

    it('fetchTags should update store', async () => {
        vi.mocked(apiFetch).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ title: 'API Tag' }]
        } as Response);

        await fetchTags();
        expect(store.tags).toHaveLength(1);
        expect(store.tags[0].title).toBe('API Tag');
    });

    it('fetchItems should update store items', async () => {
        vi.mocked(apiFetch).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ _id: 1, title: 'API Item' }]
        } as Response);

        renderLayout();
        await fetchItems();
        expect(store.items).toHaveLength(1);
        expect(store.items[0].title).toBe('API Item');
    });

    it('init should coordinate startup', async () => {
        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => []
        } as Response);

        await init();
        expect(document.getElementById('sidebar')).not.toBeNull();
    });

    it('should handle search input', () => {
        renderLayout();
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const spy = vi.spyOn(router, 'updateQuery');
        searchInput.value = 'query';
        searchInput.dispatchEvent(new Event('input'));
        expect(spy).toHaveBeenCalledWith({ q: 'query' });
    });

    it('should handle sidebar navigation clicking', () => {
        renderLayout();
        const spy = vi.spyOn(router, 'updateQuery');
        const filterLink = document.querySelector('[data-nav="filter"]') as HTMLElement;
        filterLink.click();
        expect(spy).toHaveBeenCalled();
    });

    it('should handle item star toggle', async () => {
        renderLayout();
        const mockItem = { _id: 1, title: 'Item 1', starred: false, publish_date: '2023-01-01' } as any;
        store.setItems([mockItem]);
        renderItems();

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        const starBtn = document.querySelector('[data-action="toggle-star"]') as HTMLElement;
        starBtn.click();

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/1'), expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"starred":true')
        }));
    });

    it('should handle theme change in settings', () => {
        renderLayout();
        renderSettings();
        const darkBtn = document.querySelector('[data-theme="dark"]') as HTMLElement;
        const spy = vi.spyOn(store, 'setTheme');
        darkBtn.click();
        expect(spy).toHaveBeenCalledWith('dark');
    });

    it('should handle logout', async () => {
        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);
        await logout();
        expect(apiFetch).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
        expect(window.location.href).toBe('/login/');
    });

    it('should handle keyboard navigation j/k', () => {
        const mockItems = [
            { _id: 1, title: 'Item 1', publish_date: '2023-01-01', read: false },
            { _id: 2, title: 'Item 2', publish_date: '2023-01-01', read: false }
        ] as any;
        store.setItems(mockItems);
        renderLayout();
        renderItems();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
        expect(apiFetch).toHaveBeenCalled(); // mark as read

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
        // should go back to first item
    });

    it('should handle toggle star/read with keyboard', async () => {
        const mockItem = { _id: 1, title: 'Item 1', publish_date: '2023-01-01', read: true, starred: false } as any;
        store.setItems([mockItem]);
        renderLayout();
        renderItems();

        // Already read, so 'j' won't trigger updateItem for read=true
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        // Toggle star
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/1'), expect.objectContaining({
            body: expect.stringContaining('"starred":true')
        }));

        // Toggle read (currently true -> false)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
        expect(apiFetch).toHaveBeenLastCalledWith(expect.stringContaining('/api/item/1'), expect.objectContaining({
            body: expect.stringContaining('"read":false')
        }));
    });

    it('should focus search with /', () => {
        renderLayout();
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const spy = vi.spyOn(searchInput, 'focus');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
        expect(spy).toHaveBeenCalled();
    });

    it('should handle sidebar toggle', () => {
        renderLayout();
        const toggleBtn = document.getElementById('sidebar-toggle-btn') as HTMLElement;
        const initialVisible = store.sidebarVisible;
        toggleBtn.click();
        expect(store.sidebarVisible).toBe(!initialVisible);
    });

    it('should mark item as read when scrolled past', async () => {
        vi.useRealTimers();
        const mockItem = {
            _id: 123,
            title: 'Scroll Test Item',
            read: false,
            url: 'http://example.com',
            publish_date: '2023-01-01'
        } as any;

        store.setItems([mockItem]);
        renderLayout();
        renderItems();

        const itemEl = document.querySelector(`.feed-item[data-id="123"]`);
        expect(itemEl).not.toBeNull();

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        // Mock getBoundingClientRect
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 500, height: 500, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        if (itemEl) {
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: -150, bottom: -50, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        // Trigger scroll
        mainContent?.dispatchEvent(new Event('scroll'));

        // Wait for throttle (250ms)
        await new Promise(resolve => setTimeout(resolve, 300));

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/123'), expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"read":true')
        }));
    });

    it('should close settings and return to home when clicking settings again', () => {
        renderLayout();
        const settingsLink = document.querySelector('[data-nav="settings"]') as HTMLElement;
        expect(settingsLink).not.toBeNull();

        const getCurrentRouteSpy = vi.spyOn(router, 'getCurrentRoute').mockReturnValue({ path: '/settings', params: {}, query: new URLSearchParams() });
        const navigateSpy = vi.spyOn(router, 'navigate');

        settingsLink.click();

        expect(navigateSpy).toHaveBeenCalledWith('/', expect.any(Object));
        getCurrentRouteSpy.mockRestore();
    });

    it('should navigate to home with filter when clicking filter from settings', () => {
        renderLayout();
        const getCurrentRouteSpy = vi.spyOn(router, 'getCurrentRoute').mockReturnValue({ path: '/settings', params: {}, query: new URLSearchParams() });
        const navigateSpy = vi.spyOn(router, 'navigate');

        const filterLink = document.querySelector('a[data-nav="filter"][data-value="starred"]') as HTMLElement;
        expect(filterLink).not.toBeNull();
        filterLink.click();

        expect(navigateSpy).toHaveBeenCalledWith('/', expect.objectContaining({ filter: 'starred' }));
        getCurrentRouteSpy.mockRestore();
    });

    it('should navigate to feed when clicking feed from settings page', () => {
        renderLayout();
        store.setFeeds([{ _id: 5, title: 'My Feed', url: 'http://test', web_url: 'http://test', category: '' }]);
        store.setActiveFeed(5); // was viewing this feed before settings
        renderFeeds();

        const getCurrentRouteSpy = vi.spyOn(router, 'getCurrentRoute').mockReturnValue({ path: '/settings', params: {}, query: new URLSearchParams() });
        const navigateSpy = vi.spyOn(router, 'navigate');

        const feedLink = document.querySelector('a[data-nav="feed"][data-value="5"]') as HTMLElement;
        expect(feedLink).not.toBeNull();
        feedLink.click();

        // Should navigate to feed, not toggle to home (even though feed 5 was active)
        expect(navigateSpy).toHaveBeenCalledWith('/feed/5', expect.any(Object));
        getCurrentRouteSpy.mockRestore();
    });

    it('should navigate to tag when clicking tag from settings page', () => {
        renderLayout();
        store.setTags([{ title: 'Tech' } as any]);
        renderTags();

        const getCurrentRouteSpy = vi.spyOn(router, 'getCurrentRoute').mockReturnValue({ path: '/settings', params: {}, query: new URLSearchParams() });
        const navigateSpy = vi.spyOn(router, 'navigate');

        const tagLink = document.querySelector('a[data-nav="tag"][data-value="Tech"]') as HTMLElement;
        expect(tagLink).not.toBeNull();
        tagLink.click();

        expect(navigateSpy).toHaveBeenCalledWith('/tag/Tech', expect.any(Object));
        getCurrentRouteSpy.mockRestore();
    });

    it('deleteFeed should call API', async () => {
        vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true } as Response);
        const { deleteFeed } = await import('./main');
        await deleteFeed(123);
        expect(apiFetch).toHaveBeenCalledWith('/api/feed/123', expect.objectContaining({ method: 'DELETE' }));
    });

    it('updateFeed should call API with merged data', async () => {
        store.setFeeds([{ _id: 123, title: 'Test Feed', url: 'http://example.com' } as any]);
        vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true } as Response);
        const { updateFeed } = await import('./main');
        await updateFeed(123, { category: 'New Tag' });

        expect(apiFetch).toHaveBeenCalledWith('/api/feed', expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"category":"New Tag"')
        }));
        // Should verify it merged the title
        expect(apiFetch).toHaveBeenCalledWith('/api/feed', expect.objectContaining({
            body: expect.stringContaining('"title":"Test Feed"')
        }));
    });

    it('renderSettings should show manage feeds section', () => {
        store.setFeeds([{ _id: 1, title: 'My Feed', url: 'http://example.com', category: 'Tech' } as any]);
        renderLayout();
        renderSettings();
        const manageSection = document.querySelector('.manage-feeds-section');
        expect(manageSection).not.toBeNull();
        expect(manageSection?.innerHTML).toContain('My Feed');
        expect(document.querySelector('.feed-tag-input')).not.toBeNull();
    });

    it('should navigate items with j/k keys', () => {
        store.setItems([
            { _id: 101, title: 'Item 1', publish_date: '2023-01-01', read: false } as any,
            { _id: 102, title: 'Item 2', publish_date: '2023-01-02', read: false } as any
        ]);
        renderLayout();
        renderItems();

        // 1st press 'j' -> index 0
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
        expect(document.querySelector('.feed-item[data-id="101"]')?.classList.contains('selected')).toBe(true);

        // 2nd press 'j' -> index 1
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
        expect(document.querySelector('.feed-item[data-id="102"]')?.classList.contains('selected')).toBe(true);

        // Press 'k' -> back to index 0
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
        expect(document.querySelector('.feed-item[data-id="101"]')?.classList.contains('selected')).toBe(true);
    });
});
