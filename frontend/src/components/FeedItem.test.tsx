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
  feed_title: 'Test Feed',
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
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    render(<FeedItem item={mockItem} />);

    const starBtn = screen.getByTitle('Star');
    expect(starBtn).toHaveTextContent('★');
    fireEvent.click(starBtn);

    // Optimistic update
    expect(await screen.findByTitle('Unstar')).toHaveTextContent('★');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/item/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          _id: 1,
          read: false,
          starred: true,
        }),
      })
    );
  });

  it('updates styling when read state changes', () => {
    const { rerender } = render(<FeedItem item={{ ...mockItem, read: false }} />);
    const link = screen.getByText('Test Item');
    // Initial state: unread (bold)
    // Note: checking computed style might be flaky in jsdom, but we can check the class on the parent
    const listItem = link.closest('li');
    expect(listItem).toHaveClass('unread');
    expect(listItem).not.toHaveClass('read');

    // Update prop to read
    rerender(<FeedItem item={{ ...mockItem, read: true }} />);

    // Should now be read
    expect(listItem).toHaveClass('read');
    expect(listItem).not.toHaveClass('unread');
  });

  it('loads full content', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockItem, full_content: '<p>Full Content Loaded</p>' }),
    } as Response);

    render(<FeedItem item={mockItem} />);

    const scrapeBtn = screen.getByTitle('Load Full Content');
    fireEvent.click(scrapeBtn);

    await waitFor(() => {
      expect(screen.getByText('Full Content Loaded')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/item/1', expect.anything());
  });
});
