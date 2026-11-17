# trodden First Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the loose notes in this repo into a working first version of trodden: a linted entry format, a small `core` library, a skill with a query script, and a small eval.

**Architecture:** A self-contained skill folder (`skills/trodden/`) holds the library (markdown entries plus a source registry), a format reference, and a plain Node script that lists, fetches and lints entries. All reads of the library go through one loader. A separate eval runner in `evals/` drives a coding agent with and without the skill and has a judge model score the result against the entries' MUST rules.

**Tech Stack:** Node.js 20+ (ES modules, built-in test runner, no dependencies, no build step), Markdown, a restricted YAML subset, GitHub Actions, Claude Code headless mode for the eval.

**Spec:** `docs/superpowers/specs/2026-11-16-trodden-first-version-design.md` (approved by Miguel on 2026-11-16; its status line was not updated because specs are point-in-time records). Read it before starting any task.

## Global Constraints

- Node version 20 or later. `package.json` has no `dependencies` and no `devDependencies`. No build step.
- The skill folder `skills/trodden/` is self-contained: nothing in it imports from outside it.
- The script reads local files only. No network calls anywhere under `skills/trodden/`.
- Nothing in the script is specific to software engineering content. No concern, variant or programming-language names in code, except the fence allowlist in Task 7.
- Every read of a library goes through `loadLibrary` (Task 6). No other module touches the library's files.
- Exit codes: `0` success, `1` lint errors found, `2` bad usage or unknown id.
- Entries are language-neutral. Examples are pseudocode in fences with no language, or `text` or `pseudocode`.
- Entries state rules in their own words and cite the source. Never copy source text.
- Every MUST cites at least one source id that exists in `sources.yaml`.
- Use the terms in `GLOSSARY.md` exactly: library, area, concern, variant, entry, rule, source, source registry, relationship, query script, linter, finding, eval.
- Licences: MIT for script and tooling, CC BY 4.0 for library entries.
- Work on the session's assigned branch. Commit after every task.

## Review Focus

Inputs the spec implies but does not spell out. Each has a test in the task named.

1. **Rule-like text inside a code fence.** A `## Heading` or `- MUST ...` line inside a fenced block in an entry is example text, not a section or a rule. (Task 5)
2. **The skill folder copied elsewhere and run from another directory.** The default library is found relative to the script file, not the working directory, including when the path contains spaces. (Task 8)
3. **A broken entry when an agent queries.** One malformed entry or a `requires` loop must not crash or hang `list` and `get`; healthy entries are still returned and the problem is reported on stderr. (Tasks 6 and 8)
4. **Values containing colons, brackets or quotes.** A `summary` or source `title` such as `"The Twelve-Factor App: XI. Logs"` or a URL parses as one string. (Task 4)
5. **An eval run that goes wrong partway.** The agent changes nothing, the harness fails, or the judge returns something unparseable: the case is recorded as such and the run continues. (Task 12)

## File Structure

```
package.json                         test script, engines, no dependencies
LICENSE                              MIT
CLAUDE.md                            setup and test commands
.github/workflows/ci.yml             tests and library lint
.claude-plugin/plugin.json           Claude Code plugin manifest
.claude-plugin/marketplace.json      lets the repo be added as a plugin source
skills/trodden/
  SKILL.md
  references/format.md               the entry format and linter rules
  scripts/trodden.mjs                CLI entry: arguments, dispatch, exit codes
  scripts/lib/yaml.mjs               restricted YAML subset parser
  scripts/lib/entry.mjs              parses one entry file
  scripts/lib/library.mjs            loads a library; index and resolution
  scripts/lib/lint.mjs               linter rules and report
  scripts/lib/render.mjs             markdown and text output
  library/LICENSE                    CC BY 4.0
  library/sources.yaml
  library/core/logging/{_concern,structured}.md
  library/core/errors/{_concern,retry-backoff}.md
  library/core/config/{_concern,environment}.md
test/
  helpers.mjs                        temp-library builders
  {yaml,entry,library,lint,cli,skill}.test.mjs
evals/
  run.mjs                            eval CLI
  lib/{tasks,harness,claude-code,judge,score}.mjs
  fixtures/orders-service/           small project the tasks run against
  tasks/<id>/task.json
  test/{score,judge,run}.test.mjs
  results/                           committed output of real runs
docs/
  adr/0001-*.md, 0002-*.md
  ideas/                             parked overlay and manifest example
  domain-model.md
  architecture/{README,c4-context,c4-containers}.md
ARCHITECTURE.md
```

---

### Task 1: Project scaffold and commands

**Files:**
- Create: `package.json`, `LICENSE`, `CLAUDE.md`, `.gitignore`, `test/smoke.test.mjs`

- [ ] **Step 1: Write `package.json`**

Fields: `"name": "trodden"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=20" }`, and one script: `"test": "node --test test/*.test.mjs evals/test/*.test.mjs"`. No dependency fields. Until `evals/test/` exists (Task 12) the script is `node --test test/*.test.mjs`.

- [ ] **Step 2: Write `test/smoke.test.mjs`**

One test, `runs on a supported Node version`, asserting `Number(process.versions.node.split('.')[0]) >= 20`.

- [ ] **Step 3: Run `npm test`**

Expected: 1 test passes.

- [ ] **Step 4: Write `LICENSE` (MIT), `.gitignore` and `CLAUDE.md`**

`LICENSE`: standard MIT text, `Copyright (c) 2026 Miguel Coquet`. `.gitignore`: `node_modules/`, `.superpowers/`.

`CLAUDE.md` contains exactly this section, plus one line pointing to `AGENTS.md` for authoring rules:

```markdown
## Setup and test commands

- Setup: none. Node 20 or later, no dependencies to install.
- Full test suite: `npm test`
- Single test file: `node --test test/lint.test.mjs`
- Single test by name: `node --test --test-name-pattern "<name>" test/*.test.mjs`
- Lint the library: `node skills/trodden/scripts/trodden.mjs lint --format text`
- Code lint and format: none configured.
- Mermaid render-check: none. Check diagram syntax against the `c4-architecture` skill's `references/c4-syntax.md`.
```

- [ ] **Step 5: Commit** (`chore: scaffold package, licence and commands`)

---

### Task 2: Record the two approved decisions as ADRs

**Files:**
- Create: `docs/adr/0001-library-ships-inside-the-skill.md`, `docs/adr/0002-entries-are-language-neutral.md`

- [ ] **Step 1: Write both ADRs**

Use the `domain-modeling` skill's `ADR-FORMAT.md`. Content comes from the spec's Approaches and Non-goals sections.

- 0001: the library ships inside the skill and is queried by a local script; an MCP server over a master library was the original idea and is deferred; reading the markdown directly was rejected.
- 0002: entries are language-neutral with no overlays in the first version; overlays return only if evals show agents need the library pinned per language.

- [ ] **Step 2: Verify**

Each ADR states the decision as approved in the spec, names the alternatives, and adds nothing the spec does not say.

- [ ] **Step 3: Commit** (`docs: add ADRs for skill-bundled library and language-neutral entries`)

---

### Task 3: Format reference and first migrated entries (review checkpoint)

**Files:**
- Create: `skills/trodden/references/format.md`, `skills/trodden/library/LICENSE`, `docs/ideas/README.md`
- Move: `kb/logging/_concern.md` → `skills/trodden/library/core/logging/_concern.md`
- Move: `kb/logging/structured.md` → `skills/trodden/library/core/logging/structured.md`
- Move: `sources/registry.yaml` → `skills/trodden/library/sources.yaml`
- Move: `kb/logging/structured.js.md` → `docs/ideas/overlay-structured-logging.js.md`
- Move: `examples/patterns.yaml` → `docs/ideas/manifest-example.yaml`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: the format every later task implements. Tasks 4 to 8 treat `format.md` as the authority; if this task's review changes the format, update the affected task before starting it.

- [ ] **Step 1: Write `format.md`**

Headings, in order: Library layout, Ids, Frontmatter, Concern entries, Variant entries, Rules, Relationships, Source registry, Linter rules, Complete example. Content is the spec's "Entry format" and "Linter" sections plus these decisions the spec leaves open:

- **Layout:** `<library>/sources.yaml`, `<library>/<area>/<concern>/_concern.md`, `<library>/<area>/<concern>/<variant>.md`. Files that do not end in `.md`, and dotfiles, are ignored. Any other `.md` file at another depth is an `id-path` error.
- **Title:** every entry has exactly one `#` heading, directly after the frontmatter.
- **Frontmatter subset:** `key: value` and `key: [a, b]`. Values may be wrapped in double quotes. Full-line `#` comments and blank lines are allowed.
- **Sections:** variants have exactly Use when, Rules, Example, Avoid, Related, as `##` headings, in that order, and no other `##` heading. Concerns have Forces, then optionally Out of scope, then optionally Related, and no other `##` heading.
- **Rules:** every list item in Rules starts with `MUST NOT`, `MUST`, `SHOULD NOT` or `SHOULD`. Source ids go in square brackets at the end of the item: `[a]` or `[a, b]`. Every cited id is also listed in the entry's `sources`.
- **Relationships:** one per list item, `- <keyword>: <id>`, optionally followed by ` (planned)`. An empty Related section holds the single line `None.`
- **Code fences:** no language, or `text` or `pseudocode`.
- **Linter rules:** the spec's table of eleven rules, with the exact names and severities.

- [ ] **Step 2: Move the files and migrate the two logging entries to the format**

Changes to `structured.md`:

- `id: core/logging/structured`; drop the `concern` field; add `summary: Emit logs as machine-parseable events with consistent fields.`
- "Use when" becomes a `## Use when` section.
- Related becomes two list items: `- requires: core/tracing/correlation-ids (planned)` and `- alternative: core/logging/audit-trail (planned)`.

Changes to `_concern.md`:

- `id: core/logging`; add `summary: Recording events from a running system so people and machines can understand what happened.`
- Delete the hand-written Variants table and the sentence about combining variants (move that sentence into Forces as a bullet).
- Section order becomes Forces, Out of scope, Related. Related holds `- see also: core/errors (planned)`.

Changes to `sources.yaml`: remove `pino-docs`.

- [ ] **Step 3: Write `skills/trodden/library/LICENSE` and `docs/ideas/README.md`**

`LICENSE`: the full CC BY 4.0 legal code, fetched from `https://creativecommons.org/licenses/by/4.0/legalcode.txt`, preceded by one line: `The entries in this library are licensed under CC BY 4.0.` If the URL cannot be fetched, stop and report; do not write the licence from memory.

`docs/ideas/README.md`: two short paragraphs saying what the overlay and the manifest example are and why they are parked, linking to the spec's Later section.

- [ ] **Step 4: Update `AGENTS.md`**

Replace its rules with a summary that matches `format.md` and points to it as the authority. Remove the overlay rule. Keep the 400-word limit, the "established practice over novelty" rule and the relationship keywords. Add the four editorial tests from the spec (cross-cutting, sourced, actionable, established) and the "never copy source text" rule.

- [ ] **Step 5: Verify by hand**

Read both migrated entries against `format.md` line by line. Confirm `kb/`, `sources/` and `examples/` no longer exist.

- [ ] **Step 6: Commit** (`feat: add format reference and migrate logging entries`)

- [ ] **Step 7: STOP for Miguel's review**

Ask Miguel to review `skills/trodden/references/format.md` and `skills/trodden/library/core/logging/structured.md`. Do not start Task 4 until he approves. Apply any changes he asks for in this task and carry them into the later tasks they affect.

---

### Task 4: Restricted YAML parser

**Files:**
- Create: `skills/trodden/scripts/lib/yaml.mjs`
- Test: `test/yaml.test.mjs`

**Interfaces:**
- Produces: `parseYamlSubset(text: string, opts?: { nested?: boolean }) → Record<string, string | string[] | Record<string, string | string[]>>`. Throws `YamlSubsetError` (exported, extends `Error`) with a numeric `line` property (1-based).

- [ ] **Step 1: Write the failing tests**

```js
// flat
parseYamlSubset('type: variant\nsources: [a, b]\n')        // → { type: 'variant', sources: ['a', 'b'] }
parseYamlSubset('sources: []')                              // → { sources: [] }
parseYamlSubset('# note\n\nid: core/x\n')                   // → { id: 'core/x' }
// Review Focus 4: colons, brackets and quotes in values
parseYamlSubset('title: "The Twelve-Factor App: XI. Logs"') // → { title: 'The Twelve-Factor App: XI. Logs' }
parseYamlSubset('url: https://12factor.net/logs')           // → { url: 'https://12factor.net/logs' }
parseYamlSubset('summary: Use [brackets] mid-sentence: fine') // → { summary: 'Use [brackets] mid-sentence: fine' }
parseYamlSubset('a: 1\r\nb: 2\r\n')                         // → { a: '1', b: '2' }
// nested (source registry)
parseYamlSubset('x:\n  title: T\n  url: U\n', { nested: true }) // → { x: { title: 'T', url: 'U' } }
// errors, each a YamlSubsetError with the right line
'a: 1\na: 2'            // duplicate key, line 2
'just text'             // no colon, line 1
'x:\n  title: T'        // nesting without { nested: true }, line 1
'x:\n  y:\n    z: 1'    // two levels of nesting with { nested: true }, line 2
```

A value is a list only when the whole value starts with `[` and ends with `]`. All scalars are strings.

- [ ] **Step 2: Run** `node --test test/yaml.test.mjs` — expected: fails, module not found.
- [ ] **Step 3: Implement `parseYamlSubset` and `YamlSubsetError`.**
- [ ] **Step 4: Run again** — expected: all pass.
- [ ] **Step 5: Commit** (`feat: add restricted YAML parser`)

---

### Task 5: Entry parser

**Files:**
- Create: `skills/trodden/scripts/lib/entry.mjs`
- Test: `test/entry.test.mjs`

**Interfaces:**
- Consumes: `parseYamlSubset` from Task 4.
- Produces: `parseEntry(text: string) → ParsedEntry`. It never throws.

```
ParsedEntry = {
  frontmatter: object | null,          // null when missing or unparseable
  frontmatterError: string | null,
  title: string | null,                // text of the first # heading
  titleCount: number,
  body: string,                        // everything after the frontmatter
  sections: { heading: string, body: string, line: number }[],   // ## headings, in file order
  rules: { level: 'MUST'|'MUST NOT'|'SHOULD'|'SHOULD NOT'|null, text: string, sources: string[], line: number }[],
  relationships: { kind: string|null, target: string|null, planned: boolean, line: number, raw: string }[],
  fences: { lang: string, line: number }[],
  wordCount: number                    // whitespace-separated tokens in body
}
```

`rules` holds every list item of the Rules section; `level` is `null` when the item starts with none of the four keywords. `relationships` holds every list item of the Related section; `kind` and `target` are `null` when the item does not match `<keyword>: <id>`. Line numbers are 1-based in the whole file.

- [ ] **Step 1: Write the failing tests**

Using the migrated `structured.md` text as the main input:

```js
e.frontmatter.id === 'core/logging/structured'
e.title === 'Structured logging'
e.sections.map(s => s.heading)   // → ['Use when', 'Rules', 'Example', 'Avoid', 'Related']
e.rules.length === 7
e.rules[0]                       // level 'MUST', sources ['otel-semconv']
e.rules[2].level === 'MUST NOT'
e.rules[5]                       // level 'SHOULD', sources []
e.relationships[0]               // kind 'requires', target 'core/tracing/correlation-ids', planned true
e.fences                         // → [{ lang: '', line: <n> }]
```

Further cases:

- `- MUST do A. [a, b]` → `sources: ['a', 'b']`.
- `- Do A.` in Rules → `level: null`.
- `- see also: core/x` → `kind: 'see also'`; `- depends: core/x` → `kind: 'depends'`; `- nonsense` → `kind: null, target: null`.
- No frontmatter → `frontmatter: null`, `frontmatterError` set, sections still parsed.
- Two `#` headings → `titleCount: 2`.
- CRLF line endings give the same result as LF.
- **Review Focus 1:** an Example section whose fence contains the lines `## Not a section` and `- MUST not be a rule` yields no extra section and no extra rule.

- [ ] **Step 2: Run** `node --test test/entry.test.mjs` — expected: fails, module not found.
- [ ] **Step 3: Implement `parseEntry`.** Track fence state line by line so headings and list items inside fences are skipped.
- [ ] **Step 4: Run again** — expected: all pass.
- [ ] **Step 5: Commit** (`feat: add entry parser`)

---

### Task 6: Library loader, index and resolution

**Files:**
- Create: `skills/trodden/scripts/lib/library.mjs`, `test/helpers.mjs`
- Test: `test/library.test.mjs`

**Interfaces:**
- Consumes: `parseEntry` (Task 5), `parseYamlSubset` (Task 4).
- Produces, from `library.mjs`:

```
loadLibrary(root: string) → Library                // throws LibraryNotFoundError if root is not a directory
Library = {
  root: string,
  sources: Map<string, { title?: string, url?: string }>,
  sourcesError: string | null,                     // missing or unparseable sources.yaml
  files: LoadedEntry[],                            // every entry file found, sorted by path
  entries: Map<string, LoadedEntry>                // usable entries, keyed by id
}
LoadedEntry = ParsedEntry & { path: string, expectedId: string | null, id: string | null, type: string | null }
listIndex(lib, prefix?: string) → { id, type, summary }[]      // sorted by id; throws UnknownIdError if prefix matches nothing
resolve(lib, ids: string[]) → { entries: LoadedEntry[], sources: { id, title, url }[], skipped: string[] }
variantsOf(lib, concernId: string) → LoadedEntry[]             // sorted by id
```

`path` is relative to the root with forward slashes. `expectedId` is derived from the path (`core/logging/_concern.md` → `core/logging`; `core/logging/structured.md` → `core/logging/structured`; `null` at any other depth). An entry is usable, and so in `entries`, when its frontmatter parsed, its `id` equals `expectedId`, and its `type` is `concern` or `variant`.

`resolve` returns the requested entries in the order given, then every variant they require, followed transitively and depth-first, each included once. Planned targets are not followed. A `requires` target that is missing or unusable is added to `skipped`. It throws `UnknownIdError` (with an `id` property) when a requested id is not in `entries`. `sources` lists every source cited by the returned entries, in first-use order.

- Produces, from `test/helpers.mjs`:

```
makeLibrary(files: Record<string, string>) → string   // writes to a fresh temp dir, returns its root
variantText({ id, summary, sources, useWhen, rules, example, avoid, related }) → string
concernText({ id, summary, forces, outOfScope, related }) → string
validFiles() → Record<string, string>
```

Every field of the two builders has a valid default, so a test overrides only what it is testing. `makeLibrary` adds a `sources.yaml` defining `src-a` and `src-b` unless the files include one. `validFiles()` returns a concern `core/alpha` with variants `core/alpha/one` (cites `src-a`, requires `core/alpha/two`) and `core/alpha/two` (cites `src-b`).

- [ ] **Step 1: Write the helpers and the failing tests**

```js
const lib = loadLibrary(makeLibrary(validFiles()))
[...lib.entries.keys()]                    // → ['core/alpha', 'core/alpha/one', 'core/alpha/two']
listIndex(lib).map(e => e.id)              // same three, in that order
listIndex(lib, 'core/alpha/one').length    // → 1
listIndex(lib, 'nope')                     // throws UnknownIdError
resolve(lib, ['core/alpha/one']).entries.map(e => e.id)   // → ['core/alpha/one', 'core/alpha/two']
resolve(lib, ['core/alpha/one']).sources.map(s => s.id)   // → ['src-a', 'src-b']
resolve(lib, ['core/alpha/two', 'core/alpha/one']).entries.length  // → 2, no duplicate
resolve(lib, ['core/missing'])             // throws UnknownIdError
variantsOf(lib, 'core/alpha').length       // → 2
loadLibrary('/no/such/dir')                // throws LibraryNotFoundError
```

Further cases:

- `LICENSE`, `.DS_Store` and `notes.txt` in the library root or an area folder are not in `files`.
- `core/README.md` is in `files` with `expectedId: null` and is not in `entries`.
- A missing `sources.yaml` sets `sourcesError` and leaves `sources` empty; entries still load.
- **Review Focus 3:** with `core/alpha/two.md` replaced by text that has no frontmatter, `listIndex` returns the other two entries, and `resolve(lib, ['core/alpha/one'])` returns one entry with `skipped: ['core/alpha/two']`.
- **Review Focus 3:** when `one` requires `two` and `two` requires `one`, `resolve(lib, ['core/alpha/one'])` returns both, once each, and terminates.

- [ ] **Step 2: Run** `node --test test/library.test.mjs` — expected: fails, module not found.
- [ ] **Step 3: Implement `library.mjs`.**
- [ ] **Step 4: Run again** — expected: all pass.
- [ ] **Step 5: Commit** (`feat: add library loader, index and resolution`)

---

### Task 7: Linter

**Files:**
- Create: `skills/trodden/scripts/lib/lint.mjs`
- Test: `test/lint.test.mjs`

**Interfaces:**
- Consumes: `Library` from Task 6; the helpers from `test/helpers.mjs`.
- Produces:

```
RULES: { name: string, severity: 'error'|'warning'|'info', description: string }[]   // the eleven rules, in the spec's order
lint(lib: Library) → { findings: Finding[], summary: { errors: number, warnings: number, info: number } }
Finding = { rule: string, severity: string, path: string, line?: number, message: string }
```

Findings are sorted by `path`, then `line`, then `rule`. Findings about the source registry use the path `sources.yaml`.

What each rule reports, beyond the spec's one-line description:

| Rule | Reports |
|---|---|
| `frontmatter` | Missing or unparseable frontmatter; missing `type`, `id` or `summary`; `type` not `concern` or `variant`; `type` not matching the file name (`_concern.md` is a concern, any other file a variant); `sources` not a list; a source cited in a rule but absent from the entry's `sources` |
| `id-path` | `id` differs from `expectedId`; an `.md` file at a depth where no entry belongs; two files with the same `id`; a variant whose folder has no `_concern.md` |
| `section-order` | No `#` title or more than one; a required section missing; sections out of order; a duplicate or unknown `##` section; a Rules section with no items; a Rules item with `level: null` |
| `uncited-must` | A `MUST` or `MUST NOT` with no sources |
| `unknown-source` | A source id, in `sources` or in a rule, that is not in the registry; a missing or unparseable registry; a registry entry without `title` or `url` |
| `broken-ref` | A Related item that does not parse; an unknown keyword; a target that does not exist and is not planned; a target equal to the entry itself; `requires`, `refines`, `conflicts-with` or `alternative` where either end is a concern; any keyword other than `see also` declared by a concern |
| `requires-cycle` | One finding per loop, on the entry in the loop with the smallest id, with the loop written out in the message |
| `length` | A variant whose `wordCount` is over 400 |
| `language-specific` | A fence whose language is anything other than empty, `text` or `pseudocode` |
| `planned-ref` | Every relationship marked planned; the message says so when the target now exists |
| `orphaned-source` | A registry entry cited by no entry |

A concern with no variants is not reported: the spec defines no rule for it.

- [ ] **Step 1: Write the failing tests**

- `valid library has no findings`: `lint(loadLibrary(makeLibrary(validFiles())))` → `findings: []`, summary all zero.
- `RULES matches the spec`: names in order are `frontmatter, id-path, section-order, uncited-must, unknown-source, broken-ref, requires-cycle, length, language-specific, planned-ref, orphaned-source`; the first seven are `error`, the next two `warning`, the last two `info`.
- `format.md lists every rule`: each `RULES` name appears in `skills/trodden/references/format.md`.
- One test per row of the table above for each reported case: start from `validFiles()`, change one thing, and assert a finding with that rule, severity and path, and no finding from any other rule of severity `error`. Example:

```js
const files = validFiles()
files['core/alpha/one.md'] = variantText({ id: 'core/alpha/one', rules: ['MUST do A.'], related: ['- requires: core/alpha/two'] })
const { findings, summary } = lint(loadLibrary(makeLibrary(files)))
// findings → [{ rule: 'uncited-must', severity: 'error', path: 'core/alpha/one.md', line: <n>, message: <string> }]
// summary.errors === 1
```

- `length`: 400 words gives no finding, 401 gives one.
- `planned-ref`: a planned target that does not exist gives one `info` finding and no `broken-ref`.

- [ ] **Step 2: Run** `node --test test/lint.test.mjs` — expected: fails, module not found.
- [ ] **Step 3: Implement `lint.mjs`.**
- [ ] **Step 4: Run again** — expected: all pass.
- [ ] **Step 5: Commit** (`feat: add linter`)

---

### Task 8: Command line, output and CI

**Files:**
- Create: `skills/trodden/scripts/trodden.mjs`, `skills/trodden/scripts/lib/render.mjs`, `.github/workflows/ci.yml`
- Test: `test/cli.test.mjs`
- Delete: `test/smoke.test.mjs`

**Interfaces:**
- Consumes: `loadLibrary`, `listIndex`, `resolve`, `variantsOf`, `UnknownIdError`, `LibraryNotFoundError` (Task 6); `lint` (Task 7).
- Produces:

```
main(argv: string[], io: { stdout: { write(s) }, stderr: { write(s) } }) → number    // the exit code; exported from trodden.mjs
renderList(index) → string
renderGet(lib, resolved) → string
renderFindings(report) → string
```

`trodden.mjs` calls `main(process.argv.slice(2), process)` and exits with its result only when run directly.

Commands and options:

- `list [<area or concern id>] [--json]`
- `get <id>... [--json]`
- `lint [<library path>] [--format json|text]` — JSON is the default. The positional path means the same as `--library`; giving both is a usage error.
- `spec` — prints `references/format.md`.
- `--library <path>` on any command. The default is `../library`, resolved from the script file's own location.
- `--help`, or no arguments: usage text. Exit `0` for `--help`, `2` for no arguments.

Output:

- `list`, markdown: one line per entry, `<id> — <summary>`, with variants indented two spaces under their concern.
- `list --json`: `{ "entries": [{ "id", "type", "summary" }] }`.
- `get`, markdown: each entry's body with its title line rewritten to `# <title> (<id>)`; entries separated by a `---` line; required entries follow the entry that needs them, introduced by the line `Required by <id>:`; for a concern, a generated `## Variants` table with columns Id, Summary, Use when follows its body; last, a `## Sources` section with one line per source, `- <id>: <title> — <url>`.
- `get --json`: `{ "entries": [{ "id", "type", "summary", "requested": boolean, "markdown" }], "sources": [{ "id", "title", "url" }] }`.
- `lint`: the report from `lint()` as JSON, or `renderFindings` for text: one line per finding, `<severity> <path>[:<line>] <rule> <message>`, then a summary line.
- Errors go to stderr. Unknown id: `unknown id: <id>`, then a hint to run `list`. Entries that could not be loaded while running `list` or `get` produce one stderr line each, `skipped <path>: run lint`, and do not change the exit code.

- [ ] **Step 1: Write the failing tests**

A helper `run(...args)` calls `main` with capturing streams and returns `{ code, out, err }`.

```js
run('list', '--library', lib)            // code 0; out includes 'core/alpha — ' and '\n  core/alpha/one — '
run('list', 'core/alpha', '--json', '--library', lib)   // JSON with 3 entries
run('get', 'core/alpha/one', '--library', lib)
  // code 0; out includes '(core/alpha/one)', then 'Required by core/alpha/one:', then '(core/alpha/two)', then '## Sources', '- src-a: '
run('get', 'core/alpha', '--library', lib)              // out includes '## Variants' and both variant ids
run('get', 'core/nope', '--library', lib)               // code 2; err includes 'unknown id: core/nope'
run('get', '--library', lib)                            // code 2
run('lint', lib)                                        // code 0; JSON.parse(out).summary.errors === 0
run('lint', brokenLib)                                  // code 1
run('lint', brokenLib, '--format', 'text')              // code 1; out includes 'error' and the rule name
run('lint', lib, '--library', lib)                      // code 2
run('lint', '/no/such/dir')                             // code 2
run('spec')                                             // code 0; out starts with the first line of format.md
run('frobnicate')                                       // code 2
run('--help')                                           // code 0
run()                                                   // code 2
```

- **Review Focus 3:** with one entry replaced by text with no frontmatter, `run('list', ...)` exits `0`, lists the healthy entries, and writes `skipped core/alpha/two.md: run lint` to stderr.
- **Review Focus 2:** copy `skills/trodden` to a temp directory whose name contains a space, then spawn `node "<copy>/scripts/trodden.mjs" list` with the working directory set to the system temp root. It exits `0` and lists `core/logging`.
- `real library lints clean`: `run('lint')` with no library argument exits `0` and reports `errors: 0` and `warnings: 0`.

- [ ] **Step 2: Run** `node --test test/cli.test.mjs` — expected: fails, module not found.
- [ ] **Step 3: Implement `render.mjs` and `trodden.mjs`.**
- [ ] **Step 4: Run** `npm test` — expected: all pass.
- [ ] **Step 5: Write `.github/workflows/ci.yml`**

Runs on push and pull request, on Node 20 and 22: check out, set up Node, `npm test`, then `node skills/trodden/scripts/trodden.mjs lint --format text`.

- [ ] **Step 6: Commit** (`feat: add command line, output and CI`)

---

### Task 9: The skill and plugin packaging

**Files:**
- Create: `skills/trodden/SKILL.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Test: `test/skill.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/skill.test.mjs` asserts, for `skills/trodden/SKILL.md`:

- frontmatter parses with `parseYamlSubset`, `name` is `trodden`, and `description` is present and at most 1024 characters;
- the body is at most 300 words;
- every command named in the form `trodden.mjs <word>` is one of `list`, `get`, `lint`, `spec`;
- the body mentions both `list` and `get`.

- [ ] **Step 2: Run** `node --test test/skill.test.mjs` — expected: fails, file not found.

- [ ] **Step 3: Write `SKILL.md`**

Use the `superpowers:writing-skills` skill. The content is the four points in the spec's "The skill" section. Refer to the script by its path relative to the skill folder (`scripts/trodden.mjs`) and tell the agent to run it with `node` from the skill's own directory. Mention `spec` and `lint` in one line, for agents writing entries.

- [ ] **Step 4: Write the plugin manifests**

Check the current Claude Code plugin documentation first (the `claude-code-guide` agent or `https://code.claude.com/docs`); do not rely on memory for field names. The repo root is the plugin, named `trodden`, exposing `skills/trodden`. `marketplace.json` lists that one plugin so the repo can be added as a plugin source.

- [ ] **Step 5: Run** `npm test` — expected: all pass.
- [ ] **Step 6: Commit** (`feat: add skill and Claude Code plugin manifests`)

---

### Task 10: Error handling and retries entries

**Files:**
- Create: `skills/trodden/library/core/errors/_concern.md`, `skills/trodden/library/core/errors/retry-backoff.md`
- Modify: `skills/trodden/library/sources.yaml`, `skills/trodden/library/core/logging/_concern.md`

- [ ] **Step 1: Read the candidate sources**

Fetch and read each before citing it. Keep only those that are reachable and say what the rule claims:

- AWS Builders' Library, "Timeouts, retries, and backoff with jitter": `https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/`
- Google SRE Book, "Addressing Cascading Failures": `https://sre.google/sre-book/addressing-cascading-failures/`
- Azure Architecture Center, "Retry pattern": `https://learn.microsoft.com/en-us/azure/architecture/patterns/retry`

- [ ] **Step 2: Write the two entries**

Concern `core/errors`: handling failures of operations a system depends on. Variant `core/errors/retry-backoff`: retrying transient failures with bounded, backed-off, jittered attempts. Follow `format.md` and the editorial tests in `AGENTS.md`. Rules in your own words; no library or language names; pseudocode example.

- [ ] **Step 3: Update the logging concern**

Change `- see also: core/errors (planned)` to `- see also: core/errors`.

- [ ] **Step 4: Verify**

Run: `node skills/trodden/scripts/trodden.mjs lint --format text`
Expected: 0 errors, 0 warnings.

Run: `node skills/trodden/scripts/trodden.mjs get core/errors/retry-backoff`
Expected: the entry, then its sources with titles and URLs.

- [ ] **Step 5: Report the sourcing**

In the task report, give a table with one row per MUST: the rule, the source id, and the heading in the source that supports it. The reviewer spot-checks it.

- [ ] **Step 6: Commit** (`feat: add error handling concern and retry-backoff variant`)

---

### Task 11: Configuration entries and the OWASP licence check

**Files:**
- Create: `skills/trodden/library/core/config/_concern.md`, `skills/trodden/library/core/config/environment.md`
- Modify: `skills/trodden/library/sources.yaml`

- [ ] **Step 1: Read the candidate sources**

- The Twelve-Factor App, "III. Config": `https://12factor.net/config`
- OWASP Secrets Management Cheat Sheet: `https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html`

- [ ] **Step 2: Write the two entries**

Concern `core/config`: supplying the values that differ between deployments. Variant `core/config/environment`: configuration read from the environment, validated at startup, with secrets kept out of code and logs. Same standards as Task 10.

- [ ] **Step 3: Verify** with the same two commands as Task 10, using `core/config/environment`. Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Check the licence of the OWASP cheat sheets**

Read the licence stated in the OWASP Cheat Sheet Series repository. Then re-read every rule in the library that cites an OWASP source and confirm none reproduces its wording. Record the licence found and the result in the task report.

- [ ] **Step 5: Report the sourcing**, as in Task 10.
- [ ] **Step 6: Commit** (`feat: add configuration concern and environment variant`)

---

### Task 12: Eval runner

**Files:**
- Create: `evals/run.mjs`, `evals/lib/tasks.mjs`, `evals/lib/harness.mjs`, `evals/lib/claude-code.mjs`, `evals/lib/judge.mjs`, `evals/lib/score.mjs`
- Create: `evals/fixtures/orders-service/` (a few files), `evals/tasks/{add-logging,add-retry,add-config}/task.json`, `evals/README.md`
- Test: `evals/test/score.test.mjs`, `evals/test/judge.test.mjs`, `evals/test/run.test.mjs`
- Modify: `package.json` (test script now includes `evals/test/*.test.mjs`)

**Interfaces:**
- Consumes: `loadLibrary`, `resolve` from `skills/trodden/scripts/lib/library.mjs`.
- Produces:

```
// tasks.mjs
loadTasks(dir: string) → Task[]
Task = { id: string, prompt: string, fixture: string, variants: string[] }

// harness.mjs
Harness = { name: string, run({ task, model, withSkill }) → Promise<{ diff: string, events: object[] }> }
stubHarness(fn: ({ task, model, withSkill }) => { diff, events }) → Harness
detectScriptUse(events: object[]) → boolean

// claude-code.mjs
claudeCodeHarness({ skillDir, fixturesDir }) → Harness
claudeComplete(model: string, prompt: string) → Promise<string>

// judge.mjs
judge({ rules, diff, model, complete }) → Promise<Verdict[]>
Verdict = { variant: string, rule: string, verdict: 'pass'|'fail'|'n/a'|'error', reason: string }

// score.mjs
mustRules(lib, variantIds: string[]) → { variant: string, text: string }[]
summarise(cases: Case[]) → Summary
renderSummary(summary: Summary) → string
Case = { task, model, withSkill, usedScript, status: 'ok'|'no-change'|'harness-error', verdicts: Verdict[] }

// run.mjs
runEval({ tasks, models, judgeModel, harness, complete, lib, runs }) → Promise<{ cases: Case[], summary: Summary }>
```

Decisions:

- **Tasks.** Three, all against one fixture, `orders-service`: a small plain-Node HTTP service with no dependencies, which calls a flaky downstream function, reads hard-coded settings and prints with `console.log`. The prompts describe the need and never name trodden or the practice: for example, `add-logging` is "Add logging to this service so we can debug failed orders in production." Each `task.json` holds `id`, `prompt`, `fixture` and `variants` (`core/logging/structured`, `core/errors/retry-backoff`, `core/config/environment`).
- **Rules scored.** `mustRules` returns every `MUST` and `MUST NOT` of the task's variants and of the variants they require.
- **A case** is one task, one model, with or without the skill. Each is run `runs` times (default 1).
- **Judge.** One call per case. The prompt gives the diff and the numbered rules and asks for a JSON array of `{ index, verdict, reason }`. If the reply does not parse, call once more; if it still does not, every verdict for that case is `error`.
- **Adherence** is `pass / (pass + fail)`. `n/a` and `error` are excluded. It is `null` when nothing is applicable.
- **Summary** gives, per model and overall: adherence with the skill, adherence without, the difference, and the share of with-skill cases where `usedScript` is true.
- **`detectScriptUse`** is true when any event is an assistant tool call that runs a shell command containing `trodden.mjs`.
- **Real harness.** For each case: copy the fixture to a fresh temp directory and `git init` it; when `withSkill` is true, copy `skills/trodden` into the copy's `.claude/skills/trodden`; run Claude Code headless with the prompt and model, with streamed JSON output; return `git diff` and the parsed events. `claudeComplete` also goes through Claude Code headless, with no tools, so one credential serves both. Check the current Claude Code CLI documentation for the exact flags: headless mode, model, streamed JSON output, permission handling in a throwaway directory, and how to keep the user's own skills and plugins out of the run. Capture one real event stream and confirm `detectScriptUse` matches its shape.
- **CLI.** `node evals/run.mjs --models <a,b> --judge <model> [--tasks <id,...>] [--runs <n>] [--out <dir>]`. Output goes to `evals/results/<UTC timestamp>/` as `results.json` (cases, summary, model ids, judge, date, library commit) and `summary.md`.

- [ ] **Step 1: Write the failing tests**

```js
// score.test.mjs
mustRules(lib, ['core/alpha/one'])   // MUSTs of one and of two (required), no SHOULDs
summarise([...])                     // 3 pass, 1 fail, 1 n/a, 1 error → adherence 0.75
summarise([/* only n/a */])          // adherence null
// with-skill 0.75, without 0.25 → difference 0.5; usedScript share computed over with-skill cases only

// judge.test.mjs
judge({ rules, diff, model: 'm', complete: async () => '[{"index":1,"verdict":"pass","reason":"r"}]' })
  // → one Verdict, verdict 'pass'
// complete returns prose around a JSON array → still parsed
// complete returns 'no idea' twice → every verdict 'error'; complete called exactly twice

// run.test.mjs — stub harness and stub complete, no credentials
detectScriptUse([{ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'node x/trodden.mjs list' } }] } }])  // → true
detectScriptUse([])                  // → false
runEval(...)                         // 2 tasks × 1 model → 4 cases; each task has one withSkill true and one false
```

- **Review Focus 5:** a harness returning an empty diff gives a case with `status: 'no-change'`, no judge call, and every rule counted as `fail`; a harness that throws gives `status: 'harness-error'`, excluded from adherence; in both, `runEval` still completes the remaining cases.

- [ ] **Step 2: Run** `node --test evals/test/*.test.mjs` — expected: fails, modules not found.
- [ ] **Step 3: Implement the `evals/lib` modules and `runEval`,** then the fixture, the three tasks and the CLI.
- [ ] **Step 4: Run** `npm test` — expected: all pass.
- [ ] **Step 5: Write `evals/README.md`:** what the eval measures, how to run it, what it costs in model calls (tasks × models × 2 × runs agent sessions, plus one judge call per case), and how to read `summary.md`.
- [ ] **Step 6: Commit** (`feat: add eval runner`)

---

### Task 13: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md`**

Sections: what trodden is (the spec's Intent, including the tagline), how it works (skill, query script, library; three steps: index, fetch, apply), using it (install as a Claude Code plugin or copy `skills/trodden`; the four commands with one example each), the library (areas, concerns, variants; the four editorial tests; link to `format.md`), contributing an entry (link to `AGENTS.md`; run `lint`), measuring (link to `evals/README.md`), roadmap split into "First version" and "Later" as in the spec, and licences (MIT for code, CC BY 4.0 for entries).

Remove the old "Check" step, the overlay principle, the manifest section and the old layout.

- [ ] **Step 2: Verify**

Every command shown in the README runs as written and every relative link resolves.

- [ ] **Step 3: Commit** (`docs: rewrite README for the first version`)

---

### Task 14: Living documentation

**Files:**
- Create: `docs/domain-model.md`, `docs/architecture/README.md`, `docs/architecture/c4-context.md`, `docs/architecture/c4-containers.md`, `ARCHITECTURE.md`
- Modify: `CLAUDE.md`, `GLOSSARY.md` (only if a term changed during the build)

- [ ] **Step 1: Write `docs/domain-model.md`**

Use the `doc-mastery:domain-model` skill. Start from the spec's "Proposed domain model" and correct it to match what was built.

- [ ] **Step 2: Write the C4 files**

Use the `c4-architecture` skill. Start from the spec's two proposed diagrams and correct them to match what was built. Add `%% See docs/adr/0001-...` comments where an ADR shaped a diagram. `docs/architecture/README.md` indexes both diagrams, one line each.

- [ ] **Step 3: Write `ARCHITECTURE.md`**

A code map of `skills/trodden/scripts/` and `evals/` (one line per module), the invariants (all library reads go through `loadLibrary`; no dependencies; nothing under `skills/trodden/` reaches outside it or onto the network; the script knows no software-specific content), and links to `docs/architecture/`.

- [ ] **Step 4: Add update triggers to `CLAUDE.md`**

A short `## Living documentation` section: update `ARCHITECTURE.md` when a module is added, removed or changes responsibility; update `format.md` and `AGENTS.md` together when the entry format or a linter rule changes.

- [ ] **Step 5: Verify**

Each document matches the code as built. Both C4 diagrams pass the checklist at the end of the `c4-architecture` skill's `references/common-mistakes.md`. Every name in the diagrams and the domain model is spelled as in `GLOSSARY.md`.

- [ ] **Step 6: Commit** (`docs: add domain model, architecture diagrams and code map`)

---

### Task 15: The real eval run (needs Miguel's key)

This task waits on model access from Miguel. Every other task can finish without it.

**Files:**
- Create: `evals/results/<UTC timestamp>/results.json`, `evals/results/<UTC timestamp>/summary.md`, `evals/results/README.md`

- [ ] **Step 1: Confirm access and models with Miguel**

Two Claude models of different sizes as the models under test, and a stronger one as judge. Ask Miguel which, and how the credential is supplied. Do not put a key in any file.

- [ ] **Step 2: Run one task on one model first**

Run: `node evals/run.mjs --models <smaller model> --judge <judge> --tasks add-logging`
Expected: two cases, both with status `ok`, and a `summary.md`. Read both diffs and the judge's reasons by hand and confirm the verdicts are sensible before spending more.

- [ ] **Step 3: Run the full set**

Run: `node evals/run.mjs --models <a,b> --judge <judge>`
Expected: 12 cases.

- [ ] **Step 4: Write `evals/results/README.md`**

What was run and when, the headline numbers, and what they say about the two questions: does the agent consult the library, and does its output then follow the rules.

- [ ] **Step 5: Commit** (`docs: add first eval results`)

- [ ] **Step 6: Report to Miguel and stop**

If adherence with the skill is not higher than without, or the agent rarely calls the script, say so plainly. Revising the format or `SKILL.md` is a new decision for Miguel, not part of this plan.

## Rulings and deferred minors

Recorded during execution of Tasks 1 to 14 (2026-11-16 and 17). Task 15 has not been run.

### Rulings

- Task 7: Ruling: one mistake yields one finding — a file with unreadable frontmatter gets only `frontmatter` (no id-path), a misplaced .md gets only `id-path`, a missing registry gets one `unknown-source` on sources.yaml (none per entry), and a relationship target 'exists' if its file exists even when that file is itself broken — avoids cascades that bury the real cause — cost if wrong: a second real problem in the same file shows only after the first is fixed.
- Task 7: Ruling: findings tie-break by the rules' spec order, not alphabetically ('then rule' in the plan) — keeps errors ahead of info on the same line — cost if wrong: none beyond ordering.
- Task 9: Ruling: wrote SKILL.md without loading superpowers:writing-skills or running subagent pressure tests (plan step 3 names that skill) — the eval in Task 15 is the behavioural test of this skill, and its guidance (description says when to use, body short) is applied and test-checked — cost if wrong: the skill triggers less reliably than it could; the eval will show it.
- Task 9: Ruling: SKILL.md refers to the script as scripts/trodden.mjs 'in this skill's directory' rather than Claude Code's ${CLAUDE_SKILL_DIR} — that variable is only substituted by Claude Code and the skill must work in any harness — cost if wrong: an agent whose harness does not state the skill directory may need one extra step to find the script.
- Task 10: Ruling: corrected two rules in core/logging/structured while reading sources — "JSON, one event per line [otel-semconv]" became "structured, machine-parseable format [owasp-logging]" plus an uncited SHOULD for JSON lines; "timestamp, severity and trace id on every event [otel-semconv]" became a MUST for when/where/who/what [owasp-logging] plus a SHOULD for severity and a request identifier — the OpenTelemetry pages do not state either requirement (they mark those fields optional), and I had flagged this to Miguel at the Task 3 review — cost if wrong: the logging entry is slightly weaker than Miguel's original wording; revert is a two-line edit.
- Task 10: Ruling: the entry-parser test read the live logging entry, so editing library content broke it; it now reads a frozen copy in test/fixtures/structured-entry.md — tests of the parser should not depend on library content — cost if wrong: none.
- Task 12: Ruling: the real harness takes an injectable `runAgent` so workspace set-up and diff collection are tested without credentials (plan interface was claudeCodeHarness({ skillDir, fixturesDir })) — cost if wrong: none; default behaviour is unchanged.
- Task 12: Ruling: Summary shape is { overall, models, rows } where rows are per task and model, and only `overall` carries harnessErrors — the plan named Summary without defining it — cost if wrong: results.json consumers adapt to field names.
- Task 12: Ruling: the agent run allows the tools Bash, Read, Edit, Write, Glob, Grep, Skill under acceptEdits, with --setting-sources project and --strict-mcp-config — verified with one real small call: the trodden skill was visible, no user plugins or MCP servers loaded, detectScriptUse matched the real event shape, and the judge call returned text — cost if wrong: the with/without comparison is contaminated by the runner's own environment.
- Task 14: Ruling: the as-built diagrams differ from the spec's proposals — the eval reaches models only through the coding agent's command line (no direct "Model providers" link), a Maintainer person starts eval runs, and the domain model shows Concern→Variant as 0..* and `see also` between any entries — they describe what was built — cost if wrong: none; docs follow code.
- Final: Ruling: reversed the Task 9 ruling — SKILL.md now writes commands with ${CLAUDE_SKILL_DIR} and explains the variable in one sentence — Claude Code substitutes the real path, and any other agent can read the sentence; a bare relative path fails from the project directory — cost if wrong: an agent in another harness has to substitute the path itself.
- Final: Ruling: core/config/environment — narrowed "MUST read those values from environment variables" to values that are not secrets, made the secret-store SHOULD say to fall back to the environment where no store exists, and removed two SHOULDs (least privilege and rotation: not checkable in a code change; "could be made public": restates the hard-coding MUST NOT) — the two sources disagree on secrets and a MUST must not contradict a SHOULD in the same entry — cost if wrong: Miguel may prefer a separate secret-store variant, which the spec's "variants, not winners" principle would favour once someone writes it.
- Final: Ruling: reviewer's "Declined to judge" items — source support for rules (checked by the executor against fetched pages in Tasks 10–11; stands), eval isolation flags (verified by one real call in Task 12; stands), plugin install in Claude Code (validated with `claude plugin validate`, not installed; stands, unverified end to end), CC BY 4.0 entries citing CC BY-SA OWASP pages (rules are in our own words; legal question left to Miguel), sources.yaml being a directory, `__proto__` as a key, inline triple-backtick lines, Windows, global git config, eval design scope — none becomes a finding — cost if wrong: a first Windows user or an unusual git setup hits an untested path.

### Deferred minors

- a value that starts with [ and ends with ] always parses as a list, so a summary like "[Draft] x [v2]" is misread and reported as missing
- quote handling is thin — inner quotes, quoted commas in lists, single quotes and trailing # comments are taken literally
- a UTF-8 byte-order mark at the start of sources.yaml is reported as "unexpected indentation"
- an unclosed code fence is reported only as missing sections
- a leftover "(planned)" on a target that now exists is info, though get then does not expand that requires
- empty sections and concerns with no variants are not linted; format.md says a concern has one or more variants, the domain model says nothing enforces it
- unknown-source findings always point at line 1
- a scalar registry entry shows as "(not in the source registry)" in get
- an unexpected exception exits 1, the code documented for lint errors
- --json on lint and --format on list are silently ignored; --format=text is rejected; "list core/" with a trailing slash is an unknown id
- an empty entry file yields one frontmatter finding plus six section-order findings
- logging/structured — "where" and "who" in the when/where/who/what MUST are loosely checkable; a SHOULD names OpenTelemetry; the concern's Out of scope points at an "observability" concern that does not exist
- eval temp directories are never removed
