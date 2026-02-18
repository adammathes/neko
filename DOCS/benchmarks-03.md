# Benchmarks - 03

## `make check` execution time

| Run | Time (real) | Status        |
| --- | ----------- | ------------- |
| 1   | 14.3s       | Warm (cached) |
| 2   | 14.4s       | Warm (cached) |
| 3   | 14.3s       | Warm (cached) |

**Environment:** Linux (arm64 VM)
**Date:** 2026-02-17
**Status:** The goal of keeping the check under 15 seconds remains satisfied even with a growing test suite (77 tests).

---

## Go Backend Benchmarks

**Environment:** Linux arm64, Go 1.24, SQLite
**Date:** 2026-02-17
**Methodology:** `go test -bench=. -benchmem -count=3 -run='^$' ./...`

### API Handlers (`api/`)

| Benchmark              | ns/op   | B/op    | allocs/op |
| ---------------------- | ------- | ------- | --------- |
| HandleStream           | 161,000 | 379,800 | 1,419     |
| HandleStreamWithSearch | 184,000 | 380,700 | 1,429     |
| HandleItemUpdate       | 49,500  | 8,500   | 46        |
| HandleFeedList         | 23,500  | 10,300  | 117       |

**Findings:**
1. **Corrected Latency:** Initial reports of 45ms latency for stream endpoints were erroneous (likely due to environment noise or transient setup issues). Actual performance is **~160µs**, perfectly aligned with raw database performance.
2. **Allocation Bottleneck:** Memory profiling reveals that **85-90% of allocations** in the stream path occur within `bluemonday` sanitization. Specifically, `html.NewTokenizerFragment` is the primary allocator.
3. **Search Interaction:** Providing a search parameter (`q`) currently hard-disables the `unreadOnly` filter in the code, which is an unintended functional side effect.

### Crawler (`internal/crawler/`)

| Benchmark       | ns/op   | B/op    | allocs/op |
| --------------- | ------- | ------- | --------- |
| ParseFeed       | 99,000  | 92,200  | 1,643     |
| CrawlFeedMocked | 813,000 | 169,500 | 2,233     |
| GetFeedContent  | 125,000 | 46,500  | 189       |

**Findings:** Crawler performance remains excellent. Parsing is efficient, and the full mocked crawl cycle is under 1ms.

### Item Model (`models/item/`)

| Benchmark                         | ns/op     | B/op    | allocs/op |
| --------------------------------- | --------- | ------- | --------- |
| ItemCreate                        | 56,000    | 1,415   | 22        |
| ItemCreateBatch100                | 5,700,000 | 139,200 | 2,100     |
| Filter_15Items                    | 160,000   | 373,440 | 1,767     |
| Filter_WithFTS                    | 175,000   | 374,070 | 1,775     |
| Filter_WithImageProxy             | 212,000   | 496,580 | 2,487     |
| Filter_LargeDataset               | 137,000   | 361,800 | 1,182     |
| Filter_15Items_WithFullContent    | 133,000   | 362,700 | 1,167     |
| Filter_15Items_IncludeFullContent | 350,000   | 594,800 | 4,054     |

**Findings:**
1. **Full Content Savings:** Excluding `full_content` continues to provide ~40% memory reduction (362KB vs 594KB) and ~60% speed improvement (133µs vs 350µs).
2. **Sanitization Overhead:** Raw database filtering is fast, but the model-level sanitization policy is recreated on every call, contributing to the high allocation count.

### Web Middleware (`web/`)

| Benchmark           | ns/op  | B/op   | allocs/op |
| ------------------- | ------ | ------ | --------- |
| GzipMiddleware      | 12,000 | 11,800 | 25        |
| SecurityHeaders     | 1,900  | 6,185  | 22        |
| CSRFMiddleware      | 2,000  | 6,027  | 23        |
| FullMiddlewareStack | 3,200  | 8,500  | 34        |

**Findings:** Middleware overhead is negligible on arm64 (~3.2µs for the full stack).

---

## Frontend Performance Tests (Vanilla JS / v3)

**Environment:** Vitest + jsdom, Node.js 20 (arm64)
**Date:** 2026-02-17

| Test                                  | Measured | Status |
| ------------------------------------- | -------- | ------ |
| setItems (500 items + event dispatch) | 0.8ms    | PASS   |
| setItems append (500 to existing 500) | 1.1ms    | PASS   |
| setFeeds (200 feeds)                  | 0.4ms    | PASS   |
| Rapid filter changes (100 toggles)    | 12ms     | PASS   |
| DOM insertion (100 items)             | 48ms     | PASS   |
| DOM insertion (500 items)             | 243ms    | PASS   |

**Findings:** Frontend performance is extremely snappy. The vanilla JS architecture ensures dataset operations remain sub-millisecond, with DOM rendering well within safe limits.

---

## Analysis & Suggestions

1. **Ingest-Time Sanitization (Priority 1):**
   - The majority of CPU and memory usage in `HandleStream` is due to on-the-fly HTML sanitization of titles and descriptions. Moving this to the crawler phase (sanitizing once at ingest) would drastically reduce API memory pressure and further improve latency.

2. **Search Logic Correction:**
   - Modify the `HandleStream` logic to allow search queries to respect the `unread_only` filter. Currently, search forces all items to be shown, which is inconsistent with user expectations.

3. **Sanitization Policy Singleton:**
   - In the immediate term, modify `item.filterPolicy()` to use a global singleton to avoid thousands of small allocations per request when creating the `bluemonday.Policy` object.

4. **Recommendation:**
   - The system is currently very performant (~160µs total latency is negligible for this application). Optimization efforts should focus on reducing memory churn (allocations) rather than raw speed, as this will improve scalability on lower-resource environments.
