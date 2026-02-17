import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { store } from './store';
import { apiFetch } from './api';
import { renderItems } from './main';

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
});
