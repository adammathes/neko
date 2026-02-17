import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { store } from './store';
import { apiFetch } from './api';
import { updateItem, fetchItems, renderItems } from './main';

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

    it('should mark item as read when existing in store and scrolled past', async () => {
        vi.useRealTimers();
        const mockItem = {
            _id: 999,
            title: 'Regression Test Item',
            read: false,
            url: 'http://example.com/regression',
            publish_date: '2023-01-01'
        } as any;

        store.setItems([mockItem]);

        // Manually trigger the render logic that sets up the listener (implied by renderItems/init in real app)
        // Here we can't easily trigger the exact closure in main.ts without fully initializing it.
        // However, we can simulate the "check logic" if we extract it or replicate the test conditions
        // that the previous main.test.ts used.

        // Since we are mocking the scroll behavior on the DOM element which main.ts attaches to:
        const mainContent = document.getElementById('main-content');
        expect(mainContent).not.toBeNull();

        // We need to invoke renderItems to attach the listener
        renderItems();

        // Mock getBoundingClientRect for container
        if (mainContent) {
            mainContent.getBoundingClientRect = vi.fn(() => ({
                top: 0, bottom: 800, height: 800, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        // Mock getBoundingClientRect for item (scrolled past top: -50)
        // renderItems creates the DOM elements based on store
        const itemEl = document.querySelector(`.feed-item[data-id="999"]`);
        expect(itemEl).not.toBeNull();

        if (itemEl) {
            itemEl.getBoundingClientRect = vi.fn(() => ({
                top: -50, bottom: 50, height: 100, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => { }
            }));
        }

        // Prepare API mock
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

    it('should NOT mark item as read if NOT scrolled past', async () => {
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
