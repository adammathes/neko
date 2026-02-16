import { describe, it, expect, vi } from 'vitest';
import { router } from './router';

describe('Router', () => {
    it('should parse simple paths', () => {
        // Mock window.location
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/feed/123',
            pathname: '/v3/feed/123'
        });

        const route = router.getCurrentRoute();
        expect(route.path).toBe('/feed');
        expect(route.params.feedId).toBe('123');
    });

    it('should parse tags correctly', () => {
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/tag/Tech%20News',
            pathname: '/v3/tag/Tech%20News'
        });

        const route = router.getCurrentRoute();
        expect(route.path).toBe('/tag');
        expect(route.params.tagName).toBe('Tech News');
    });

    it('should parse query parameters', () => {
        vi.stubGlobal('location', {
            href: 'http://localhost/v3/?filter=starred',
            pathname: '/v3/'
        });

        const route = router.getCurrentRoute();
        expect(route.query.get('filter')).toBe('starred');
    });
});
