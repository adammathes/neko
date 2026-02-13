import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedItems from './FeedItems';

describe('FeedItems Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
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
            expect(screen.getByText('Item Two')).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/stream?feed_id=1');
    });
});
