export type Route = {
    path: string;
    params: Record<string, string>;
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
        const path = window.location.pathname.replace(/^\/v3\//, '');
        const segments = path.split('/').filter(Boolean);

        let routePath = '/';
        const params: Record<string, string> = {};

        if (segments[0] === 'feed' && segments[1]) {
            routePath = '/feed';
            params.feedId = segments[1];
        } else if (segments[0] === 'tag' && segments[1]) {
            routePath = '/tag';
            params.tagName = segments[1];
        }

        return { path: routePath, params };
    }

    navigate(path: string) {
        window.history.pushState({}, '', `/v3${path}`);
        this.handleRouteChange();
    }
}

export const router = new Router();
