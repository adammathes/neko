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

    it('should handle tags', () => {
        const store = new Store();
        const mockTags = [{ title: 'Tag 1' } as any];
        const callback = vi.fn();
        store.on('tags-updated', callback);

        store.setTags(mockTags);
        expect(store.tags).toEqual(mockTags);
        expect(callback).toHaveBeenCalled();

        store.setActiveTag('Tag 1');
        expect(store.activeTagName).toBe('Tag 1');
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

        // Test append
        const moreItems = [{ _id: 2, title: 'Item 2' } as any];
        store.setItems(moreItems, true);
        expect(store.items).toHaveLength(2);
        expect(store.items[1]._id).toBe(2);
    });

    it('should handle pagination state', () => {
        const store = new Store();
        store.setHasMore(true);
        expect(store.hasMore).toBe(true);
        store.setHasMore(false);
        expect(store.hasMore).toBe(false);
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

    it('should handle font theme changes', () => {
        const store = new Store();
        const callback = vi.fn();
        store.on('theme-updated', callback);

        store.setFontTheme('serif');
        expect(store.fontTheme).toBe('serif');
        expect(localStorage.getItem('neko-font-theme')).toBe('serif');
        expect(callback).toHaveBeenCalled();
    });
});
