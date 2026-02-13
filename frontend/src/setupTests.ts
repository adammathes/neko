import '@testing-library/jest-dom';

// Mock IntersectionObserver
class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        // nothing
    }

    observe(target: Element): void {
        // nothing
    }

    unobserve(target: Element): void {
        // nothing
    }

    disconnect(): void {
        // nothing
    }

    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
}

Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserver,
});

Object.defineProperty(global, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserver,
});
