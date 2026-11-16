import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEntry } from "../skills/trodden/scripts/lib/entry.mjs";

const structured = readFileSync(
  new URL("./fixtures/structured-entry.md", import.meta.url),
  "utf8",
);

const variant = (rules, related = "None.", example = "```\nx\n```") =>
  `---\ntype: variant\nid: a/b/c\nsummary: S\n---\n# T\n\n## Use when\n\nW.\n\n## Rules\n\n${rules}\n\n## Example\n\n${example}\n\n## Avoid\n\n- Y\n\n## Related\n\n${related}\n`;

test("parses the structured logging entry", () => {
  const e = parseEntry(structured);
  assert.equal(e.frontmatterError, null);
  assert.equal(e.frontmatter.id, "core/logging/structured");
  assert.equal(e.title, "Structured logging");
  assert.equal(e.titleCount, 1);
  assert.deepEqual(
    e.sections.map((s) => s.heading),
    ["Use when", "Rules", "Example", "Avoid", "Related"],
  );
  assert.equal(e.rules.length, 7);
  assert.equal(e.rules[0].level, "MUST");
  assert.deepEqual(e.rules[0].sources, ["otel-semconv"]);
  assert.equal(e.rules[2].level, "MUST NOT");
  assert.equal(e.rules[5].level, "SHOULD");
  assert.deepEqual(e.rules[5].sources, []);
  assert.deepEqual(
    { ...e.relationships[0], line: 0, raw: "" },
    { kind: "requires", target: "core/tracing/correlation-ids", planned: true, line: 0, raw: "" },
  );
  assert.equal(e.fences.length, 1);
  assert.equal(e.fences[0].lang, "");
});

test("reports line numbers within the whole file", () => {
  const e = parseEntry(structured);
  const lines = structured.split("\n");
  assert.equal(lines[e.sections[1].line - 1], "## Rules");
  assert.ok(lines[e.rules[0].line - 1].startsWith("- MUST emit"));
  assert.ok(lines[e.relationships[0].line - 1].startsWith("- requires:"));
  assert.equal(lines[e.fences[0].line - 1], "```");
});

test("reads several sources from one rule", () => {
  const e = parseEntry(variant("- MUST do A. [a, b]"));
  assert.deepEqual(e.rules[0].sources, ["a", "b"]);
  assert.equal(e.rules[0].text, "MUST do A. [a, b]");
});

test("recognises SHOULD NOT", () => {
  assert.equal(parseEntry(variant("- SHOULD NOT do A.")).rules[0].level, "SHOULD NOT");
});

test("marks a rule with no keyword", () => {
  assert.equal(parseEntry(variant("- Do A.")).rules[0].level, null);
});

test("does not treat a keyword prefix as a keyword", () => {
  assert.equal(parseEntry(variant("- MUSTARD is fine.")).rules[0].level, null);
});

test("parses relationship keywords", () => {
  const e = parseEntry(variant("- MUST a. [a]", "- see also: core/x\n- depends: core/x\n- nonsense"));
  assert.equal(e.relationships[0].kind, "see also");
  assert.equal(e.relationships[0].target, "core/x");
  assert.equal(e.relationships[0].planned, false);
  assert.equal(e.relationships[1].kind, "depends");
  assert.equal(e.relationships[2].kind, null);
  assert.equal(e.relationships[2].target, null);
  assert.equal(e.relationships[2].raw, "nonsense");
});

test("has no relationships when Related says None", () => {
  assert.deepEqual(parseEntry(variant("- MUST a. [a]")).relationships, []);
});

test("still parses sections when frontmatter is missing", () => {
  const e = parseEntry("# T\n\n## Forces\n\n- F\n");
  assert.equal(e.frontmatter, null);
  assert.ok(e.frontmatterError);
  assert.equal(e.title, "T");
  assert.deepEqual(e.sections.map((s) => s.heading), ["Forces"]);
});

test("reports unparseable frontmatter", () => {
  const e = parseEntry("---\nnot yaml\n---\n# T\n");
  assert.equal(e.frontmatter, null);
  assert.match(e.frontmatterError, /line 2/);
});

test("counts titles", () => {
  assert.equal(parseEntry("---\nid: x\n---\n# A\n\n# B\n").titleCount, 2);
});

test("gives the same result for CRLF line endings", () => {
  assert.deepEqual(parseEntry(structured.replace(/\n/g, "\r\n")), {
    ...parseEntry(structured),
    body: parseEntry(structured.replace(/\n/g, "\r\n")).body,
  });
});

test("ignores headings and rule-like lines inside a code fence", () => {
  const e = parseEntry(
    variant("- MUST a. [a]", "None.", "```\n## Not a section\n- MUST not be a rule\n# Not a title\n```"),
  );
  assert.deepEqual(
    e.sections.map((s) => s.heading),
    ["Use when", "Rules", "Example", "Avoid", "Related"],
  );
  assert.equal(e.rules.length, 1);
  assert.equal(e.titleCount, 1);
});

test("records the language of a code fence", () => {
  const e = parseEntry(variant("- MUST a. [a]", "None.", "```js\nx\n```"));
  assert.deepEqual(e.fences.map((f) => f.lang), ["js"]);
});

test("counts the words of the body, not the frontmatter", () => {
  assert.equal(parseEntry("---\nid: x\nsummary: one two three\n---\n# A title\n\nfour words right here\n").wordCount, 7);
});
