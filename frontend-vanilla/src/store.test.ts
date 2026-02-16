import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    describe('sidebar cookie persistence', () => {
        beforeEach(() => {
            // Clear sidebar cookie
            document.cookie = 'neko_sidebar=; path=/; max-age=0';
        });

        it('should persist sidebar state to cookie', () => {
            const store = new Store();
            store.setSidebarVisible(false);
            expect(document.cookie).toContain('neko_sidebar=0');

            store.setSidebarVisible(true);
            expect(document.cookie).toContain('neko_sidebar=1');
        });

        it('should read sidebar state from cookie on init', () => {
            document.cookie = 'neko_sidebar=1; path=/';
            const store = new Store();
            expect(store.sidebarVisible).toBe(true);

            document.cookie = 'neko_sidebar=0; path=/';
            const store2 = new Store();
            expect(store2.sidebarVisible).toBe(false);
        });

        it('should default to closed on tablet/mobile when no cookie', () => {
            // jsdom defaults innerWidth to 0, which is <= 1024
            const store = new Store();
            expect(store.sidebarVisible).toBe(false);
        });

        it('should emit sidebar-toggle when toggling', () => {
            const store = new Store();
            const callback = vi.fn();
            store.on('sidebar-toggle', callback);
            store.toggleSidebar();
            expect(callback).toHaveBeenCalled();
        });
    });
});
