# trodden

Authoring rules for library entries are in [`AGENTS.md`](AGENTS.md).

## Setup and test commands

- Setup: none. Node 20 or later, no dependencies to install.
- Full test suite: `npm test`
- Single test file: `node --test test/lint.test.mjs`
- Single test by name: `node --test --test-name-pattern "<name>" test/*.test.mjs`
- Lint the library: `node skills/trodden/scripts/trodden.mjs lint --format text`
- Code lint and format: none configured.
- Mermaid render-check: none. Check diagram syntax against the `c4-architecture` skill's `references/c4-syntax.md`.

## Living documentation

- Update `ARCHITECTURE.md` when a module is added, removed or changes responsibility.
- Update `skills/trodden/references/format.md` and `AGENTS.md` together when the entry format or a linter rule changes.
- `GLOSSARY.md`, `docs/domain-model.md`, `docs/architecture/` and `docs/adr/` describe the project as it is now. Design docs and plans in `docs/superpowers/` are point-in-time records and are not updated.
