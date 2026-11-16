# Authoring rules for trodden

These rules apply to anyone (human or agent) adding to the library in `skills/trodden/library/`.

The format is defined in [`skills/trodden/references/format.md`](skills/trodden/references/format.md). That file is the authority; this is a summary. Print it with `node skills/trodden/scripts/trodden.mjs spec`, and check your work with `node skills/trodden/scripts/trodden.mjs lint --format text`.

## Format, in short

- Every entry has frontmatter with `type` (`concern` or `variant`), `id` and a one-line `summary`.
- An entry's id is its path in the library: `core/logging/structured`.
- Variant entries use exactly these sections, in order: Use when, Rules, Example, Avoid, Related.
- Every `MUST` rule cites a source id in brackets, and that id must exist in `skills/trodden/library/sources.yaml`.
- Entries are language-neutral. No library names, and examples in pseudocode.
- Keep entries short: a variant should fit in roughly 400 words. Split instead of growing.
- Relationship keywords: `requires`, `refines`, `conflicts-with`, `alternative`, `see also`.

## What belongs in the library

An entry belongs in the main library only if it passes all four tests:

1. **Cross-cutting:** it applies across projects and languages. Framework and library documentation stays out.
2. **Sourced:** at least one reputable reference supports it.
3. **Actionable:** it can be written as rules an agent can follow and a reviewer can check.
4. **Established:** widely documented practice over novelty. If no reputable source supports a rule, it is a `SHOULD` at most.

Where reputable sources support different approaches, write each as its own variant. The library does not pick a winner.

## Sources

- State every rule in your own words. Never copy the text of a source.
- Read a source before citing it, and cite it only for what it says.
