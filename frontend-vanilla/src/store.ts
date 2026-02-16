import type { Feed, Item, Category } from './types.ts';

export type StoreEvent = 'feeds-updated' | 'tags-updated' | 'items-updated' | 'active-feed-updated' | 'active-tag-updated' | 'loading-state-changed' | 'filter-updated';

export type FilterType = 'unread' | 'all' | 'starred';

export class Store extends EventTarget {
    feeds: Feed[] = [];
    tags: Category[] = [];
    items: Item[] = [];
    activeFeedId: number | null = null;
    activeTagName: string | null = null;
    filter: FilterType = 'unread';
    loading: boolean = false;
    hasMore: boolean = true;

    setFeeds(feeds: Feed[]) {
        this.feeds = feeds;
        this.emit('feeds-updated');
    }

    setTags(tags: Category[]) {
        this.tags = tags;
        this.emit('tags-updated');
    }

    setItems(items: Item[], append: boolean = false) {
        if (append) {
            this.items = [...this.items, ...items];
        } else {
            this.items = items;
        }
        this.emit('items-updated');
    }

    setActiveFeed(id: number | null) {
        this.activeFeedId = id;
        this.activeTagName = null;
        this.emit('active-feed-updated');
    }

    setActiveTag(name: string | null) {
        this.activeTagName = name;
        this.activeFeedId = null;
        this.emit('active-tag-updated');
    }

    setFilter(filter: FilterType) {
        if (this.filter !== filter) {
            this.filter = filter;
            this.emit('filter-updated');
        }
    }

    setLoading(loading: boolean) {
        this.loading = loading;
        this.emit('loading-state-changed');
    }

    setHasMore(hasMore: boolean) {
        this.hasMore = hasMore;
    }

    private emit(type: StoreEvent, detail?: any) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    on(type: StoreEvent, callback: (e: CustomEvent) => void) {
        this.addEventListener(type, callback as EventListener);
    }
}

export const store = new Store();
