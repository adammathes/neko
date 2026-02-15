import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import '@testing-library/jest-dom';

describe('Navigation and Filtering', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
        // Default mock response for auth
        vi.mocked(global.fetch).mockImplementation((url) => {
            const urlStr = url.toString();
            if (urlStr.includes('/api/auth')) return Promise.resolve({ ok: true, json: async () => ({ status: 'ok' }) } as Response);
            if (urlStr.includes('/api/feed/')) return Promise.resolve({
                ok: true,
                json: async () => [
                    { _id: 1, title: 'Feed 1', url: 'http://f1.com' },
                    { _id: 2, title: 'Feed 2', url: 'http://f2.com' }
                ]
            } as Response);
            if (urlStr.includes('/api/tag')) return Promise.resolve({ ok: true, json: async () => [] } as Response);
            if (urlStr.includes('/api/stream')) return Promise.resolve({ ok: true, json: async () => [] } as Response);
            return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
        });
    });

    it('preserves "all" filter when clicking a feed', async () => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
        window.history.pushState({}, '', '/');
        render(<App />);

        // Wait for sidebar to load and feeds section to be visible
        await waitFor(() => {
            expect(screen.queryByText(/Loading feeds/i)).not.toBeInTheDocument();
        });

        // Expand feeds if not expanded
        const feedsHeader = await screen.findByRole('heading', { name: /Feeds/i, level: 4 });
        fireEvent.click(feedsHeader);

        await waitFor(() => {
            expect(screen.getByText('Feed 1')).toBeInTheDocument();
        });
        // Click 'all' filter
        const allFilter = screen.getByText('all');
        fireEvent.click(allFilter);

        // Verify URL has filter=all
        expect(window.location.search).toContain('filter=all');

        // Click Feed 1
        const feed1Link = screen.getByText('Feed 1');
        fireEvent.click(feed1Link);

        // Verify URL is /feed/1?filter=all (or similar)
        await waitFor(() => {
            expect(window.location.pathname).toContain('/feed/1');
            expect(window.location.search).toContain('filter=all');
        });

        // Click Feed 2
        const feed2Link = screen.getByText('Feed 2');
        fireEvent.click(feed2Link);

        // Verify URL is /feed/2?filter=all
        await waitFor(() => {
            expect(window.location.pathname).toContain('/feed/2');
            expect(window.location.search).toContain('filter=all');
        });
    });

    it('highlights the correct filter link', async () => {
        window.history.pushState({}, '', '/');
        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('unread')).toHaveClass('active');
        });

        fireEvent.click(screen.getByText('all'));
        await waitFor(() => {
            expect(screen.getByText('all')).toHaveClass('active');
            expect(screen.getByText('unread')).not.toHaveClass('active');
        });
    });

    it('highlights "unread" as active even when on a feed page without filter param', async () => {
        window.history.pushState({}, '', '/feed/1');
        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('unread')).toHaveClass('active');
        });
    });

    it('preserves search query when clicking a feed', async () => {
        window.history.pushState({}, '', '/?q=linux');
        render(<App />);

        await screen.findByRole('heading', { name: /Feeds/i, level: 4 });
        fireEvent.click(screen.getByRole('heading', { name: /Feeds/i, level: 4 }));

        await screen.findByText('Feed 1');
        fireEvent.click(screen.getByText('Feed 1'));

        await waitFor(() => {
            expect(window.location.pathname).toContain('/feed/1');
            expect(window.location.search).toContain('q=linux');
        });
    });
});
