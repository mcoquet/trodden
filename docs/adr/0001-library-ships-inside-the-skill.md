---
status: accepted
---
# The library ships inside the skill and is queried by a local script

A coding agent needs the right entries in its context before it writes code. We ship the library inside the skill folder and give the skill a query script that lists and fetches entries from local files, because that needs nothing hosted, works offline, and behaves the same in every harness that supports skills.

## Considered options

- **Skill with a query script (chosen).**
- **An MCP server over a master library.** This was the original idea. It is deferred: it adds a server for no gain while the library is small. It could later wrap the same script.
- **The agent reads the markdown files directly.** Rejected: the agent would decide what to read and guess. The script makes selection deterministic.

See the [first version spec](../superpowers/specs/2026-11-16-trodden-first-version-design.md).
