export type Route = {
    path: string;
    params: Record<string, string>;
    query: URLSearchParams;
};

export class Router extends EventTarget {
    constructor() {
        super();
        window.addEventListener('popstate', () => this.handleRouteChange());
    }

    private handleRouteChange() {
        this.dispatchEvent(new CustomEvent('route-changed', { detail: this.getCurrentRoute() }));
    }

    getCurrentRoute(): Route {
        const url = new URL(window.location.href);
        const path = url.pathname.replace(/^\/v3\//, '');
        const segments = path.split('/').filter(Boolean);

        let routePath = '/';
        const params: Record<string, string> = {};

        if (segments[0] === 'feed' && segments[1]) {
            routePath = '/feed';
            params.feedId = segments[1];
        } else if (segments[0] === 'tag' && segments[1]) {
            routePath = '/tag';
            params.tagName = decodeURIComponent(segments[1]);
        } else if (segments[0] === 'settings') {
            routePath = '/settings';
        }

        return { path: routePath, params, query: url.searchParams };
    }

    navigate(path: string, query?: Record<string, string>) {
        let url = `/v3${path}`;
        if (query) {
            const params = new URLSearchParams(query);
            url += `?${params.toString()}`;
        }
        window.history.pushState({}, '', url);
        this.handleRouteChange();
    }

    updateQuery(updates: Record<string, string>) {
        const url = new URL(window.location.href);
        for (const [key, value] of Object.entries(updates)) {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        }
        window.history.pushState({}, '', url.toString());
        this.handleRouteChange();
    }
}

export const router = new Router();
