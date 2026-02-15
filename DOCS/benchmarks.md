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
