# Performance & Stress Test Plan for Neko

## Overview

This plan adds Go benchmarks and frontend performance tests that establish
baselines for key operations and catch regressions over time. The tests are
designed to run quickly in CI (`make bench` for Go, `npm run test:perf` for
frontend) while also supporting longer stress runs via flags.

---

## 1. Go Backend Benchmarks (`*_bench_test.go`)

### 1a. `models/item/item_bench_test.go` — Item / Filter / Sanitization

| Benchmark | What it measures |
|---|---|
| `BenchmarkItemCreate` | Single item INSERT (baseline write speed) |
| `BenchmarkItemCreateBatch100` | 100 sequential inserts (crawler-like workload) |
| `BenchmarkFilter_Empty` | Filter query on empty result set |
| `BenchmarkFilter_15Items` | Filter returning 15 items (page size) with sanitization |
| `BenchmarkFilter_WithFTS` | Filter with full-text search query |
| `BenchmarkFilter_WithImageProxy` | Filter with image-proxy rewriting enabled |
| `BenchmarkFilterPolicy` | Isolated `filterPolicy()` creation + sanitize call |
| `BenchmarkRewriteImages` | Isolated `rewriteImages()` on HTML with 5 images |
| `BenchmarkItemSave` | Single item UPDATE (read_state/starred toggle) |

### 1b. `api/api_bench_test.go` — HTTP API Endpoints

| Benchmark | What it measures |
|---|---|
| `BenchmarkHandleStream` | Full `/stream` request→response cycle (httptest) |
| `BenchmarkHandleStreamWithSearch` | `/stream?q=...` with FTS |
| `BenchmarkHandleItemUpdate` | `PUT /item/{id}` toggle read state |
| `BenchmarkHandleFeedList` | `GET /feed` list all feeds |

### 1c. `web/web_bench_test.go` — Middleware

| Benchmark | What it measures |
|---|---|
| `BenchmarkGzipMiddleware` | Gzip compression of a JSON response |
| `BenchmarkSecurityHeaders` | Security header injection overhead |
| `BenchmarkCSRFMiddleware` | CSRF token check overhead |

### 1d. `internal/crawler/crawler_bench_test.go` — Crawl Pipeline

| Benchmark | What it measures |
|---|---|
| `BenchmarkParseFeed` | gofeed.Parse on a realistic RSS feed |
| `BenchmarkCrawlFeedMocked` | Full CrawlFeed with mocked HTTP (measures parse + DB insert pipeline) |

---

## 2. Go Stress / Regression Tests

### 2a. `api/api_stress_test.go`

| Test | What it measures |
|---|---|
| `TestStress_ConcurrentStreamReads` | 50 concurrent goroutines hitting `/stream` |
| `TestStress_ConcurrentItemUpdates` | 50 goroutines toggling read/starred on different items |
| `TestStress_LargeDataset` | Seed 1000 items, verify filter/pagination still works correctly and under threshold |

These use `testing.Short()` to skip in normal `go test` runs and only execute
during `go test -run Stress` or `make stress`.

---

## 3. Frontend Performance Tests (`frontend-vanilla/src/perf/`)

### 3a. `renderItems.perf.test.ts`

| Test | What it measures |
|---|---|
| `renderItems with 100 items completes under 50ms` | DOM rendering throughput |
| `renderItems with 500 items completes under 200ms` | Stress DOM rendering |
| `createFeedItem renders 1000 items under 100ms` | Template generation throughput |

### 3b. `store.perf.test.ts`

| Test | What it measures |
|---|---|
| `store.setItems with 500 items + event dispatch under 10ms` | Store update + event overhead |
| `store.setFeeds with 200 feeds under 5ms` | Feed list update |
| `rapid filter changes (100 toggles) under 50ms` | Event cascade throughput |

---

## 4. Makefile Integration

```makefile
bench:
	$(GO) test -bench=. -benchmem -count=3 -run=^$$ ./...

bench-short:
	$(GO) test -bench=. -benchmem -count=1 -run=^$$ ./...

stress:
	$(GO) test -run=TestStress -count=1 -timeout=120s ./...

test-perf:
	cd frontend-vanilla && $(NPM) test -- --run src/perf/
```

---

## 5. Files to Create

```
models/item/item_bench_test.go
api/api_bench_test.go
web/web_bench_test.go
internal/crawler/crawler_bench_test.go
api/api_stress_test.go
frontend-vanilla/src/perf/renderItems.perf.test.ts
frontend-vanilla/src/perf/store.perf.test.ts
Makefile  (add bench/stress/test-perf targets)
```

## 6. Files to Modify

- `Makefile` — add `bench`, `bench-short`, `stress`, `test-perf` targets

---

## Key Design Decisions

1. **Go benchmarks use in-memory SQLite** — each benchmark creates a temp DB,
   seeds data, then runs `b.ResetTimer()` so setup isn't counted.

2. **API benchmarks use `httptest`** — no network overhead, measures pure
   handler performance.

3. **Frontend perf tests use `performance.now()`** — jsdom doesn't have real
   rendering but we can measure template generation and DOM manipulation time.
   Thresholds are generous to avoid flaky CI but tight enough to catch 10x
   regressions.

4. **Stress tests are opt-in** — behind `TestStress_` prefix and skipped with
   `testing.Short()` so they don't slow normal test runs.

5. **`-benchmem` is default** — allocation tracking catches memory regressions
   even when wall-clock time looks fine.
