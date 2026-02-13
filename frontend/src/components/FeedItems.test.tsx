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
        window.IntersectionObserver = MockIntersectionObserver as any;
    });

    it('renders loading state', () => {
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));
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
            { _id: 101, title: 'Item One', url: 'http://example.com/1', publish_date: '2023-01-01', read: false },
            { _id: 102, title: 'Item Two', url: 'http://example.com/2', publish_date: '2023-01-02', read: true },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockItems,
        });

        render(
            <MemoryRouter initialEntries={['/feed/1']}>
                <Routes>
                    <Route path="/feed/:feedId" element={<FeedItems />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Item One')).toBeInTheDocument();
            // Title should now be "Feed Items" based on logic
            expect(screen.getByText('Feed Items')).toBeInTheDocument();
        });

        const params = new URLSearchParams();
        params.append('feed_id', '1');
        params.append('read_filter', 'unread');
        expect(global.fetch).toHaveBeenCalledWith(`/api/stream?${params.toString()}`);
    });

    it('handles keyboard shortcuts', async () => {
        const mockItems = [
            { _id: 101, title: 'Item 1', url: 'u1', read: false, starred: false },
            { _id: 102, title: 'Item 2', url: 'u2', read: true, starred: false },
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockItems,
        });

        render(
            <MemoryRouter>
                <FeedItems />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Item 1')).toBeVisible();
        });

        // Press 'j' to select first item (index 0 -> 1 because it starts at -1... wait logic says min(prev+1))
        // init -1. j -> 0.
        fireEvent.keyDown(window, { key: 'j' });

        // Item 1 (index 0) should be selected.
        // It's unread, so it should be marked read.
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/item/101', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ read: true, starred: false }),
            }));
        });

        // Press 'j' again -> index 1 (Item 2)
        fireEvent.keyDown(window, { key: 'j' });

        // Item 2 is already read, so no markRead call expected for it (mocks clear? no).
        // let's check selection class if possible, but testing library doesn't easily check class on div wrapper unless we query it.

        // Press 's' to star Item 2
        fireEvent.keyDown(window, { key: 's' });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/item/102', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ read: true, starred: true }), // toggled to true
            }));
        });
    });

    it('marks items as read when scrolled past', async () => {
        const mockItems = [{ _id: 101, title: 'Item 1', url: 'u1', read: false, starred: false }];
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockItems,
        });

        // Capture the callback
        let observerCallback: IntersectionObserverCallback = () => { };

        // Override the mock to capture callback
        class MockIntersectionObserver {
            constructor(callback: IntersectionObserverCallback) {
                observerCallback = callback;
            }
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        }
        window.IntersectionObserver = MockIntersectionObserver as any;

        render(
            <MemoryRouter>
                <FeedItems />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Item 1')).toBeVisible();
        });

        // Simulate item leaving viewport at the top
        // Element index is 0
        const entry = {
            isIntersecting: false,
            boundingClientRect: { top: -50 } as DOMRectReadOnly,
            target: { getAttribute: () => '0' } as unknown as Element,
            intersectionRatio: 0,
            time: 0,
            rootBounds: null,
            intersectionRect: {} as DOMRectReadOnly,
        } as IntersectionObserverEntry;

        // Use vi.waitUntil to wait for callback to be assigned if needed, 
        // though strictly synchronous render + effect should do it.
        // Direct call:
        act(() => {
            observerCallback([entry], {} as IntersectionObserver);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/item/101', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ read: true, starred: false }),
            }));
        });
    });
});
