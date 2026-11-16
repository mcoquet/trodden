# Authoring rules for trodden

These rules apply to anyone (human or agent) adding to `kb/`.

- Every file in `kb/` has YAML frontmatter with at least `type` (`concern`, `variant` or `overlay`).
- Variant files use exactly these sections, in order: Use when, Rules, Example, Avoid, Related.
- Every `MUST` rule cites a source id in brackets, and that id must exist in `sources/registry.yaml`.
- Core variant files are language-neutral. Library names and idiomatic code belong in overlays (`<variant>.<lang>.md`).
- Keep files short: a variant should fit in roughly 400 words. Split instead of growing.
- Relationship keywords: `requires`, `refines`, `conflicts-with`, `alternative`, `see also`.
- Prefer established, widely documented practice over novelty. If no reputable source supports a rule, it is a `SHOULD` at most.
