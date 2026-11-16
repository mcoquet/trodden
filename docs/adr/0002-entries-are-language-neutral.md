---
status: accepted
---
# Entries are language-neutral, with no overlays in the first version

Entries describe a practice and its rules without naming a programming language or a library; the agent applies them with whatever the project already uses. The original notes paired each variant with per-language overlays that pinned a library. We left overlays out of the first version, so trodden makes agents agree on rules and structure, not on library choice.

## Consequences

- Examples in entries are pseudocode.
- Overlays return only if evals show agents need the library pinned per language. The one overlay written before this decision is parked in `docs/ideas/`.

See the [first version spec](../superpowers/specs/2026-11-16-trodden-first-version-design.md).
