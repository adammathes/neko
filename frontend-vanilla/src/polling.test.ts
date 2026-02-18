import { describe, it, expect, vi, beforeEach } from 'vitest';
import { store } from './store';
import { apiFetch } from './api';
import './main'; // Import to start the polling interval

// Mock api
vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

// Mock router to avoid errors during loadMore
vi.mock('./router', () => ({
    router: {
        getCurrentRoute: () => ({ params: {}, query: new URLSearchParams() }),
        updateQuery: vi.fn(),
        navigate: vi.fn(),
        addEventListener: vi.fn()
    }
}));

describe('Infinite Scroll Polling', () => {
    beforeEach(() => {
        // Use real timers because the interval starts at module import time
        vi.useRealTimers();
        document.body.innerHTML = '<div id="main-content"></div>';
        store.setItems(Array(50).fill({ _id: 1 }));
        store.setHasMore(true);
        store.setLoading(false);
        vi.clearAllMocks();
    });

    it('should trigger loadMore via polling when near bottom', async () => {
        const scrollRoot = document.getElementById('main-content')!;

        // Mock scroll properties
        Object.defineProperty(scrollRoot, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(scrollRoot, 'clientHeight', { value: 200, configurable: true });
        // Use defineProperty for scrollTop to ensure it overrides native behavior in JSDOM
        Object.defineProperty(scrollRoot, 'scrollTop', { value: 1750, configurable: true });

        // Mock apiFetch response
        vi.mocked(apiFetch).mockResolvedValue({
            ok: true,
            json: async () => []
        } as Response);

        // Wait for interval (1000ms) + buffer
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Check if apiFetch was called
        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/stream'));
    });

    it('should NOT trigger loadMore via polling when far from bottom', async () => {
        const scrollRoot = document.getElementById('main-content')!;

        Object.defineProperty(scrollRoot, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(scrollRoot, 'clientHeight', { value: 200, configurable: true });
        Object.defineProperty(scrollRoot, 'scrollTop', { value: 100, configurable: true });

        await new Promise(resolve => setTimeout(resolve, 1100));

        expect(apiFetch).not.toHaveBeenCalled();
    });
});
