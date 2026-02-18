# Testing Strategy

This document outlines the testing procedures for Neko, both locally and in Continuous Integration (CI).

## Prerequisites

To run the full test suite locally, ensure you have the following installed:

- **Go (1.24+)**
- **Node.js (20+) & npm**
- **Docker**
- **golangci-lint**


## Local Development

Developers should run tests locally before pushing changes. The `Makefile` provides several targets for this purpose:

- `make test`: Runs backend tests with coverage and frontend unit tests.
- `make lint`: Runs `golangci-lint` using the project's configuration.
- `make check`: Runs both linting and tests.
- `make ui-check`: Verifies that the built frontend assets in `web/dist/v3` match the current source code (ensures `make all` was run).
- `make test-race`: Runs backend tests with the race detector enabled.

### Git Hooks

It is recommended to use the provided git hooks to ensure tests pass before committing. Run `make install-hooks` to set them up.

## Continuous Integration (CI)

Our GitHub Actions workflow (`.github/workflows/ci.yml`) mimics the local environment to ensure consistency.

### Backend (Go)

- **Go Version**: 1.24 (or higher as specified).
- **Linting**: Uses `golangci/golangci-lint-action` with `golangci-lint` v2.x. This provides annotations directly in Pull Requests.
- **Tests**: Runs `go test -v -race ./...` to catch concurrency issues.

### Frontend (Node.js)

- **Node Version**: 20.x.
- **Tests**: Runs `npm test` in the `frontend-vanilla` directory.

### Build Consistency

- **UI Check**: Runs `make ui-vanilla` and checks for diffs in `web/dist/v3`. This ensures that the production assets checked into the repository are up-to-date with the frontend source code.

### Docker

- **Docker Build**: Verifies that the `Dockerfile` builds successfully.
- **Integration Test**: Uses `docker compose` to start the service and verifies it responds to HTTP requests on port 8080.

## Why this structure?

1. **Consistency**: Use of similar tools (Go, Node, golangci-lint) locally and in CI reduces "works on my machine" issues.
2. **Race Detection**: Always run with `-race` in CI to find subtle bugs that might be missed during quick local tests.
3. **Asset Verification**: Since we check in built assets for ease of deployment, we must verify they are consistent with the source code.
4. **Smoke Testing**: The Docker step ensures the final container is actually functional.
