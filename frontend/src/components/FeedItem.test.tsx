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
  });

  it('calls onToggleStar when star clicked', () => {
    const onToggleStar = vi.fn();
    render(<FeedItem item={mockItem} onToggleStar={onToggleStar} />);

    const starBtn = screen.getByTitle('Star');
    fireEvent.click(starBtn);

    expect(onToggleStar).toHaveBeenCalledWith(mockItem);
  });

  it('updates styling when read state changes', () => {
    const { rerender } = render(<FeedItem item={{ ...mockItem, read: false }} />);
    const link = screen.getByText('Test Item');
    const listItem = link.closest('li');
    expect(listItem).toHaveClass('unread');
    expect(listItem).not.toHaveClass('read');

    rerender(<FeedItem item={{ ...mockItem, read: true }} />);
    expect(listItem).toHaveClass('read');
    expect(listItem).not.toHaveClass('unread');
  });

  it('loads full content and calls onUpdate', async () => {
    const onUpdate = vi.fn();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ full_content: '<p>Full Content Loaded</p>' }),
    } as Response);

    const { rerender } = render(<FeedItem item={mockItem} onUpdate={onUpdate} />);

    const scrapeBtn = screen.getByTitle('Load Full Content');
    fireEvent.click(scrapeBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/item/1', expect.anything());
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        full_content: '<p>Full Content Loaded</p>'
      }));
    });

    // Simulate parent updating prop
    rerender(<FeedItem item={{ ...mockItem, full_content: '<p>Full Content Loaded</p>' }} onUpdate={onUpdate} />);
    expect(screen.getByText('Full Content Loaded')).toBeInTheDocument();
  });
});
