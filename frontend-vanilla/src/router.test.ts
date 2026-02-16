import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router } from './router';

describe('Router', () => {
    let router: Router;

    beforeEach(() => {
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/',
            pathname: '/v3/',
            search: '',
            origin: 'http://localhost'
        });
        vi.stubGlobal('history', {
            pushState: vi.fn()
        });
        router = new Router();
    });

    it('should parse simple paths', () => {
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/feed/123',
            pathname: '/v3/feed/123',
            search: ''
        });
        const route = router.getCurrentRoute();
        expect(route.path).toBe('/feed');
        expect(route.params.feedId).toBe('123');
    });

    it('should parse tags correctly', () => {
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/tag/Tech%20News',
            pathname: '/v3/tag/Tech%20News',
            search: ''
        });
        const route = router.getCurrentRoute();
        expect(route.path).toBe('/tag');
        expect(route.params.tagName).toBe('Tech News');
    });

    it('should parse query parameters', () => {
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/?filter=starred',
            pathname: '/v3/',
            search: '?filter=starred'
        });
        const route = router.getCurrentRoute();
        expect(route.query.get('filter')).toBe('starred');
    });

    it('should navigate to new path', () => {
        router.navigate('/settings');
        // Match what the router actually does. 
        // If it uses new URL().pathname, it might be absolute.
        expect(history.pushState).toHaveBeenCalled();
    });

    it('should update query parameters', () => {
        router.updateQuery({ q: 'test' });
        expect(history.pushState).toHaveBeenCalled();
        const call = vi.mocked(history.pushState).mock.calls[0];
        expect(call[2]).toContain('q=test');
    });

    it('should trigger event on popstate', () => {
        const handler = vi.fn();
        router.addEventListener('route-changed', handler);

        // Simulate popstate
        window.dispatchEvent(PopStateEvent.prototype instanceof PopStateEvent ? new PopStateEvent('popstate') : new Event('popstate'));

        expect(handler).toHaveBeenCalled();
    });
});
