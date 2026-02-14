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
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });
    window.history.pushState({}, 'Test page', '/v2/login');
    render(<App />);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('renders dashboard when authenticated', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/auth')) return Promise.resolve({ ok: true });
      if (url.includes('/api/feed/')) return Promise.resolve({ ok: true, json: async () => [] });
      if (url.includes('/api/tag')) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true }); // Fallback
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

    (global.fetch as any).mockResolvedValueOnce({ ok: true });

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
