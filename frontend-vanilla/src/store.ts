import type { Feed, Item } from './types.ts';

export type StoreEvent = 'feeds-updated' | 'items-updated' | 'active-feed-updated' | 'loading-state-changed';

export class Store extends EventTarget {
    feeds: Feed[] = [];
    items: Item[] = [];
    activeFeedId: number | null = null;
    loading: boolean = false;

    setFeeds(feeds: Feed[]) {
        this.feeds = feeds;
        this.emit('feeds-updated');
    }

    setItems(items: Item[]) {
        this.items = items;
        this.emit('items-updated');
    }

    setActiveFeed(id: number | null) {
        this.activeFeedId = id;
        this.emit('active-feed-updated');
    }

    setLoading(loading: boolean) {
        this.loading = loading;
        this.emit('loading-state-changed');
    }

    private emit(type: StoreEvent, detail?: any) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    // Helper to add typed listeners
    on(type: StoreEvent, callback: (e: CustomEvent) => void) {
        this.addEventListener(type, callback as EventListener);
    }
}

export const store = new Store();
