import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './Settings';

describe('Settings Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    // Mock confirm
    global.confirm = vi.fn(() => true);
  });

  it('renders feed list', async () => {
    const mockFeeds = [
      { _id: 1, title: 'Tech News', url: 'http://tech.com/rss', category: 'tech' },
      { _id: 2, title: 'Gaming', url: 'http://gaming.com/rss', category: 'gaming' },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeeds,
    });

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Tech News')).toBeInTheDocument();
      expect(screen.getByText('http://tech.com/rss')).toBeInTheDocument();
      expect(screen.getByText('Gaming')).toBeInTheDocument();
    });
  });

  it('adds a new feed', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // Initial load
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // Add feed
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ _id: 3, title: 'New Feed', url: 'http://new.com/rss' }],
      }); // Refresh load

    render(<Settings />);

    // Wait for initial load to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('https://example.com/feed.xml');
    const button = screen.getByText('Add Feed');

    fireEvent.change(input, { target: { value: 'http://new.com/rss' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feed/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ url: 'http://new.com/rss' }),
        })
      );
    });

    // Wait for refresh
    await waitFor(() => {
      expect(screen.getByText('New Feed')).toBeInTheDocument();
    });
  });

  it('deletes a feed', async () => {
    const mockFeeds = [
      { _id: 1, title: 'Tech News', url: 'http://tech.com/rss', category: 'tech' },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockFeeds }) // Initial load
      .mockResolvedValueOnce({ ok: true }); // Delete

    render(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Tech News')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Delete Feed');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feed/1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(screen.queryByText('Tech News')).not.toBeInTheDocument();
    });
  });

  it('imports an OPML file', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // Initial load
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) }) // Import
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ _id: 1, title: 'Imported Feed', url: 'http://imported.com/rss' }],
      }); // Refresh load

    render(<Settings />);

    const file = new File(['<opml>...</opml>'], 'feeds.opml', { type: 'text/xml' });
    const fileInput = screen.getByLabelText(/import feeds/i, { selector: 'input[type="file"]' });
    const importButton = screen.getByText('Import');

    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(importButton).not.toBeDisabled();
    });

    fireEvent.click(importButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/import',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    // Check if refresh happens
    await waitFor(() => {
      expect(screen.getByText('Imported Feed')).toBeInTheDocument();
    });
  });
});
