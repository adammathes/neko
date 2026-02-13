import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedItem from './FeedItem';
import type { Item } from '../types';

const mockItem: Item = {
    _id: 1,
    feed_id: 101,
    title: 'Test Item',
    url: 'http://example.com/item',
    description: '<p>Description</p>',
    publish_date: '2023-01-01',
    read: false,
    starred: false,
    feed_title: 'Test Feed'
};

describe('FeedItem Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
    });

    it('renders item details', () => {
        render(<FeedItem item={mockItem} />);
        expect(screen.getByText('Test Item')).toBeInTheDocument();
        expect(screen.getByText(/Test Feed/)).toBeInTheDocument();
        // Check for relative time or date formatting? For now just check it renders
    });

    it('toggles star status', async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<FeedItem item={mockItem} />);

        const starBtn = screen.getByTitle('Star');
        fireEvent.click(starBtn);

        // Optimistic update
        expect(await screen.findByTitle('Unstar')).toBeInTheDocument();

        expect(global.fetch).toHaveBeenCalledWith('/api/item/1', expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
                _id: 1,
                read: false,
                starred: true
            })
        }));
    });
});
