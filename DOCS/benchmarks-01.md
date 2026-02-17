# Benchmarks

## `make check` execution time

| Run | Time (real) | Status        |
| --- | ----------- | ------------- |
| 1   | 15.2s       | Cold (fresh)  |
| 2   | 8.2s        | Warm (cached) |
| 3   | 8.3s        | Warm (cached) |

**Environment:** Linux (Development VM)
**Date:** 2026-02-15

### Summary
The `make check` workflow consists of:
1. `golangci-lint run` (Backend)
2. `npm run lint` (Frontend)
3. `go test -cover ./...` (Backend)
4. `npm test -- --run` (Frontend)

The goal of keeping the check under 15 seconds for a fast local feedback loop has been achieved.

---

## Go Backend Benchmarks

**Environment:** Linux arm64, Go, SQLite
**Date:** 2026-02-16
**Methodology:** `go test -bench=. -benchmem -count=3`

### API Handlers (`api/`)

| Benchmark | ops | ns/op | B/op | allocs/op |
|---|---|---|---|---|
| HandleStream | 6,664 | 168,344 | 380,350 | 1,423 |
| HandleStreamWithSearch | 6,200 | 192,454 | 381,033 | 1,432 |
| HandleItemUpdate | 24,469 | 48,513 | 8,597 | 46 |
| HandleFeedList | 51,320 | 22,846 | 10,308 | 117 |

**Findings:** Stream endpoints (~170us) are dominated by SQLite query + JSON serialization. Search adds ~14% overhead via FTS. Item updates and feed listing are fast (~48us and ~23us respectively). The ~380KB/op allocation for stream is from serializing item content; this could be reduced by excluding `full_content` in list views.

### Crawler (`internal/crawler/`)

| Benchmark | ops | ns/op | B/op | allocs/op |
|---|---|---|---|---|
| ParseFeed | 12,157 | 98,513 | 92,216 | 1,643 |
| CrawlFeedMocked | 1,497 | 782,713 | 169,491 | 2,233 |
| GetFeedContent | 9,720 | 122,448 | 46,986 | 190 |

**Findings:** Feed parsing (~98us) is fast. Full crawl cycle (~783us mocked) is dominated by HTTP round-trip + DB write. Content fetching (~122us) includes HTTP + HTML sanitization.

### Item Model (`models/item/`)

| Benchmark | ops | ns/op | B/op | allocs/op |
|---|---|---|---|---|
| ItemCreate | 21,397 | 55,924 | 1,415 | 22 |
| ItemCreateBatch100 | 216 | 5,574,677 | 139,213 | 2,100 |
| Filter_Empty | 62,834 | 19,005 | 13,096 | 82 |
| Filter_15Items | 7,429 | 159,417 | 373,392 | 1,771 |
| Filter_WithFTS | 6,406 | 184,237 | 374,120 | 1,779 |
| Filter_WithImageProxy | 5,348 | 216,287 | 496,533 | 2,491 |
| FilterPolicy | 104,919 | 11,444 | 17,768 | 150 |
| RewriteImages | 182,242 | 6,453 | 11,048 | 97 |
| ItemSave | 28,552 | 41,641 | 592 | 11 |
| Filter_LargeDataset | 8,623 | 139,067 | 361,769 | 1,186 |

**Findings:** Image proxy adds ~35% overhead to filtering (216us vs 159us) due to URL rewriting of `<img>` tags. Batch inserts scale linearly (~56us/item). The `FilterPolicy` HTML sanitizer is fast at ~11us. Full-text search adds minimal overhead (~15%) to filtering.

### Web Middleware (`web/`)

| Benchmark | ops | ns/op | B/op | allocs/op |
|---|---|---|---|---|
| GzipMiddleware | 100,623 | 11,881 | 11,999 | 25 |
| SecurityHeaders | 484,862 | 2,402 | 6,185 | 22 |
| CSRFMiddleware | 495,804 | 2,395 | 6,028 | 23 |
| FullMiddlewareStack | 362,329 | 3,237 | 8,745 | 34 |

**Findings:** The full middleware stack adds only ~3.2us per request. Gzip compression is the most expensive middleware (~12us) due to compression work, but is only applied to compressible responses. CSRF and security headers are near-zero cost (~2.4us each).

---

## Frontend Performance Tests (Vanilla JS / v3)

**Environment:** Vitest + jsdom
**Date:** 2026-02-16

### Store Operations

| Test | Threshold | Status |
|---|---|---|
| setItems (500 items + event dispatch) | < 10ms | PASS |
| setItems append (500 to existing 500) | < 10ms | PASS |
| setFeeds (200 feeds) | < 5ms | PASS |
| Rapid filter changes (100 toggles) | < 50ms | PASS |
| Rapid search query changes (100) | < 50ms | PASS |
| 50 listeners on items-updated | < 10ms | PASS |

### Rendering

| Test | Threshold | Status |
|---|---|---|
| createFeedItem (100 items) | < 50ms | PASS |
| createFeedItem (500 items) | < 200ms | PASS |
| createFeedItem (1000 items) | < 100ms | PASS |
| DOM insertion (100 items) | < 200ms | PASS |
| DOM insertion (500 items) | < 500ms | PASS |

**Findings:** All frontend performance tests pass well within their thresholds. The vanilla JS approach with direct DOM manipulation and simple event emitter pattern keeps operations fast. Store updates with 500+ items and event dispatch remain under 10ms.

---

## Potential Improvements

1. **Stream endpoint allocations**: The ~380KB/op for stream could be reduced by excluding `full_content` from list views and only fetching it on demand (already partially implemented via the scrape endpoint).

2. **Image proxy overhead**: The 35% filtering overhead from image rewriting could be cached or deferred to the client side.

3. **Batch operations**: The item batch insert benchmark shows good linear scaling; could be leveraged for bulk import operations.

4. **Gzip middleware**: At ~12us, it's the most expensive middleware. Consider pre-compressing static assets and only applying runtime gzip to API responses.
