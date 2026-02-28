# Neko — Agent Guidelines

## Project Overview

Neko is a self-hosted, single-user RSS reader. Go backend, SQLite storage, vanilla JavaScript frontend (v3). The legacy Backbone.js frontend (v1) lives in `web/static/` — don't touch it unless asked.

## TDD Workflow

Write tests before or alongside code. Every change should have a corresponding test.

- **Go tests**: `go test -cover ./...`
- **Frontend tests**: `cd frontend-vanilla && npm test -- --run`
- **Both at once**: `make test`
- **Lint + tests**: `make check`

Run `make test` before every commit. If tests fail, fix them before committing.

## Check-in Rules

1. Run `make test` — all tests must pass.
2. If you changed anything under `frontend-vanilla/src/`, run `make all` to rebuild production assets in `web/dist/v3/`. These built assets must be committed alongside your source changes.
3. Run `make all` for any UI change. The build output is checked into the repo.
4. Write a clear, concise commit message.
5. Never commit broken tests.

## Code Layout

```
api/            REST API handlers
cmd/neko/       Main entry point
config/         Configuration
internal/       Crawler, exporter, importer, utilities
models/         Database layer (item, feed)
web/            Web server, static assets, embedded dist
frontend-vanilla/   v3 frontend source (TypeScript, CSS, Vite)
```

## Testing Conventions

- Go test files live next to the code they test (`*_test.go`).
- Frontend tests use Vitest and live next to source files (`*.test.ts`).
- Use table-driven tests in Go where appropriate.
- Mock `fetch` in frontend tests — don't hit real endpoints.

## Style Notes

- Keep it simple. This is intentionally minimal software.
- No frameworks in the frontend — vanilla JS/TS only.
- Prefer small, focused changes over large refactors.
