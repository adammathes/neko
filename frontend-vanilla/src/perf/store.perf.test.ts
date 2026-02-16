import { describe, it, expect } from 'vitest';
import { Store } from '../store';
import type { Item, Feed } from '../types';

function makeItem(id: number): Item {
    return {
        _id: id,
        feed_id: 1,
        title: `Test Item ${id}`,
        url: `https://example.com/item/${id}`,
        description: `Description for item ${id}`,
        publish_date: '2024-01-01T00:00:00Z',
        read: false,
        starred: false,
        feed_title: 'Test Feed',
    };
}

function makeFeed(id: number): Feed {
    return {
        _id: id,
        url: `https://example.com/feed/${id}`,
        web_url: `https://example.com/${id}`,
        title: `Feed ${id}`,
        category: `cat-${id % 5}`,
    };
}

describe('store performance', () => {
    it('setItems with 500 items + event dispatch under 10ms', () => {
        const store = new Store();
        const items = Array.from({ length: 500 }, (_, i) => makeItem(i));

        let eventFired = false;
        store.on('items-updated', () => { eventFired = true; });

        const start = performance.now();
        store.setItems(items);
        const elapsed = performance.now() - start;

        expect(store.items.length).toBe(500);
        expect(eventFired).toBe(true);
        expect(elapsed).toBeLessThan(10);
    });

    it('setItems append 500 items to existing 500 under 10ms', () => {
        const store = new Store();
        const initial = Array.from({ length: 500 }, (_, i) => makeItem(i));
        const more = Array.from({ length: 500 }, (_, i) => makeItem(i + 500));

        store.setItems(initial);

        const start = performance.now();
        store.setItems(more, true);
        const elapsed = performance.now() - start;

        expect(store.items.length).toBe(1000);
        expect(elapsed).toBeLessThan(10);
    });

    it('setFeeds with 200 feeds under 5ms', () => {
        const store = new Store();
        const feeds = Array.from({ length: 200 }, (_, i) => makeFeed(i));

        let eventFired = false;
        store.on('feeds-updated', () => { eventFired = true; });

        const start = performance.now();
        store.setFeeds(feeds);
        const elapsed = performance.now() - start;

        expect(store.feeds.length).toBe(200);
        expect(eventFired).toBe(true);
        expect(elapsed).toBeLessThan(5);
    });

    it('rapid filter changes (100 toggles) under 50ms', () => {
        const store = new Store();
        const filters: Array<'unread' | 'all' | 'starred'> = ['unread', 'all', 'starred'];
        let eventCount = 0;
        store.on('filter-updated', () => { eventCount++; });

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            store.setFilter(filters[i % 3]);
        }
        const elapsed = performance.now() - start;

        expect(eventCount).toBeGreaterThan(0);
        expect(elapsed).toBeLessThan(50);
    });

    it('rapid search query changes (100 updates) under 50ms', () => {
        const store = new Store();
        let eventCount = 0;
        store.on('search-updated', () => { eventCount++; });

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            store.setSearchQuery(`query-${i}`);
        }
        const elapsed = performance.now() - start;

        expect(eventCount).toBe(100);
        expect(elapsed).toBeLessThan(50);
    });

    it('multiple listeners (50) on items-updated under 10ms', () => {
        const store = new Store();
        const items = Array.from({ length: 100 }, (_, i) => makeItem(i));
        let totalCalls = 0;

        for (let i = 0; i < 50; i++) {
            store.on('items-updated', () => { totalCalls++; });
        }

        const start = performance.now();
        store.setItems(items);
        const elapsed = performance.now() - start;

        expect(totalCalls).toBe(50);
        expect(elapsed).toBeLessThan(10);
    });
});
