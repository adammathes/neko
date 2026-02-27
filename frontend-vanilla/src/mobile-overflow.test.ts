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
            // .item-description must prevent wide child elements (tables, iframes)
            // from causing horizontal viewport overflow
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
            // RSS feeds commonly contain <table> elements with explicit widths
            const tableRule = cssContent.match(
                /\.item-description\s+table[^{]*\{[^}]*max-width:\s*100%/
            );
            expect(tableRule).not.toBeNull();
        });

        it('.item-description should constrain iframes with max-width', () => {
            // RSS feeds commonly embed iframes (YouTube, etc.) with fixed widths
            const iframeRule = cssContent.match(
                /\.item-description\s+iframe[^{]*\{[^}]*max-width:\s*100%/
            );
            expect(iframeRule).not.toBeNull();
        });

        it('.main-content should explicitly set overflow-x hidden', () => {
            // .main-content must not allow horizontal scrolling
            const mainContentBlock = cssContent.match(
                /\.main-content\s*\{[^}]*\}/
            );
            expect(mainContentBlock).not.toBeNull();
            expect(mainContentBlock![0]).toMatch(/overflow-x:\s*hidden/);
        });
    });

    describe('Rendered content containment', () => {
        it('should render items with wide table content without breaking layout', () => {
            renderLayout();
            const wideTableItem = {
                _id: 1,
                title: 'Wide Table Post',
                url: 'http://example.com',
                publish_date: '2024-01-01',
                read: false,
                starred: false,
                description: '<table width="2000"><tr><td>Very wide table from RSS</td></tr></table>'
            } as any;
            store.setItems([wideTableItem]);
            renderItems();

            const desc = document.querySelector('.item-description');
            expect(desc).not.toBeNull();
            expect(desc!.innerHTML).toContain('<table');

            // The item-description element should be inside main-content
            // which constrains overflow
            const mainContent = document.getElementById('main-content');
            expect(mainContent).not.toBeNull();
            expect(mainContent!.contains(desc!)).toBe(true);
        });

        it('should render items with wide iframe content without breaking layout', () => {
            renderLayout();
            const wideIframeItem = {
                _id: 2,
                title: 'Embedded Video Post',
                url: 'http://example.com',
                publish_date: '2024-01-01',
                read: false,
                starred: false,
                description: '<iframe width="1200" height="600" src="https://example.com/embed"></iframe>'
            } as any;
            store.setItems([wideIframeItem]);
            renderItems();

            const desc = document.querySelector('.item-description');
            expect(desc).not.toBeNull();
            expect(desc!.innerHTML).toContain('<iframe');
        });

        it('should render items with wide image using inline style without breaking layout', () => {
            renderLayout();
            const wideImgItem = {
                _id: 3,
                title: 'Wide Image Post',
                url: 'http://example.com',
                publish_date: '2024-01-01',
                read: false,
                starred: false,
                description: '<img style="width: 1500px" src="https://example.com/wide.jpg">'
            } as any;
            store.setItems([wideImgItem]);
            renderItems();

            const desc = document.querySelector('.item-description');
            expect(desc).not.toBeNull();
            expect(desc!.innerHTML).toContain('<img');
        });
    });
});
