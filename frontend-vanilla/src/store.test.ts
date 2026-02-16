import { describe, it, expect, vi } from 'vitest';
import { Store } from './store';

describe('Store', () => {
    it('should store and notify about feeds', () => {
        const store = new Store();
        const mockFeeds = [
            { _id: 1, title: 'Feed 1', url: 'http://1', web_url: 'http://1', category: 'cat' }
        ];

        const callback = vi.fn();
        store.on('feeds-updated', callback);

        store.setFeeds(mockFeeds);

        expect(store.feeds).toEqual(mockFeeds);
        expect(callback).toHaveBeenCalled();
    });

    it('should handle items and loading state', () => {
        const store = new Store();
        const mockItems = [{ _id: 1, title: 'Item 1' } as any];

        const itemCallback = vi.fn();
        const loadingCallback = vi.fn();

        store.on('items-updated', itemCallback);
        store.on('loading-state-changed', loadingCallback);

        store.setLoading(true);
        expect(store.loading).toBe(true);
        expect(loadingCallback).toHaveBeenCalled();

        store.setItems(mockItems);
        expect(store.items).toEqual(mockItems);
        expect(itemCallback).toHaveBeenCalled();
    });

    it('should notify when active feed changes', () => {
        const store = new Store();
        const callback = vi.fn();
        store.on('active-feed-updated', callback);

        store.setActiveFeed(123);
        expect(store.activeFeedId).toBe(123);
        expect(callback).toHaveBeenCalled();
    });

    it('should handle search query', () => {
        const store = new Store();
        const callback = vi.fn();
        store.on('search-updated', callback);

        store.setSearchQuery('test query');
        expect(store.searchQuery).toBe('test query');
        expect(callback).toHaveBeenCalled();
    });

    it('should handle theme changes', () => {
        const store = new Store();
        const callback = vi.fn();
        store.on('theme-updated', callback);

        store.setTheme('dark');
        expect(store.theme).toBe('dark');
        expect(localStorage.getItem('neko-theme')).toBe('dark');
        expect(callback).toHaveBeenCalled();
    });
});
