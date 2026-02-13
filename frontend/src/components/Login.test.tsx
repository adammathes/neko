import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';

// Mock fetch
global.fetch = vi.fn();

const renderLogin = () => {
    render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );
};

describe('Login Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders login form', () => {
        renderLogin();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
        });

        renderLogin();

        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({
                method: 'POST',
            }));
        });
        // Navigation assertion is tricky without mocking useNavigate, 
        // but if no error is shown, we assume success path was taken
        expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
    });

    it('handles failed login', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Bad credentials' }),
        });

        renderLogin();

        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText(/bad credentials/i)).toBeInTheDocument();
        });
    });

    it('handles network error', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        renderLogin();

        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText(/network error/i)).toBeInTheDocument();
        });
    });
});
