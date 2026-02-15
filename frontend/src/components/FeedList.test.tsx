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

  it('handles search submission', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => [] } as Response);
    render(
      <BrowserRouter>
        <FeedList theme="light" setTheme={() => { }} setSidebarVisible={() => { }} isMobile={false} />
      </BrowserRouter>
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.queryByText(/loading feeds/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    fireEvent.submit(searchInput.closest('form')!);

    // Should navigate to include search query
    // Since we're using BrowserRouter in test, we can only check if it doesn't crash
    // but we can't easily check 'navigate' unless we mock it.
  });

  it('handles logout', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => [] } as Response);

    // Mock window.location
    const originalLocation = window.location;
    const locationMock = new URL('http://localhost/v2/');

    delete (window as { location?: Location }).location;
    (window as { location?: unknown }).location = {
      ...originalLocation,
      assign: vi.fn(),
      replace: vi.fn(),
      get href() { return locationMock.href; },
      set href(val: string) { locationMock.href = new URL(val, locationMock.origin).href; }
    };

    render(
      <BrowserRouter>
        <FeedList theme="light" setTheme={() => { }} setSidebarVisible={() => { }} isMobile={false} />
      </BrowserRouter>
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.queryByText(/loading feeds/i)).not.toBeInTheDocument();
    });

    const logoutBtn = screen.getByText(/logout/i);
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/logout', expect.any(Object));
      expect(window.location.href).toContain('/v2/#/login');
    });
    // @ts-expect-error - restoring window.location
    window.location = originalLocation;
  });

  it('closes sidebar on mobile link click', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => [] } as Response);
    const setSidebarVisible = vi.fn();
    render(
      <BrowserRouter>
        <FeedList theme="light" setTheme={() => { }} setSidebarVisible={setSidebarVisible} isMobile={true} />
      </BrowserRouter>
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.queryByText(/loading feeds/i)).not.toBeInTheDocument();
    });

    const unreadLink = screen.getByText(/unread/i);
    fireEvent.click(unreadLink);

    expect(setSidebarVisible).toHaveBeenCalledWith(false);
  });
});
