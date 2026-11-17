# Parked ideas

Material from the original notes that is not part of the first version. Each is described under "Later" in the [first version spec](../superpowers/specs/2026-11-16-trodden-first-version-design.md).

**`overlay-structured-logging.js.md`** is a language overlay: an addition to a variant that pins the library and idioms for one programming language. Entries are language-neutral in the first version ([ADR 0002](../adr/0002-entries-are-language-neutral.md)). Overlays return only if evals show agents need the library pinned.

**`manifest-example.yaml`** is a manifest: a file in a consuming project that narrows the library to the parts the project uses and records which variants it chose. It is parked because a small library has nothing worth excluding. It still uses the old ids and the `packs` and `languages` keys, which are not settled.
