# The trodden entry format

This is the definition of the format. Every library that works with the trodden query script follows it, and `trodden.mjs lint` checks it.

## Library layout

```text
<library>/
  sources.yaml                        the source registry
  <area>/
    <concern>/
      _concern.md                     the concern
      <variant>.md                    one file per variant
```

- A library has one or more areas. An area has one or more concerns. A concern has one or more variants.
- Files that do not end in `.md`, and files whose name starts with a dot, are ignored.
- An `.md` file anywhere else in the library is an error.

## Ids

An entry's id is its path inside the library, without the file extension:

| File | Id |
|---|---|
| `core/logging/_concern.md` | `core/logging` |
| `core/logging/structured.md` | `core/logging/structured` |

Ids are always written in full, including in relationships.

## Frontmatter

Every entry starts with frontmatter between two `---` lines. It uses a small subset of YAML:

- `key: value`, where the value is one line of text, optionally wrapped in double quotes.
- `key: [a, b]`, a list on one line.
- Blank lines and full-line `#` comments are allowed. Nothing else is.

| Field | Concern | Variant |
|---|---|---|
| `type` | `concern` | `variant` |
| `id` | required | required |
| `summary` | required, one line | required, one line |
| `sources` | optional | required if any rule cites a source |

The `summary` is what an agent sees in the index, so it says what the entry is about in one plain sentence.

Directly after the frontmatter comes the title: exactly one `#` heading.

## Concern entries

A concern names a topic and the forces at play. It has these `##` sections, in this order, and no others:

1. **Forces** (required): the pressures any approach has to balance.
2. **Out of scope** (optional): what belongs to another concern.
3. **Related** (optional): relationships to other entries.

A concern does not list its variants. The query script generates that table from the variants themselves.

## Variant entries

A variant is one established way of addressing a concern. It has exactly these `##` sections, in this order:

1. **Use when**: the conditions under which this variant applies.
2. **Rules**: what to do, as a list of rules.
3. **Example**: a short illustration in pseudocode.
4. **Avoid**: common mistakes.
5. **Related**: relationships to other entries. If there are none, the section holds the single line `None.`

A variant should fit in about 400 words. Split it instead of growing it.

Variants are language-neutral. A code fence has no language, or is marked `text` or `pseudocode`.

## Rules

Every list item in the Rules section starts with one of four keywords:

| Keyword | Meaning |
|---|---|
| `MUST`, `MUST NOT` | A requirement. It cites at least one source. |
| `SHOULD`, `SHOULD NOT` | A strong recommendation, followed unless there is a good reason not to. A source is optional. |

Sources are cited by id, in square brackets at the end of the rule: `[owasp-logging]`, or `[owasp-logging, otel-semconv]` for more than one. Every id cited in a rule is also listed in the entry's `sources` field.

A rule is written in the library's own words. It never copies the text of its source.

## Relationships

The Related section is a list with one relationship per item:

```text
- requires: core/tracing/correlation-ids
- alternative: core/logging/audit-trail (planned)
```

| Keyword | Meaning | Allowed between |
|---|---|---|
| `requires` | This variant only works together with the other. The query script returns the other with it. | variant → variant |
| `refines` | This variant adds to or tightens the other. | variant → variant |
| `conflicts-with` | The two must not be used together. | variant → variant |
| `alternative` | The other addresses the same need a different way. | variant → variant |
| `see also` | Worth reading alongside. | any entry → any entry |

- A concern may only declare `see also`.
- A relationship to an entry that is not written yet ends with ` (planned)`. The linter reports it as information, not as an error.
- `requires` relationships must not form a loop.

## Source registry

`sources.yaml`, at the root of the library, lists every source the library cites. It uses the frontmatter subset with one level of nesting:

```text
owasp-logging:
  title: OWASP Logging Cheat Sheet
  url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
```

Each source has a `title` and a `url`.

## Linter rules

`trodden.mjs lint` reports findings as JSON (or as text with `--format text`). It exits with code 1 only when there is at least one error.

| Rule | Severity | Checks |
|---|---|---|
| `frontmatter` | error | Required fields are present and valid for the entry's type |
| `id-path` | error | The id matches the file's path; no two entries share an id |
| `section-order` | error | Required sections are present, in order, with no duplicates |
| `uncited-must` | error | Every MUST cites at least one source |
| `unknown-source` | error | Every source id exists in the source registry |
| `broken-ref` | error | Every relationship target exists, unless marked planned, and is of a type that relationship allows |
| `requires-cycle` | error | `requires` relationships do not form a loop |
| `length` | warning | A variant's body is over 400 words |
| `language-specific` | warning | A code fence declares a programming language |
| `planned-ref` | info | A relationship points to a planned entry |
| `orphaned-source` | info | A source in the registry is cited nowhere |

The linter checks form only. Whether a practice deserves an entry is an editorial decision.

## Complete example

````text
---
type: variant
id: core/logging/structured
summary: Emit logs as machine-parseable events with consistent fields.
sources: [owasp-logging]
---
# Structured logging

## Use when

Services whose logs are aggregated and queried.

## Rules

- MUST NOT log secrets, session tokens, passwords or personal data; mask or omit them. [owasp-logging]
- MUST record on every event when it happened, where, who was involved and what happened. [owasp-logging]
- SHOULD log an error once, where it is handled, not at every layer it passes through.

## Example

```
logger.info("order.created", { order_id: id, amount: total })
```

## Avoid

- Logging full request or response bodies by default

## Related

- requires: core/tracing/correlation-ids (planned)
````
