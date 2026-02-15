import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FeedList from './FeedList';
import FeedItems from './FeedItems';

describe('Tag View Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('renders tags in FeedList and navigates to tag view', async () => {
    const mockFeeds = [
      { _id: 1, title: 'Feed 1', url: 'http://example.com/rss', category: 'Tech' },
    ];
    const mockTags = [{ title: 'Tech' }, { title: 'News' }];

    vi.mocked(global.fetch).mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/feed/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockFeeds,
        } as Response);
      }
      if (urlStr.includes('/api/tag')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTags,
        } as Response);
      }
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <FeedList
          theme="light"
          setTheme={() => { }}
          setSidebarVisible={() => { }}
          isMobile={false}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      const techTags = screen.getAllByText('Tech');
      expect(techTags.length).toBeGreaterThan(0);
      expect(screen.getByText('News')).toBeInTheDocument();
    });

    // Verify structure
    const techTag = screen.getByText('News').closest('a');
    expect(techTag).toHaveAttribute('href', '/tag/News');
  });

  it('fetches items by tag in FeedItems', async () => {
    const mockItems = [
      { _id: 101, title: 'Tag Item 1', url: 'http://example.com/1', feed_title: 'Feed 1' },
    ];

    vi.mocked(global.fetch).mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/stream')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockItems,
        } as Response);
      }
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={['/tag/Tech']}>
        <Routes>
          <Route path="/tag/:tagName" element={<FeedItems />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // expect(screen.getByText('Tag: Tech')).toBeInTheDocument();
      expect(screen.getByText('Tag Item 1')).toBeInTheDocument();
    });

    const params = new URLSearchParams();
    params.append('tag', 'Tech');
    params.append('read_filter', 'unread');
    expect(global.fetch).toHaveBeenCalledWith(`/api/stream?${params.toString()}`, expect.anything());
  });
});
