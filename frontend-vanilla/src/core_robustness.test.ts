vi.useFakeTimers();

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from './api';

// Mock api
vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

describe('Core Robustness: Scroll-to-Read, Infinite Scroll, Keyboard Nav', () => {
    let mainContent: HTMLElement;
    let renderItems: any;
    let updateItem: any;
    let storeInstance: any;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.resetModules();
        const main = await import('./main');
        const storeMod = await import("./store");
        storeInstance = storeMod.store;
        renderItems = main.renderItems;
        updateItem = main.updateItem;

        document.body.innerHTML = '<div id="app"><div id="main-content"><div id="content-area"></div></div></div>';
        mainContent = document.getElementById('main-content')!;

        // Mock scrollIntoView
        Element.prototype.scrollIntoView = vi.fn();

        vi.clearAllMocks();

        // Reset store
        storeInstance.setItems([]);
        storeInstance.setHasMore(true);
        storeInstance.setLoading(false);
        storeInstance.setSearchQuery('');
        storeInstance.setFilter('unread');

        // Default successful API mock
        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => []
        } as Response);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // --- SCROLL-TO-READ ROBUSTNESS ---

    it('should mark multiple items as read when fast-scrolled past (debounce check)', async () => {
        const items = Array.from({ length: 5 }, (_, i) => ({
            _id: i + 1, title: `Item ${i + 1}`, read: false, publish_date: '2023-01-01'
        })) as any[];
        storeInstance.setItems(items);
        renderItems();

        // Mock container at top 0
        mainContent.getBoundingClientRect = vi.fn(() => ({ top: 0, bottom: 800 } as any));

        // Mock items scattered past the top
        document.querySelectorAll('.feed-item').forEach((el, i) => {
            el.getBoundingClientRect = vi.fn(() => ({
                top: -100 - (i * 100),
                bottom: -10 - (i * 100) // All 5 are past the top
            } as any));
        });

        // Trigger multiple scroll events rapidly
        mainContent.dispatchEvent(new Event('scroll'));
        mainContent.dispatchEvent(new Event('scroll'));
        mainContent.dispatchEvent(new Event('scroll'));

        // Advance timers by 250ms (debounce)
        vi.advanceTimersByTime(300);

        // Should have called updateItem for all 5 items
        // We check apiFetch since updateItem calls it
        expect(apiFetch).toHaveBeenCalledTimes(5);
        items.forEach(item => {
            expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining(`/api/item/${item._id}`), expect.anything());
        });
    });

    it('should NOT mark a very tall item as read until its BOTTOM clears the container top', async () => {
        storeInstance.setItems([{ _id: 1, title: 'Tall Item', read: false, publish_date: '2023-01-01' }] as any);
        renderItems();

        mainContent.getBoundingClientRect = vi.fn(() => ({ top: 0, bottom: 800 } as any));
        const itemEl = document.querySelector('.feed-item[data-id="1"]')!;

        // Scenario: Top is way off screen (-500), but bottom is still visible (+10)
        itemEl.getBoundingClientRect = vi.fn(() => ({ top: -500, bottom: 10 } as any));

        mainContent.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(300);

        expect(apiFetch).not.toHaveBeenCalled();

        // Scenario: Bottom finally clears (is past top + 5px buffer)
        // bottom: -10 means it's 10px above the top
        itemEl.getBoundingClientRect = vi.fn(() => ({ top: -1000, bottom: -10 } as any));

        mainContent.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(300);

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/1'), expect.anything());
    });

    // --- INFINITE SCROLL ROBUSTNESS ---

    it('should handle "stuck" loads by allowing re-trigger if previous load finished', async () => {
        storeInstance.setItems(Array.from({ length: 10 }, (_, i) => ({ _id: i })) as any);
        renderItems();

        // Mock being at the bottom
        Object.defineProperty(mainContent, 'scrollHeight', { value: 1000 });
        Object.defineProperty(mainContent, 'scrollTop', { value: 850 });
        Object.defineProperty(mainContent, 'clientHeight', { value: 100 });
        // scrollHeight(1000) - scrollTop(850) - clientHeight(100) = 50 (< 200)

        // Simulate loadMore takes time
        let resolvePromise: (v: any) => void;
        const pendingPromise = new Promise(resolve => { resolvePromise = resolve; });
        vi.mocked(apiFetch).mockReturnValue(pendingPromise as any);

        mainContent.dispatchEvent(new Event('scroll'));
        expect(apiFetch).toHaveBeenCalledTimes(1); // First trigger
        expect(storeInstance.loading).toBe(true);

        // Scroll again while loading
        mainContent.dispatchEvent(new Event('scroll'));
        expect(apiFetch).toHaveBeenCalledTimes(1); // Should NOT trigger again while storeInstance.loading is true

        // Finish first load
        resolvePromise!({ ok: true, json: async () => [] });
        await vi.runAllTicks();
        storeInstance.setLoading(false); // Manually set since we're testing the logic flow

        // Scroll again
        mainContent.dispatchEvent(new Event('scroll'));
        expect(apiFetch).toHaveBeenCalledTimes(2); // Should trigger again now that loading is false
    });

    // --- KEYBOARD NAVIGATION ROBUSTNESS ---

    it('should sync activeItemId and scroll into view correctly on j/k', async () => {
        storeInstance.setItems([
            { _id: 101, title: 'Item 1', read: false },
            { _id: 102, title: 'Item 2', read: false }
        ] as any);
        renderItems();

        const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

        // Press 'j'
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
        expect(scrollSpy).toHaveBeenCalled();
        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/101'), expect.objectContaining({
            body: expect.stringContaining('"read":true')
        }));

        // Press 'j' again
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/102'), expect.anything());
    });

    // --- API ERROR ENCAPSULATION ---

    it('should NOT update DOM classes if API update fails', async () => {
        storeInstance.setItems([{ _id: 99, title: 'Error Item', read: false }] as any);
        renderItems();

        const el = document.querySelector('.feed-item[data-id="99"]')!;
        expect(el.classList.contains('unread')).toBe(true);

        // Mock API failure
        vi.mocked(apiFetch).mockResolvedValue({ ok: false, status: 500 } as Response);

        await updateItem(99, { read: true });

        // DOM should NOT be updated because res.ok was false
        expect(el.classList.contains('read')).toBe(false);
        expect(el.classList.contains('unread')).toBe(true);
    });

    // --- POLLING FALLBACK ---

    it('should trigger checkReadItems periodically via polling fallback', async () => {
        storeInstance.setItems([{ _id: 55, title: 'Poll Item', read: false }] as any);
        renderItems();

        mainContent.getBoundingClientRect = vi.fn(() => ({ top: 0, bottom: 800 } as any));
        const itemEl = document.querySelector('.feed-item[data-id="55"]')!;
        itemEl.getBoundingClientRect = vi.fn(() => ({ top: -100, bottom: -50 } as any));

        // Advance 1s (the polling interval in main.ts)
        vi.advanceTimersByTime(1100);

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/item/55'), expect.anything());
    });

    // --- EDGE CASE: EMPTY / BOUNDARY NAVIGATION ---

    it('should not crash when j/k is pressed on an empty list', () => {
        storeInstance.setItems([]);
        renderItems();

        // Should not throw
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    });

    it('should handle search queries correctly in stream requests', async () => {
        storeInstance.setSearchQuery('rust');
        // trigger fetchItems through store logic or manual call
        const { fetchItems } = await import('./main');
        await fetchItems();

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('q=rust'));
    });
});
