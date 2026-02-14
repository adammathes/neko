import '@testing-library/jest-dom';

// Mock IntersectionObserver
class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
        // nothing
    }

    observe(_target: Element): void {
        // nothing
    }

    unobserve(_target: Element): void {
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

Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserver,
});
