import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedItems from './FeedItems';

describe('FeedItems Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Mock IntersectionObserver
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.IntersectionObserver = MockIntersectionObserver as any;
  });

  it('renders loading state', () => {
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => { }));
    render(
      <MemoryRouter initialEntries={['/feed/1']}>
        <Routes>
          <Route path="/feed/:feedId" element={<FeedItems />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/loading items/i)).toBeInTheDocument();
  });

  it('renders items for a feed', async () => {
    const mockItems = [
      {
        _id: 101,
        title: 'Item One',
        url: 'http://example.com/1',
        publish_date: '2023-01-01',
        read: false,
      },
      {
        _id: 102,
        title: 'Item Two',
        url: 'http://example.com/2',
        publish_date: '2023-01-02',
        read: true,
      },
    ];

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockItems,
    } as Response);

    render(
      <MemoryRouter initialEntries={['/feed/1']}>
        <Routes>
          <Route path="/feed/:feedId" element={<FeedItems />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Item One')).toBeInTheDocument();
    });

    const params = new URLSearchParams();
    params.append('feed_id', '1');
    params.append('read_filter', 'unread');
    expect(global.fetch).toHaveBeenCalledWith(`/api/stream?${params.toString()}`, expect.anything());
  });

  it('handles keyboard shortcuts', async () => {
    const mockItems = [
      { _id: 101, title: 'Item 1', url: 'u1', read: false, starred: false },
      { _id: 102, title: 'Item 2', url: 'u2', read: true, starred: false },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as Response);

    render(
      <MemoryRouter>
        <FeedItems />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeVisible();
    });

    // Press 'j' to select first item
    fireEvent.keyDown(window, { key: 'j' });

    // Item 1 (index 0) should be selected.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/item/101',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ read: true, starred: false }),
        })
      );
    });

    // Press 'j' again -> index 1 (Item 2)
    fireEvent.keyDown(window, { key: 'j' });

    // Press 's' to star Item 2
    fireEvent.keyDown(window, { key: 's' });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/item/102',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ read: true, starred: true }),
        })
      );
    });
  });

  it('marks items as read when scrolled past', async () => {
    const mockItems = [{ _id: 101, title: 'Item 1', url: 'u1', read: false, starred: false }];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as Response);

    const observerCallbacks: IntersectionObserverCallback[] = [];
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.IntersectionObserver = MockIntersectionObserver as any;

    render(
      <MemoryRouter>
        <FeedItems />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeVisible();
    });

    // Simulate item leaving viewport
    const entry = {
      isIntersecting: false,
      boundingClientRect: { top: -50 } as DOMRectReadOnly,
      target: { getAttribute: () => '0' } as unknown as Element, // data-index="0"
      intersectionRatio: 0,
      time: 0,
      rootBounds: null,
      intersectionRect: {} as DOMRectReadOnly,
    } as IntersectionObserverEntry;

    act(() => {
      // Trigger ALL registered observers
      observerCallbacks.forEach(cb => cb([entry], {} as IntersectionObserver));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/item/101',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ read: true, starred: false }),
        })
      );
    });
  });

  it('loads more items when sentinel becomes visible', async () => {
    const initialItems = [{ _id: 101, title: 'Item 1', url: 'u1', read: true, starred: false }];
    const moreItems = [{ _id: 100, title: 'Item 0', url: 'u0', read: true, starred: false }];

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => initialItems } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => moreItems } as Response);

    const observerCallbacks: IntersectionObserverCallback[] = [];
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.IntersectionObserver = MockIntersectionObserver as any;

    render(
      <MemoryRouter>
        <FeedItems />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const entry = {
      isIntersecting: true,
      target: { id: 'load-more-sentinel' } as unknown as Element,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: 1,
      time: 0,
      rootBounds: null,
      intersectionRect: {} as DOMRectReadOnly,
    } as IntersectionObserverEntry;

    act(() => {
      // Trigger all observers
      observerCallbacks.forEach(cb => cb([entry], {} as IntersectionObserver));
    });

    await waitFor(() => {
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      const params = new URLSearchParams();
      params.append('max_id', '101');
      params.append('read_filter', 'unread');
      // Verify the second fetch call content
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('max_id=101'),
        expect.anything()
      );
    });
  });

  it('loads more items when pressing j on last item', async () => {
    const initialItems = [
      { _id: 103, title: 'Item 3', url: 'u3', read: true, starred: false },
      { _id: 102, title: 'Item 2', url: 'u2', read: true, starred: false },
      { _id: 101, title: 'Item 1', url: 'u1', read: true, starred: false },
    ];
    const moreItems = [
      { _id: 100, title: 'Item 0', url: 'u0', read: true, starred: false },
    ];

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => initialItems } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => moreItems } as Response);

    render(
      <MemoryRouter>
        <FeedItems />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'j' }); // index 0
    fireEvent.keyDown(window, { key: 'j' }); // index 1
    fireEvent.keyDown(window, { key: 'j' }); // index 2 (last item)

    await waitFor(() => {
      expect(screen.getByText('Item 0')).toBeInTheDocument();
    });

    // Check fetch call
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('max_id=101'),
      expect.anything()
    );
  });
});
