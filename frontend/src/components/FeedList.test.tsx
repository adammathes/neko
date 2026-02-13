import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedList from './FeedList';

describe('FeedList Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
    });

    it('renders loading state initially', () => {
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));
        render(<FeedList />);
        expect(screen.getByText(/loading feeds/i)).toBeInTheDocument();
    });

    it('renders list of feeds', async () => {
        const mockFeeds = [
            { _id: 1, title: 'Feed One', url: 'http://example.com/rss', web_url: 'http://example.com', category: 'Tech' },
            { _id: 2, title: 'Feed Two', url: 'http://test.com/rss', web_url: 'http://test.com', category: 'News' },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockFeeds,
        });

        render(<FeedList />);

        await waitFor(() => {
            expect(screen.getByText('Feed One')).toBeInTheDocument();
            expect(screen.getByText('Feed Two')).toBeInTheDocument();
            expect(screen.getByText('Tech')).toBeInTheDocument();
        });
    });

    it('handles fetch error', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

        render(<FeedList />);

        await waitFor(() => {
            expect(screen.getByText(/error: api error/i)).toBeInTheDocument();
        });
    });

    it('handles empty feed list', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(<FeedList />);

        await waitFor(() => {
            expect(screen.getByText(/no feeds found/i)).toBeInTheDocument();
        });
    });
});
