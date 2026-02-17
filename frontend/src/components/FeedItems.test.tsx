import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('marks items as read when scrolled past', async () => {
    const mockItems = [{ _id: 101, title: 'Item 1', url: 'u1', read: false, starred: false }];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as Response);

    // Mock getBoundingClientRect
    const getBoundingClientRectMock = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    getBoundingClientRectMock.mockImplementation(function (this: Element) {
      if (this.classList && this.classList.contains('dashboard-main')) {
        return {
          top: 0, bottom: 500, height: 500, left: 0, right: 1000, width: 1000, x: 0, y: 0,
          toJSON: () => { }
        } as DOMRect;
      }
      if (this.id && this.id.startsWith('item-')) {
        // Item top is -50 (above container top 0)
        return {
          top: -50, bottom: 50, height: 100, left: 0, right: 1000, width: 1000, x: 0, y: 0,
          toJSON: () => { }
        } as DOMRect;
      }
      return {
        top: 0, bottom: 0, height: 0, left: 0, right: 0, width: 0, x: 0, y: 0,
        toJSON: () => { }
      } as DOMRect;
    });

    render(
      <MemoryRouter>
        <div className="dashboard-main">
          <FeedItems />
        </div>
      </MemoryRouter>
    );

    // Initial load fetch
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeVisible();
    });

    // Trigger scroll
    const container = document.querySelector('.dashboard-main');
    expect(container).not.toBeNull();

    act(() => {
      // Dispatch scroll event
      fireEvent.scroll(container!);
    });

    // Wait for throttle (500ms) + buffer
    await new Promise(r => setTimeout(r, 600));

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
    await waitFor(() => expect(document.getElementById('item-0')).toHaveAttribute('data-selected', 'true'));

    fireEvent.keyDown(window, { key: 'j' }); // index 1
    await waitFor(() => expect(document.getElementById('item-1')).toHaveAttribute('data-selected', 'true'));

    fireEvent.keyDown(window, { key: 'j' }); // index 2 (last item)
    await waitFor(() => expect(document.getElementById('item-2')).toHaveAttribute('data-selected', 'true'));

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
