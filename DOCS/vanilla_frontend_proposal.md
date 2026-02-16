# Vanilla JS Frontend Implementation Proposal

## 1. Executive Summary
This proposal outlines the strategy to build a lightweight, high-performance "v3" frontend for Neko using modern Vanilla JavaScript (ES Modules, Web Components). The goal is to achieve the instant responsiveness of the legacy Backbone version while maintaining code maintainability and modern best practices. This version will coexist with the current React ("v2") frontend, allowing for A/B testing and gradual migration.

## 2. Architecture

### 2.1 Core Philosophy
- **No Frameworks**: Remove the overhead of React, Virtual DOM, and hydration.
- **Platform First**: Use standard Web APIs (Custom Elements, IntersectionObserver, Fetch).
- **Direct DOM Manipulation**: Update only what changes. State changes map 1:1 to DOM class/attribute updates.

### 2.2 Directory Structure
A new directory `frontend-vanilla` will be created alongside the existing `frontend`:
```
neko/
├── frontend/          # Current React V2
├── frontend-vanilla/  # New Vanilla V3
│   ├── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── store.ts   # State management
│   │   ├── router.ts  # History API wrapper
│   │   └── main.ts
│   └── vite.config.ts
└── web/               # Go backend serving logic
```

### 2.3 Technology Stack
- **Build Tool**: Vite (Vanilla preset). Extremely fast dev server and optimized bundling.
- **Language**: TypeScript (sharing types with `frontend` where possible `../frontend/src/types`).
- **CSS**: Standard CSS Variables (sharing `index.css` concepts from v2).
- **State**: Custom lightweight `Pub/Sub` Store.

## 3. Coexistence Strategy

To support both versions simultaneously during development and review:

### 3.1 Backend Serving (`web/web.go`)
1.  **Build Output**: `frontend-vanilla` will build to `web/dist/v3`.
2.  **Embedding**: Update `web.go` to embed the new directory.
    ```go
    //go:embed dist/v2/* dist/v3/*
    frontendFiles embed.FS
    ```
3.  **Routing**:
    -   Host v3 at `/v3/`.
    -   Users can switch via a simple link in the Settings menu (or a UI toggle).
    -   Feature flag (cookie) can serve v3 at `/` if desired later.

### 3.2 Development Helper
-   Add a `make dev-vanilla` target that runs the Vite dev server for the vanilla app, proxying API requests to the Go backend.

## 4. Implementation Details

### 4.1 State Management (The Store)
A simple `Store` class that extends `EventTarget` or uses a basic subscription model.
```typescript
class Store {
  items: Item[] = [];
  events = new EventTarget();

  setItems(items: Item[]) {
    this.items = items;
    this.events.dispatchEvent(new CustomEvent('update'));
  }

  markRead(id: number) {
    const item = this.items.find(i => i._id === id);
    if (item) {
      item.read = true;
      // Emit specific event for precise DOM update
      this.events.dispatchEvent(new CustomEvent('item-change', { detail: { id, change: 'read' } }));
      // Sync with API...
    }
  }
}
```

### 4.2 Efficient Rendering
-   **Initial Render**: Use Template Literals mapped to arrays. This is the fastest way to generate HTML strings in JS.
-   **Updates**: Components subscribe to the Store. When `item-change` fires for ID 101, the `<feed-item id="101">` component updates its *own* class list directly. No parent re-render.

### 4.3 Web Components
Encapsulate logic in Custom Elements to keep code organized.
```typescript
class FeedItem extends HTMLElement {
  connectedCallback() {
    // Render content
    // Subscribe to store updates for self
  }
  // ...
}
customElements.define('feed-item', FeedItem);
```

## 5. Testing Strategy

### 5.1 Unit Testing
-   **Tool**: Vitest.
-   **Approach**: Test "business logic" (Store, Router) in isolation. Test components using `JSDOM`.
-   **Benefit**: Fastest feedback loop.

### 5.2 E2E Testing (The "Compliance" Suite)
-   **Tool**: Playwright (Reuse existing suite).
-   **Strategy**:
    -   Update existing tests to use agnostic data-attributes (e.g., `data-test-id="feed-item"`).
    -   Run the *same* test suite against both `/v2/` (React) and `/v3/` (Vanilla) endpoints.
    -   This guarantees feature parity.

```typescript
// example-spec.ts
const uiVersion = process.env.UI_VERSION || 'v2'; // or v3

test('loads items', async ({ page }) => {
  await page.goto(`/${uiVersion}/`);
  // assertions...
});
```

## 6. Work Plan

1.  **Phase 1: Scaffold & Embed (1 Day)**
    -   Initialize `frontend-vanilla`.
    -   Update `web.go` to serve it.
    -   Verify "Hello World" at `/v3/`.

2.  **Phase 2: Read-Only Implementation (2 Days)**
    -   Implement fetching feeds/items.
    -   Implement Store and Template rendering.
    -   **Milestone**: Benchmark loading execution time vs React.

3.  **Phase 3: Interactive Features (2 Days)**
    -   Implement Keyboard navigation (j/k).
    -   Implement Mark as Read / Star.
    -   Implement Infinite Scroll.

4.  **Phase 4: Parity & Polish (Ongoing)**
    -   Settings, Mobile Sidebar, etc.
    -   Passing Compliance Tests.

## 7. Next Steps for Approval
-   Review and approve this proposal.
-   Authorize creation of `frontend-vanilla` directory.
