import { describe, it, expect } from 'vitest';
import { createFeedItem } from './FeedItem';
import type { Item } from '../types';

describe('FeedItem Component', () => {
    const mockItem: Item = {
        _id: 1,
        title: 'Item Title',
        url: 'http://test',
        publish_date: '2023-01-01',
        read: false,
        starred: false,
        feed_title: 'Feed Title',
        description: 'Desc'
    } as any;

    it('should render an item correctly', () => {
        const html = createFeedItem(mockItem);
        expect(html).toContain('Item Title');
        expect(html).toContain('data-id="1"');
        expect(html).toContain('unread');
    });

    it('should show read state', () => {
        const html = createFeedItem({ ...mockItem, read: true });
        expect(html).toContain('read');
        expect(html).not.toContain('unread');
    });

    it('should show starred state', () => {
        const html = createFeedItem({ ...mockItem, starred: true });
        expect(html).toContain('is-starred');
    });

    it('should fallback to (No Title) if title is missing', () => {
        const html = createFeedItem({ ...mockItem, title: '' });
        expect(html).toContain('(No Title)');
    });
});
