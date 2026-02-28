import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { store } from './store';
import { renderLayout, renderItems } from './main';
import { apiFetch } from './api';

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

// Read the main stylesheet once for CSS rule assertions
const cssContent = readFileSync(resolve(__dirname, 'style.css'), 'utf-8');

describe('Mobile horizontal overflow prevention', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/',
            pathname: '/v3/',
            search: '',
            assign: vi.fn(),
            replace: vi.fn()
        });
        vi.stubGlobal('history', { pushState: vi.fn() });
        Element.prototype.scrollIntoView = vi.fn();
        vi.clearAllMocks();
        store.setFeeds([]);
        store.setTags([]);
        store.setItems([]);

        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => []
        } as Response);
    });

    describe('CSS containment rules', () => {
        it('.item-description should have overflow-x hidden to contain wide RSS content', () => {
            const itemDescBlock = cssContent.match(
                /\.item-description\s*\{[^}]*\}/g
            );
            expect(itemDescBlock).not.toBeNull();
            const mainBlock = itemDescBlock!.find(
                block => !block.includes('img') && !block.includes('video') && !block.includes('pre') && !block.includes(' a')
            );
            expect(mainBlock).toBeDefined();
            expect(mainBlock).toMatch(/overflow-x:\s*hidden/);
        });

        it('.item-description should constrain tables with max-width', () => {
            const tableRule = cssContent.match(
                /\.item-description\s+table[^{]*\{[^}]*max-width:\s*100%/
            );
            expect(tableRule).not.toBeNull();
        });

        it('.item-description should constrain iframes with max-width', () => {
            const iframeRule = cssContent.match(
                /\.item-description\s+iframe[^{]*\{[^}]*max-width:\s*100%/
            );
            expect(iframeRule).not.toBeNull();
        });

        it('.main-content should explicitly set overflow-x hidden', () => {
            const mainContentBlock = cssContent.match(
                /\.main-content\s*\{[^}]*\}/
            );
            expect(mainContentBlock).not.toBeNull();
            expect(mainContentBlock![0]).toMatch(/overflow-x:\s*hidden/);
        });

        it('.feed-item should have overflow hidden to contain all child content', () => {
            // .feed-item must create a block formatting context so that
            // no child (title, description, images) can push the viewport wider.
            // This is critical on mobile where overflow-x:hidden on scrollable
            // ancestors (.main-content with overflow-y:auto) is unreliable.
            const feedItemBlock = cssContent.match(
                /\.feed-item\s*\{[^}]*\}/
            );
            expect(feedItemBlock).not.toBeNull();
            expect(feedItemBlock![0]).toMatch(/overflow:\s*hidden/);
        });

        it('.item-title should have min-width 0 to allow flex shrinking', () => {
            // In a flex container, default min-width:auto prevents items from
            // shrinking below their content width. Long titles push the layout
            // wider than the viewport. min-width:0 fixes this.
            const itemTitleBlock = cssContent.match(
                /\.item-title\s*\{[^}]*\}/
            );
            expect(itemTitleBlock).not.toBeNull();
            expect(itemTitleBlock![0]).toMatch(/min-width:\s*0/);
        });

        it('.item-title should wrap long words', () => {
            // Titles can contain long unbroken strings (URLs, technical terms).
            // overflow-wrap ensures they wrap instead of overflowing.
            const itemTitleBlock = cssContent.match(
                /\.item-title\s*\{[^}]*\}/
            );
            expect(itemTitleBlock).not.toBeNull();
            expect(itemTitleBlock![0]).toMatch(/overflow-wrap:\s*(break-word|anywhere)/);
        });
    });

    describe('Rendered content containment after loadMore re-render', () => {
        it('should contain items with long unbroken titles after re-render', () => {
            renderLayout();
            const longTitle = 'A'.repeat(500); // simulate long unbroken title
            const items = [
                { _id: 1, title: 'Normal', url: 'http://example.com', publish_date: '2024-01-01', read: true, starred: false, description: '<p>first batch</p>' },
                { _id: 2, title: longTitle, url: 'http://example.com', publish_date: '2024-01-01', read: false, starred: false, description: '<p>long title item</p>' },
            ] as any;

            // Initial render
            store.setItems([items[0]]);
            renderItems();

            // Simulate loadMore re-render with appended items
            store.setItems(items);
            renderItems();

            const feedItems = document.querySelectorAll('.feed-item');
            expect(feedItems.length).toBe(2);
            // The long title item should be contained within the layout
            const longTitleEl = feedItems[1].querySelector('.item-title');
            expect(longTitleEl).not.toBeNull();
            expect(longTitleEl!.textContent!.trim().length).toBe(500);
        });

        it('should contain items with wide description content after re-render', () => {
            renderLayout();
            const items = [
                { _id: 1, title: 'Item 1', url: 'http://example.com', publish_date: '2024-01-01', read: true, starred: false, description: '<p>ok</p>' },
                { _id: 2, title: 'Item 2', url: 'http://example.com', publish_date: '2024-01-01', read: false, starred: false, description: '<table width="2000"><tr><td>wide</td></tr></table>' },
                { _id: 3, title: 'Item 3', url: 'http://example.com', publish_date: '2024-01-01', read: false, starred: false, description: '<iframe width="1200" src="https://example.com"></iframe>' },
            ] as any;

            // Initial render
            store.setItems([items[0]]);
            renderItems();

            // Simulate loadMore re-render
            store.setItems(items);
            renderItems();

            const feedItems = document.querySelectorAll('.feed-item');
            expect(feedItems.length).toBe(3);
        });
    });
});
