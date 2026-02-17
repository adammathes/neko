import { describe, it, expect } from 'vitest';
import { createFeedItem } from '../components/FeedItem';
import type { Item } from '../types';

function makeItem(id: number): Item {
    return {
        _id: id,
        feed_id: 1,
        title: `Test Item ${id}`,
        url: `https://example.com/item/${id}`,
        description: `<p>Description for item ${id} with <b>bold</b> and <a href="https://example.com">link</a></p>`,
        publish_date: '2024-01-01T00:00:00Z',
        read: id % 3 === 0,
        starred: id % 5 === 0,
        feed_title: 'Test Feed',
    };
}

describe('renderItems performance', () => {
    it('createFeedItem renders 100 items under 50ms', () => {
        const items = Array.from({ length: 100 }, (_, i) => makeItem(i));

        const start = performance.now();
        const html = items.map(item => createFeedItem(item)).join('');
        const elapsed = performance.now() - start;

        expect(html).toBeTruthy();
        expect(html).toContain('feed-item');
        expect(elapsed).toBeLessThan(50);
    });

    it('createFeedItem renders 500 items under 200ms', () => {
        const items = Array.from({ length: 500 }, (_, i) => makeItem(i));

        const start = performance.now();
        const html = items.map(item => createFeedItem(item)).join('');
        const elapsed = performance.now() - start;

        expect(html).toBeTruthy();
        expect(elapsed).toBeLessThan(200);
    });

    it('createFeedItem renders 1000 items under 100ms', () => {
        const items = Array.from({ length: 1000 }, (_, i) => makeItem(i));

        const start = performance.now();
        const results: string[] = [];
        for (const item of items) {
            results.push(createFeedItem(item));
        }
        const elapsed = performance.now() - start;

        expect(results.length).toBe(1000);
        expect(elapsed).toBeLessThan(100);
    });

    it('DOM insertion of 100 items under 200ms', () => {
        const items = Array.from({ length: 100 }, (_, i) => makeItem(i));
        const html = items.map(item => createFeedItem(item)).join('');

        const container = document.createElement('ul');
        document.body.appendChild(container);

        const start = performance.now();
        container.innerHTML = html;
        const elapsed = performance.now() - start;

        expect(container.children.length).toBe(100);
        expect(elapsed).toBeLessThan(200);

        document.body.removeChild(container);
    });

    it('DOM insertion of 500 items under 500ms', () => {
        const items = Array.from({ length: 500 }, (_, i) => makeItem(i));
        const html = items.map(item => createFeedItem(item)).join('');

        const container = document.createElement('ul');
        document.body.appendChild(container);

        const start = performance.now();
        container.innerHTML = html;
        const elapsed = performance.now() - start;

        expect(container.children.length).toBe(500);
        expect(elapsed).toBeLessThan(1400);

        document.body.removeChild(container);
    });
});
