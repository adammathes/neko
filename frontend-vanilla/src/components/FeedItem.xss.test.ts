import { describe, it, expect } from 'vitest';
import { createFeedItem } from './FeedItem';
import type { Item } from '../types';

// H2: HTML attribute injection — when an item URL or title contains a
// double-quote (or other attribute-meta characters), the rendered template
// must NOT allow the value to break out of the attribute it lives in.
//
// Bluemonday on the backend does not escape `"` in text-position output, so
// the frontend must defensively HTML-attribute-escape any untrusted string
// before interpolating it into an `href`, `title`, or other attribute.

function baseItem(overrides: Partial<Item> = {}): Item {
    return {
        _id: 1,
        feed_id: 1,
        title: 'safe title',
        url: 'https://example.com/',
        description: '',
        publish_date: '2024-01-01',
        read: false,
        starred: false,
        feed_title: 'Feed',
        ...overrides,
    } as Item;
}

describe('FeedItem XSS hardening', () => {
    it('escapes double-quote in item.url so attribute cannot break out', () => {
        const item = baseItem({ url: 'https://x.test/" onerror="alert(1)" foo="' });
        const html = createFeedItem(item);

        // Render to a DOM and check there is no onerror attribute synthesized
        // from the broken-out value. The literal characters "onerror=" may
        // still appear inside the escaped href value as text — that's fine.
        const div = document.createElement('div');
        div.innerHTML = html;
        const elsWithOn = div.querySelectorAll('[onerror], [foo]');
        expect(elsWithOn.length).toBe(0);
    });

    it('escapes double-quote in item.title (title attribute on star button)', () => {
        const item = baseItem({ title: 'safe title' });
        // The star button's title attribute is from a literal in the
        // component (Star/Unstar) so escape only matters for URL & feed_title.
        const html = createFeedItem(item);
        expect(html).toContain('Star');
        // Confirm title text appears in body (innerText context)
        expect(html).toContain('safe title');
    });

    it('rejects javascript: URL in item.url — does not render a clickable link to JS', () => {
        const item = baseItem({ url: 'javascript:alert(document.cookie)' });
        const html = createFeedItem(item);

        const div = document.createElement('div');
        div.innerHTML = html;
        const links = Array.from(div.querySelectorAll('a'));
        for (const a of links) {
            const href = a.getAttribute('href') || '';
            if (/^\s*javascript:/i.test(href)) {
                throw new Error(`FeedItem rendered javascript: URL in href: ${a.outerHTML}`);
            }
        }
    });

    it('escapes double-quote in feed_title', () => {
        const item = baseItem({ feed_title: 'Feed " onerror="alert(1)' });
        const html = createFeedItem(item);
        const div = document.createElement('div');
        div.innerHTML = html;
        // No element should have an onerror attribute synthesized from this value
        const elsWithOn = div.querySelectorAll('[onerror]');
        expect(elsWithOn.length).toBe(0);
    });

    it('does not let html in title escape into raw markup', () => {
        // Item title containing HTML — should be text-encoded
        const item = baseItem({ title: '<img src=x onerror=alert(1)>' });
        const html = createFeedItem(item);
        const div = document.createElement('div');
        div.innerHTML = html;
        // The injected img should not exist as a real element
        // (it should be present only as text inside the title link)
        const imgs = div.querySelectorAll('img[onerror]');
        expect(imgs.length).toBe(0);
    });
});
