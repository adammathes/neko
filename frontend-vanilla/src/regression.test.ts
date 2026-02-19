import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { store } from './store';
import { apiFetch } from './api';
import { renderItems, renderLayout } from './main';
import { createFeedItem } from './components/FeedItem';

// Mock api
vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

// Mock IntersectionObserver
class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

describe('Scroll-to-Read Regression Tests', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"><div id="main-content"><div id="content-area"></div></div></div>';
        // Mock scrollIntoView
        Element.prototype.scrollIntoView = vi.fn();
        vi.clearAllMocks();

        // Reset store state thoroughly
        store.setItems([]);
        store.setLoading(false);
        store.setHasMore(true);
        store.setActiveFeed(null);
        store.setActiveTag(null);
        store.setFilter('unread');
        store.setSearchQuery('');

        // Setup default auth response
        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => []
        } as Response);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should mark item as read when existing in store and fully scrolled past (bottom < container top)', async () => {
        vi.useRealTimers();
        const mockItem = {
            _id: 999,
            title: 'Regression Test Item',
            read: false,
            url: 'http://example.com/regression',
            publish_date: '2023-01-01'
        } as any;

        store.setItems([mockItem]);

        // Manual setup
        const mainContent = document.getElementById('main-content');
        expect(mainContent).not.toBeNull();
        renderItems();

        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 800, height: 800, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        const itemEl = document.querySelector(`.feed-item[data-id="999"]`);
        expect(itemEl).not.toBeNull();

        if (itemEl) {
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: -150, bottom: -50, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        mainContent?.dispatchEvent(new Event('scroll'));

        // Wait for throttle (250ms) + buffer
        await new Promise(resolve => setTimeout(resolve, 300));

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/999'), expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"read":true')
        }));
    });

    it('should NOT mark item as read if only partially scrolled past', async () => {
        vi.useRealTimers();
        const mockItem = {
            _id: 777,
            title: 'Partial Test Item',
            read: false,
            url: 'http://example.com/partial',
            publish_date: '2023-01-01'
        } as any;

        store.setItems([mockItem]);
        renderItems();

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 800, height: 800, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        const itemEl = document.querySelector(`.feed-item[data-id="777"]`);
        if (itemEl) {
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: -50, bottom: 50, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        mainContent?.dispatchEvent(new Event('scroll'));
        await new Promise(resolve => setTimeout(resolve, 300));

        expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/item/777'), expect.anything());
    });

    it('should mark item as read when WINDOW scrolls (robustness fallback)', async () => {
        vi.useRealTimers();
        const mockItem = {
            _id: 12345,
            title: 'Window Scroll Item',
            read: false,
            url: 'http://example.com/window',
            publish_date: '2023-01-01'
        } as any;

        store.setItems([mockItem]);
        renderItems();

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 800, height: 800, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        const itemEl = document.querySelector(`.feed-item[data-id="12345"]`);
        if (itemEl) {
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: -150, bottom: -50, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        window.dispatchEvent(new Event('scroll'));

        // The window scroll listener triggers checkReadItems in 1s interval (wait > 1s)
        await new Promise(resolve => setTimeout(resolve, 1100));

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/12345'), expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"read":true')
        }));
    });
});

// NK-t8qnrh: Links in feed item descriptions should have no underlines (match v1 style)
describe('NK-t8qnrh: Feed item description links have no underlines', () => {
    it('item-description should be rendered inside feed items', () => {
        const item = {
            _id: 1,
            title: 'Test',
            url: 'http://example.com',
            description: '<p>Text with <a href="http://example.com">a link</a></p>',
            read: false,
            starred: false,
            publish_date: '2024-01-01',
        } as any;
        const html = createFeedItem(item);
        expect(html).toContain('class="item-description"');
        expect(html).toContain('<a href="http://example.com">a link</a>');
    });
});

// NK-mcl01m: Sidebar order should be filters → search → "+ new" → Feeds
describe('NK-mcl01m: Sidebar section order', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        vi.mocked(apiFetch).mockResolvedValue({ ok: true, status: 200, json: async () => [] } as Response);
        renderLayout();
    });

    it('filter-list appears before section-feeds in the sidebar', () => {
        const sidebar = document.getElementById('sidebar');
        expect(sidebar).not.toBeNull();
        const filterList = sidebar!.querySelector('#filter-list');
        const sectionFeeds = sidebar!.querySelector('#section-feeds');
        expect(filterList).not.toBeNull();
        expect(sectionFeeds).not.toBeNull();
        const position = filterList!.compareDocumentPosition(sectionFeeds!);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('search input appears after filter-list and before section-feeds', () => {
        const sidebar = document.getElementById('sidebar');
        const filterList = sidebar!.querySelector('#filter-list');
        const searchInput = sidebar!.querySelector('#search-input');
        const sectionFeeds = sidebar!.querySelector('#section-feeds');
        expect(searchInput).not.toBeNull();
        const pos1 = filterList!.compareDocumentPosition(searchInput!);
        expect(pos1 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const pos2 = searchInput!.compareDocumentPosition(sectionFeeds!);
        expect(pos2 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('sidebar has a "+ new" link pointing to settings', () => {
        const newLink = document.querySelector('.new-feed-link');
        expect(newLink).not.toBeNull();
        expect(newLink!.textContent?.trim()).toBe('+ new');
    });
});

// NK-z1czaq: Main content should fill full width (sidebar overlays, never shifts content)
describe('NK-z1czaq: Sidebar overlays content, does not shift layout', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        vi.mocked(apiFetch).mockResolvedValue({ ok: true, status: 200, json: async () => [] } as Response);
    });

    it('sidebar is a sibling of main-content inside .layout (not flex-shifting)', () => {
        renderLayout();
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        expect(sidebar).not.toBeNull();
        expect(mainContent).not.toBeNull();
        expect(sidebar!.parentElement?.classList.contains('layout')).toBe(true);
        expect(mainContent!.parentElement?.classList.contains('layout')).toBe(true);
    });
});

// Infinite scroll: uses scroll-position check (like v1) instead of IntersectionObserver.
describe('Infinite scroll: scroll near bottom triggers loadMore', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"><div id="main-content"><div id="content-area"></div></div></div>';
        Element.prototype.scrollIntoView = vi.fn();
        vi.clearAllMocks();
        store.setItems([]);
        store.setHasMore(true);
        store.setLoading(false);

        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => [],
        } as Response);

        renderItems();
    });

    function simulateScrollNearBottom(mainContent: HTMLElement) {
        Object.defineProperty(mainContent, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(mainContent, 'clientHeight', { value: 800, configurable: true });
        mainContent.scrollTop = 1050;
        mainContent.dispatchEvent(new Event('scroll'));
    }

    it('should call loadMore (apiFetch /api/stream) when scrolled near the bottom', () => {
        const items = Array.from({ length: 50 }, (_, i) => ({
            _id: i + 1,
            title: `Item ${i + 1}`,
            url: `http://example.com/${i + 1}`,
            read: false,
            publish_date: '2024-01-01',
        }));
        store.setItems(items as any);
        vi.clearAllMocks();

        const mainContent = document.getElementById('main-content')!;
        simulateScrollNearBottom(mainContent);

        expect(apiFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/stream'),
        );
    });
});
