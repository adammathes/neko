import { render, screen, waitFor } from '@testing-library/react';
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
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
        });

        window.history.pushState({}, 'Test page', '/v2/');
        render(<App />);

        await waitFor(() => {
            expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
        });
    });
});
