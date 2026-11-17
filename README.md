# trodden

**A sourced library of cross-cutting software engineering practices, and a skill that grounds coding agents in it.**

> ESLint for architecture decisions, readable by any coding agent.

Ask five coding agents to "add logging" and you get five different answers. The established practice exists (OWASP, OpenTelemetry, The Twelve-Factor App), but it is not in the agent's context when it writes code. trodden puts it there, so that whatever the model or harness, the agent's output follows the same sourced rules.

## How it works

trodden is three things in one folder, [`skills/trodden/`](skills/trodden/):

- **A library** of small markdown entries. Each states a practice as rules, and every requirement cites a reputable source.
- **A query script** that lists and fetches entries, so the agent gets exactly the right ones without browsing files.
- **A skill** that tells the agent when to look something up and what to do with the answer.

The agent works in three steps:

1. **Index:** it lists what the library covers, one line per entry.
2. **Fetch:** it fetches the entries that apply to the task, with whatever they require and the sources behind them.
3. **Apply:** it follows the rules, using the language and libraries the project already has.

Nothing is hosted and nothing is fetched over the network. The script is plain Node (version 20 or later) with no dependencies.

## Using it

**Claude Code**, version 2.1.275 or later:

```
/plugin install trodden --marketplace mcoquet/trodden
```

**Any other agent that supports skills:** copy the `skills/trodden/` folder into the place your agent reads skills from. The folder is self-contained.

The commands, run from the skill folder:

```
node scripts/trodden.mjs list                           # the index
node scripts/trodden.mjs get core/logging               # a concern and its variants
node scripts/trodden.mjs get core/logging/structured    # a variant, its rules and sources
node scripts/trodden.mjs lint --format text             # check a library against the format
node scripts/trodden.mjs spec                           # print the entry format
```

Add `--library <path>` to any of them to use a library of your own.

## The library

- An **area** is a top-level group. `core` holds generic, cross-cutting practice.
- A **concern** is a topic every project has to deal with, such as logging. It states the forces at play.
- A **variant** is one established way of addressing a concern: when it applies, and the rules for doing it well.

A rule is a `MUST` (a requirement, with a cited source) or a `SHOULD` (a strong recommendation). Entries name no language or library.

The first version covers:

| Concern | Variant |
|---|---|
| `core/logging` | `core/logging/structured` |
| `core/errors` | `core/errors/retry-backoff` |
| `core/config` | `core/config/environment` |

An entry belongs in the library only if it is **cross-cutting** (not framework documentation), **sourced**, **actionable** (rules an agent can follow and a reviewer can check) and **established**. Where reputable sources support different approaches, each is its own variant; the project chooses.

The format is defined in [`skills/trodden/references/format.md`](skills/trodden/references/format.md). The same format and script work for a private library, on any subject.

## Contributing an entry

Read [`AGENTS.md`](AGENTS.md), write the entry, and run the linter:

```
node skills/trodden/scripts/trodden.mjs lint --format text
```

The linter checks form: sections, citations, references. Whether a practice deserves an entry is an editorial decision.

## Does it work?

[`evals/`](evals/README.md) holds a small eval that runs tasks with and without the skill and has a judge model score the result against the entries' `MUST` rules. No results are published yet.

## Roadmap

**First version**

- [x] Entry format and linter
- [x] Query script: `list`, `get`, `lint`, `spec`
- [x] The skill, packaged as a Claude Code plugin
- [x] Seed concerns: logging, error handling and retries, configuration
- [x] Eval runner
- [ ] First eval results

**Later**, in rough order of when each becomes useful:

- A manifest in the consuming project that narrows the library and records the variants it chose
- Packs, and copying a selection into a repo, pinned and diffable against upstream
- Language overlays, only if evals show agents need the library pinned per language
- Other ways in: an npm package, an MCP server, a docs site and `llms.txt`
- Evals as a gate on new entries, per-model previews and a leaderboard
- More areas (web APIs, regulated domains) and private libraries queried together

Material parked from earlier notes is in [`docs/ideas/`](docs/ideas/README.md). The design is in [`docs/superpowers/specs/`](docs/superpowers/specs/2026-11-16-trodden-first-version-design.md).

## Development

```
npm test
```

There is nothing to install. See [`CLAUDE.md`](CLAUDE.md) for the other commands.

## Licence

The script and tooling are under the [MIT licence](LICENSE). The library entries in `skills/trodden/library/` are under [CC BY 4.0](skills/trodden/library/LICENSE).
