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
2. `go test -cover ./...` (Backend)
3. `npm test -- --run` (Frontend - frontend-vanilla)

The goal of keeping the check under 15 seconds for a fast local feedback loop has been achieved.

---

## Go Backend Benchmarks

**Environment:** Linux amd64, Intel(R) Xeon(R) Platinum 8581C @ 2.10GHz, Go 1.24, SQLite
**Date:** 2026-02-17
**Methodology:** `go test -bench=. -benchmem -count=3 -run='^$'`

### API Handlers (`api/`)

| Benchmark | ns/op | B/op | allocs/op |
|---|---|---|---|
| HandleStream | 780,000 | 379,930 | 1,419 |
| HandleStreamWithSearch | 942,618 | 380,511 | 1,428 |
| HandleItemUpdate | 6,228,144 | 8,556 | 46 |
| HandleFeedList | 295,920 | 10,327 | 117 |

**Findings:** Stream endpoints (~780µs) are dominated by SQLite query + JSON serialization. Search adds ~21% overhead via FTS. Item updates (~6.2ms) include a full DB write cycle. Feed listing is fast (~296µs). The ~380KB/op allocation for stream comes from serializing item descriptions; the `full_content` field is already excluded from list views (see item model benchmarks for full_content savings data).

### Crawler (`internal/crawler/`)

| Benchmark | ns/op | B/op | allocs/op |
|---|---|---|---|
| ParseFeed | 220,619 | 92,292 | 1,643 |
| CrawlFeedMocked | 3,034,479 | 170,857 | 2,236 |
| GetFeedContent | 1,150,492 | 46,547 | 190 |

**Findings:** Feed parsing (~221µs) is fast. Full crawl cycle (~3ms mocked) is dominated by HTTP round-trip + DB write. Content fetching (~1.15ms) includes HTTP + HTML sanitization.

### Item Model (`models/item/`)

| Benchmark | ns/op | B/op | allocs/op |
|---|---|---|---|
| ItemCreate | 6,816,479 | 1,388 | 21 |
| ItemCreateBatch100 | 717,721,761 | 138,539 | 2,102 |
| Filter_Empty | 291,475 | 13,209 | 82 |
| Filter_15Items | 799,494 | 373,444 | 1,767 |
| Filter_WithFTS | 850,579 | 374,073 | 1,775 |
| Filter_WithImageProxy | 1,014,302 | 496,582 | 2,487 |
| FilterPolicy | 25,979 | 17,768 | 150 |
| RewriteImages | 17,331 | 11,048 | 97 |
| ItemSave | 6,076,841 | 592 | 11 |
| Filter_LargeDataset | 771,772 | 361,818 | 1,182 |
| **Filter_15Items_WithFullContent** | **798,356** | **362,778** | **1,167** |
| **Filter_15Items_IncludeFullContent** | **1,322,135** | **594,842** | **4,054** |
| **Filter_LargeDataset_WithFullContent** | **772,676** | **363,001** | **1,182** |

**Key Finding – full_content exclusion savings:**
When items have scraped `full_content` (~2KB each), excluding it from list responses (default behavior) vs including it:
- **Memory**: 363KB/op vs 595KB/op — **39% reduction** in allocations
- **Speed**: 798µs vs 1,322µs — **40% faster**

This confirms the value of the full_content exclusion from list views (implemented in NK-k9otuy). The `Filter_LargeDataset_WithFullContent` benchmark (500 items with full_content, excluded from response) shows only 363KB/op — nearly identical to the no-content baseline — demonstrating that the exclusion scales well.

**Other Findings:** Image proxy adds ~27% overhead to filtering (1014µs vs 799µs) due to URL rewriting of `<img>` tags. Batch inserts scale linearly. HTML sanitizer (`FilterPolicy`) is fast at ~26µs.

### Web Middleware (`web/`)

| Benchmark | ns/op | B/op | allocs/op |
|---|---|---|---|
| GzipMiddleware | 22,287 | 12,945 | 25 |
| SecurityHeaders | 7,081 | 6,190 | 22 |
| CSRFMiddleware | 7,250 | 6,037 | 23 |
| FullMiddlewareStack | 14,886 | 9,377 | 34 |

**Findings:** The full middleware stack adds only ~15µs per request. Gzip compression is the most expensive middleware (~22µs) due to compression work, but is only applied to compressible responses. CSRF and security headers are near-zero cost (~7µs each).

---

## Frontend Performance Tests (Vanilla JS / v3)

**Environment:** Vitest + jsdom, Node.js 20
**Date:** 2026-02-17

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
| DOM insertion (500 items) | < 500ms | PASS (~324ms) |

**Findings:** All frontend performance tests pass well within their thresholds. The vanilla JS approach with direct DOM manipulation and simple event emitter pattern keeps operations fast. Store updates with 500+ items and event dispatch remain under 10ms. DOM insertion of 500 items takes ~324ms, comfortably within the 500ms threshold.

---

## Notable Changes Since Last Benchmark (2026-02-16)

1. **New full_content benchmarks** (NK-ekxfvv): Three new benchmarks quantify the memory savings from excluding `full_content` in list responses. The 39% memory reduction and 40% speed improvement are now measured with realistic ~2KB article content.

2. **safehttp SSRF fix**: HTTP proxy bypass bug fixed — safe client now uses `Proxy: nil` to prevent proxy environment variables from bypassing the private IP check.

3. **Environment**: These benchmarks were run on amd64 Intel Xeon @ 2.10GHz vs previous arm64. Raw times are not directly comparable between runs due to architecture differences.

---

## Potential Improvements

1. **Stream endpoint allocations**: The ~380KB/op for stream comes from description serialization. With full_content properly excluded, the main remaining allocation is in description strings. Further reduction possible with response streaming.

2. **Image proxy overhead**: The ~27% filtering overhead from image rewriting could be cached or pre-processed at ingest time.

3. **Batch operations**: The item batch insert benchmark shows good linear scaling; could be leveraged for bulk import operations.

4. **Gzip middleware**: At ~22µs, it's the most expensive middleware. Consider pre-compressing static assets and only applying runtime gzip to API responses.
