---
description: Run tests in a safe, controlled manner to avoid VM crashes
---

Use this workflow to run tests with extra precautions, especially Playwright/E2E tests that have historical stability issues.

1. **Pre-flight checks:**
   ```bash
   # Ensure clean environment
   ./clean_test_env.sh
   # Check for stray processes
   ps aux | grep -E 'neko|playwright|chrome'
   ```

2. **Backend tests (Go):**
   // turbo
   ```bash
   go test -v -timeout=5m ./...
   ```

3. **Frontend unit tests (Node):**
   // turbo
   ```bash
   cd frontend && npm test -- --run
   ```

4. **E2E tests (Safe Wrapper):**
   Use the safe wrapper script which handles timeouts and automatic cleanup.
   ```bash
   ./run_e2e_safe.sh
   ```
   
   If E2E tests fail or hang:
   - Check `backend.log` for server issues
   - Run `./clean_test_env.sh` to reset the database and environment
   - Create a ticket in Thicket for any flaky tests discovered

5. **Report results:**
   - Document any flaky tests in the relevant Thicket ticket
   - Update the ticket with coverage information if applicable

**CRITICAL**: NEVER run Playwright tests directly via `npm run test:e2e` if you are unsure of stability. Always use the `./run_e2e_safe.sh` wrapper.
