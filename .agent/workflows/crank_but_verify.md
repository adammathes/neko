---
description: Turn the crank with Thicket - but *verify*
---

Your goal is to improve the project by resolving tickets and discovering additional work for future agents.

1. Work on the ticket described by `thicket ready`.
2. When resolved, run `thicket close <CURRENT_TICKET_ID>`.
3. Verify your resolution by ensuring the project still builds cleanly and tests pass.
4. Think of additional work and create tickets for future agents:
   ```bash
   thicket add --title "Brief descriptive title" --description "Detailed context" --priority=<N> --type=<TYPE> --created-from <CURRENT_TICKET_ID>
   ```
5. Commit your changes.

**CRITICAL**: NEVER edit `.thicket/tickets.jsonl` directly. Always use the `thicket` CLI.