---
description: Iterate on frontend UI changes quickly with hot-reload and production verification
---

Use this workflow when working on React components or styling to ensure a fast feedback loop and correct integration.

1. **Start dev server for live iteration:**
   ```bash
   cd frontend
   npm run dev
   ```
   This runs the React dev server (Vite) at `http://localhost:5173`. Changes to `frontend/src/` will hot-reload.

2. **Make UI changes:**
   - Edit React components in `frontend/src/components/`
   - Edit CSS in `frontend/src/`
   - Verify visually in the browser

3. **Production Build & Integration:**
   Once satisfied, build the production assets and integrate them into the Go binary.
   ```bash
   # Build React assets
   cd frontend && npm run build
   # Copy to web/dist/v2 for embedding
   cd .. && make ui
   # Rebuild Go binary with new assets
   make build
   ```

4. **Verify Production Build:**
   Run the baked-in binary to ensure embedding worked correctly.
   ```bash
   ./neko --http=4994 --database=.data/test.db
   ```
   Visit `http://localhost:4994` to verify.

5. **Commit both Source and Dist:**
   **CRITICAL**: You must check in both the source code (`frontend/src/`) AND the built assets (`web/dist/v2/`). This project relies on pre-built assets being in the repo for simple deployments.

**Use this workflow when:**
- Working on CSS/styling changes
- Adjusting component layouts
- Tweaking UI animations or interactions
