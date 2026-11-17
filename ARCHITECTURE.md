# Architecture

trodden is a library of sourced engineering practices, a script that queries it, and a skill that tells a coding agent to use the script. This file is a map of the code. For who uses the system and how its parts connect, see the diagrams in [`docs/architecture/`](docs/architecture/README.md). For the concepts, see [`docs/domain-model.md`](docs/domain-model.md) and [`GLOSSARY.md`](GLOSSARY.md).

## Code map

### `skills/trodden/` — what an agent installs

| Path | Responsibility |
|---|---|
| `SKILL.md` | When to consult the library and what to do with the result |
| `references/format.md` | The definition of the entry format and the linter rules |
| `library/` | The entries and `sources.yaml`, the source registry |
| `scripts/trodden.mjs` | Command line: arguments, dispatch, exit codes |
| `scripts/lib/yaml.mjs` | Parser for the small YAML subset the format allows |
| `scripts/lib/entry.mjs` | Parses one entry: frontmatter, sections, rules, relationships |
| `scripts/lib/library.mjs` | Loads a library from disk; the index; resolving what an entry requires |
| `scripts/lib/lint.mjs` | The linter rules and the report |
| `scripts/lib/render.mjs` | Markdown and text output |

### `evals/` — measuring whether the skill helps

| Path | Responsibility |
|---|---|
| `run.mjs` | Command line and the loop over tasks, models and with/without the skill |
| `lib/tasks.mjs` | Loads task definitions |
| `lib/harness.mjs` | What a harness is; detecting that the agent called the query script |
| `lib/claude-code.mjs` | The Claude Code harness and the judge call |
| `lib/judge.mjs` | The judge prompt and reading its reply |
| `lib/score.mjs` | Which rules a task is scored against; adherence numbers |
| `tasks/`, `fixtures/` | The tasks and the small project they run against |

### `test/` and `evals/test/`

Tests for the two trees above. `test/helpers.mjs` builds throwaway libraries.

## Invariants

- **One way in.** Every read of a library goes through `loadLibrary` in `library.mjs`. This is where a manifest filter would later apply.
- **No dependencies, no build.** `package.json` lists none. The script runs on Node 20 or later as it is.
- **Self-contained skill.** Nothing under `skills/trodden/` imports from outside it or touches the network. `evals/` may import from the skill; never the reverse.
- **No knowledge of the content.** The script knows areas, concerns, variants, rules and sources. It names no concern, practice or programming language.
- **Parsing never throws.** `parseEntry` records problems for the linter. A broken entry is skipped by `list` and `get`, never fatal.
- **One mistake, one finding.** The linter reports the cause and avoids findings that only follow from it.
- **Exit codes.** `0` success, `1` lint errors, `2` bad usage or unknown id.

## Cross-cutting concerns

- **The format has one definition,** `references/format.md`. A test checks that it names every linter rule. `AGENTS.md` summarises it.
- **Output for agents** is markdown by default, with `--json` for programs. The linter is JSON by default.
- **The eval needs credentials and is run by hand.** Its tests use stand-ins and need none.
