import { describe, it, expect } from 'vitest';
import { createFeedItem } from './FeedItem';

describe('FeedItem Component', () => {
    const mockFeed = { _id: 1, title: 'My Feed', url: 'http://test', web_url: 'http://test', category: 'tag' };

    it('should render a feed item correctly', () => {
        const html = createFeedItem(mockFeed, false);
        expect(html).toContain('My Feed');
        expect(html).toContain('data-id="1"');
        expect(html).not.toContain('active');
    });

    it('should apply active class when isActive is true', () => {
        const html = createFeedItem(mockFeed, true);
        expect(html).toContain('active');
    });

    it('should fallback to URL if title is missing', () => {
        const html = createFeedItem({ ...mockFeed, title: '' }, false);
        expect(html).toContain('http://test');
    });
});
