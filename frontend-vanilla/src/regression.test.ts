import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { store } from './store';
import { apiFetch } from './api';
import { renderItems, renderLayout } from './main';
import { createFeedItem } from './components/FeedItem';

// Mock api
vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

// Mock main module functions that we aren't testing directly but are imported/used
// Note: We need to use vi.importActual to get the real implementations we want to test
// But main.ts has side effects and complex DOM manipulations, so we might want to mock parts of it.
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
        store.setItems([]);

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

        // Mock getBoundingClientRect for container
        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 800, height: 800, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        // Mock getBoundingClientRect for item (fully scrolled past: bottom < 0)
        // Item top: -150, Item bottom: -50. Container Top: 0.
        // -50 < 0, so should mark as read.
        const itemEl = document.querySelector(`.feed-item[data-id="999"]`);
        expect(itemEl).not.toBeNull();

        if (itemEl) {
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: -150, bottom: -50, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        // Trigger scroll event
        mainContent?.dispatchEvent(new Event('scroll'));

        // Wait for throttle (250ms) + buffer
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify API call
        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/999'), expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"read":true')
        }));
    });

    it('should NOT mark item as read if only partially scrolled past (top < container top but bottom > container top)', async () => {
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

        // Mock getBoundingClientRect for item (partially scrolled past: top < 0, bottom > 0)
        // Item top: -50, Item bottom: 50. Container Top: 0.
        // 50 is NOT < 0, so should NOT mark as read.
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

    it('should NOT mark item as read if NOT scrolled past (item below container top)', async () => {
        vi.useRealTimers();
        const mockItem = {
            _id: 888,
            title: 'Visible Test Item',
            read: false,
            url: 'http://example.com/visible',
            publish_date: '2023-01-01'
        } as any;

        store.setItems([mockItem]);
        renderItems();

        const mainContent = document.getElementById('main-content');

        // Container
        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 800, height: 800, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        // Item is still visible (top: 100)
        const itemEl = document.querySelector(`.feed-item[data-id="888"]`);
        if (itemEl) {
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: 100, bottom: 200, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        mainContent?.dispatchEvent(new Event('scroll'));
        await new Promise(resolve => setTimeout(resolve, 300));

        // API should NOT be called
        expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/item/888'), expect.anything());
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

        // Setup successful detection scenario
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 800, height: 800, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        const itemEl = document.querySelector(`.feed-item[data-id="12345"]`);
        if (itemEl) {
            // Fully scrolled past
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: -150, bottom: -50, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);

        // Dispatch scroll on WINDOW, not mainContent
        window.dispatchEvent(new Event('scroll'));

        // Wait for potential debounce/poll (3000ms interval + buffer)
        await new Promise(resolve => setTimeout(resolve, 3100));

        // Expect it to handle it
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
        // filter-list should come before section-feeds in DOM order
        const position = filterList!.compareDocumentPosition(sectionFeeds!);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    /* FIXME: Tags feature soft-deprecated
    it('section-feeds appears before section-tags in the sidebar', () => {
        const sidebar = document.getElementById('sidebar');
        const sectionFeeds = sidebar!.querySelector('#section-feeds');
        const sectionTags = sidebar!.querySelector('#section-tags');
        expect(sectionFeeds).not.toBeNull();
        expect(sectionTags).not.toBeNull();
        // feeds should come before tags
        const position = sectionFeeds!.compareDocumentPosition(sectionTags!);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    */

    it('search input appears after filter-list and before section-feeds', () => {
        const sidebar = document.getElementById('sidebar');
        const filterList = sidebar!.querySelector('#filter-list');
        const searchInput = sidebar!.querySelector('#search-input');
        const sectionFeeds = sidebar!.querySelector('#section-feeds');
        expect(searchInput).not.toBeNull();
        // search after filters
        const pos1 = filterList!.compareDocumentPosition(searchInput!);
        expect(pos1 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // search before feeds
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
        // Both should be children of .layout
        expect(sidebar!.parentElement?.classList.contains('layout')).toBe(true);
        expect(mainContent!.parentElement?.classList.contains('layout')).toBe(true);
    });
});

// Infinite scroll: uses scroll-position check (like v1) instead of IntersectionObserver.
// When the user scrolls within 200px of the bottom of #main-content, loadMore fires.
describe('Infinite scroll: scroll near bottom triggers loadMore', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"><div id="main-content"><div id="content-area"></div></div></div>';
        Element.prototype.scrollIntoView = vi.fn();
        vi.clearAllMocks();
        store.setItems([]);
        store.setHasMore(true);

        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => [],
        } as Response);
    });

    function simulateScrollNearBottom(mainContent: HTMLElement) {
        // Simulate: scrollHeight=2000, clientHeight=800, scrollTop=1050
        // remaining = 2000 - 1050 - 800 = 150 < 200 → should trigger loadMore
        Object.defineProperty(mainContent, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(mainContent, 'clientHeight', { value: 800, configurable: true });
        mainContent.scrollTop = 1050;
        mainContent.dispatchEvent(new Event('scroll'));
    }

    function simulateScrollFarFromBottom(mainContent: HTMLElement) {
        // remaining = 2000 - 200 - 800 = 1000 > 200 → should NOT trigger
        Object.defineProperty(mainContent, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(mainContent, 'clientHeight', { value: 800, configurable: true });
        mainContent.scrollTop = 200;
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
        // renderItems sets onscroll on main-content; fire the scroll event
        simulateScrollNearBottom(mainContent);

        expect(apiFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/stream'),
        );
    });

    it('should NOT call loadMore when scrolled far from the bottom', () => {
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
        simulateScrollFarFromBottom(mainContent);

        expect(apiFetch).not.toHaveBeenCalledWith(
            expect.stringContaining('/api/stream'),
        );
    });

    it('should NOT call loadMore when store.loading is true', () => {
        const items = Array.from({ length: 50 }, (_, i) => ({
            _id: i + 1,
            title: `Item ${i + 1}`,
            url: `http://example.com/${i + 1}`,
            read: false,
            publish_date: '2024-01-01',
        }));
        store.setItems(items as any);
        vi.clearAllMocks();
        store.loading = true;

        const mainContent = document.getElementById('main-content')!;
        simulateScrollNearBottom(mainContent);

        expect(apiFetch).not.toHaveBeenCalledWith(
            expect.stringContaining('/api/stream'),
        );
    });

    it('should NOT render sentinel (or call loadMore) when hasMore is false', () => {
        const items = Array.from({ length: 10 }, (_, i) => ({
            _id: i + 1,
            title: `Item ${i + 1}`,
            url: `http://example.com/${i + 1}`,
            read: false,
            publish_date: '2024-01-01',
        }));
        store.setHasMore(false);
        store.setItems(items as any);

        expect(document.getElementById('load-more-sentinel')).toBeNull();
    });
});
