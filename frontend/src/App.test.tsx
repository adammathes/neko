import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('renders login on initial load (unauthenticated)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);
    window.history.pushState({}, 'Test page', '/v2/login');
    render(<App />);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('renders dashboard when authenticated', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/auth')) return Promise.resolve({ ok: true } as Response);
      if (urlStr.includes('/api/feed/')) return Promise.resolve({ ok: true, json: async () => [] } as Response);
      if (urlStr.includes('/api/tag')) return Promise.resolve({ ok: true, json: async () => [] } as Response);
      return Promise.resolve({ ok: true } as Response); // Fallback
    });

    window.history.pushState({}, 'Test page', '/v2/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('🐱')).toBeInTheDocument();
    });

    // Test Logout
    const logoutBtn = screen.getByText(/logout/i);
    expect(logoutBtn).toBeInTheDocument();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response);

    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logout',
        expect.objectContaining({ method: 'POST' })
      );
      expect(window.location.href).toBe('/v2/login');
    });
  });
});
