import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, getCookie } from './api';

describe('api', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        document.cookie = '';
    });

    it('getCookie should return cookie value', () => {
        document.cookie = 'foo=bar';
        document.cookie = 'csrf_token=test-token';
        expect(getCookie('csrf_token')).toBe('test-token');
        expect(getCookie('foo')).toBe('bar');
        expect(getCookie('baz')).toBeUndefined();
    });

    it('apiFetch should include CSRF token for POST requests', async () => {
        document.cookie = 'csrf_token=test-token';
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce(new Response());

        await apiFetch('/test', { method: 'POST' });

        expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({
            method: 'POST',
            headers: expect.any(Headers),
            credentials: 'include'
        }));

        const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
        expect(headers.get('X-CSRF-Token')).toBe('test-token');
    });

    it('apiFetch should not include CSRF token for GET requests', async () => {
        document.cookie = 'csrf_token=test-token';
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce(new Response());

        await apiFetch('/test');

        const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
        expect(headers.get('X-CSRF-Token')).toBeNull();
    });
});
