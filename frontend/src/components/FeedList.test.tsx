import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedList from './FeedList';

import { BrowserRouter } from 'react-router-dom';

describe('FeedList Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('renders loading state initially', () => {
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => { }));
    render(
      <BrowserRouter>
        <FeedList
          theme="light"
          setTheme={() => { }}
          setSidebarVisible={() => { }}
          isMobile={false}
        />
      </BrowserRouter>
    );
    expect(screen.getByText(/loading feeds/i)).toBeInTheDocument();
  });

  it('renders list of feeds', async () => {
    const mockFeeds = [
      {
        _id: 1,
        title: 'Feed One',
        url: 'http://example.com/rss',
        web_url: 'http://example.com',
        category: 'Tech',
      },
      {
        _id: 2,
        title: 'Feed Two',
        url: 'http://test.com/rss',
        web_url: 'http://test.com',
        category: 'News',
      },
    ];

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
          json: async () => [{ title: 'Tech' }],
        } as Response);
      }
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    });

    render(
      <BrowserRouter>
        <FeedList
          theme="light"
          setTheme={() => { }}
          setSidebarVisible={() => { }}
          isMobile={false}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading feeds/i)).not.toBeInTheDocument();
    });

    // Expand feeds
    fireEvent.click(screen.getByText(/feeds/i, { selector: 'h4' }));

    await waitFor(() => {
      expect(screen.getByText('Feed One')).toBeInTheDocument();
      expect(screen.getByText('Feed Two')).toBeInTheDocument();
      const techElements = screen.getAllByText('Tech');
      expect(techElements.length).toBeGreaterThan(0);
    });
  });

  it('handles fetch error', async () => {
    vi.mocked(global.fetch).mockImplementation(() => Promise.reject(new Error('API Error')));

    render(
      <BrowserRouter>
        <FeedList
          theme="light"
          setTheme={() => { }}
          setSidebarVisible={() => { }}
          isMobile={false}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error: api error/i)).toBeInTheDocument();
    });
  });

  it('handles empty feed list', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/feed/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }
      if (urlStr.includes('/api/tag')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    });

    render(
      <BrowserRouter>
        <FeedList
          theme="light"
          setTheme={() => { }}
          setSidebarVisible={() => { }}
          isMobile={false}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading feeds/i)).not.toBeInTheDocument();
    });

    // Expand feeds
    fireEvent.click(screen.getByText(/feeds/i, { selector: 'h4' }));

    await waitFor(() => {
      expect(screen.getByText(/no feeds found/i)).toBeInTheDocument();
    });
  });
});
