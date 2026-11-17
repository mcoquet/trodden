import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadLibrary } from "../skills/trodden/scripts/lib/library.mjs";
import { parseEntry } from "../skills/trodden/scripts/lib/entry.mjs";
import { lint, RULES } from "../skills/trodden/scripts/lib/lint.mjs";
import { makeLibrary, validFiles, variantText, concernText } from "./helpers.mjs";

const run = (files) => lint(loadLibrary(makeLibrary(files)));
const one = (overrides) => variantText({ id: "core/alpha/one", related: ["requires: core/alpha/two"], ...overrides });
const withOne = (overrides) => ({ ...validFiles(), "core/alpha/one.md": one(overrides) });

// Asserts the findings for `rule` and that no other rule reports an error.
function expectRule(files, rule, expected) {
  const { findings } = run(files);
  const others = findings.filter((f) => f.rule !== rule && f.severity === "error");
  assert.deepEqual(others, [], "no other rule should report an error");
  const mine = findings.filter((f) => f.rule === rule);
  assert.deepEqual(
    mine.map((f) => ({ severity: f.severity, path: f.path })),
    expected.map((path) => ({ severity: RULES.find((r) => r.name === rule).severity, path })),
  );
  for (const finding of mine) assert.ok(finding.message.length > 0);
  return mine;
}

test("valid library has no findings", () => {
  assert.deepEqual(run(validFiles()), { findings: [], summary: { errors: 0, warnings: 0, info: 0 } });
});

test("RULES matches the spec", () => {
  assert.deepEqual(
    RULES.map((r) => [r.name, r.severity]),
    [
      ["frontmatter", "error"],
      ["id-path", "error"],
      ["section-order", "error"],
      ["uncited-must", "error"],
      ["unknown-source", "error"],
      ["broken-ref", "error"],
      ["requires-cycle", "error"],
      ["length", "warning"],
      ["language-specific", "warning"],
      ["planned-ref", "info"],
      ["orphaned-source", "info"],
    ],
  );
  for (const rule of RULES) assert.ok(rule.description.length > 0);
});

test("format.md lists every rule", () => {
  const format = readFileSync(new URL("../skills/trodden/references/format.md", import.meta.url), "utf8");
  for (const rule of RULES) assert.ok(format.includes(`\`${rule.name}\``), rule.name);
});

test("summary counts findings by severity", () => {
  const files = withOne({ rules: ["MUST do A."], example: "```js\nx\n```", related: ["requires: core/alpha/two", "see also: core/alpha/later (planned)"] });
  assert.deepEqual(run(files).summary, { errors: 1, warnings: 1, info: 1 });
});

test("findings are sorted by path, then line, then rule", () => {
  const files = withOne({ rules: ["MUST do A.", "Do B."] });
  files["core/alpha/two.md"] = variantText({ id: "core/alpha/two", sources: ["src-b"], rules: ["MUST do B."] });
  assert.deepEqual(
    run(files).findings.map((f) => [f.path, f.rule]),
    [
      ["core/alpha/one.md", "uncited-must"],
      ["core/alpha/one.md", "section-order"],
      ["core/alpha/two.md", "uncited-must"],
    ],
  );
});

// frontmatter
test("frontmatter: missing frontmatter", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = files["core/alpha/two.md"].replace(/^---[\s\S]*?---\n/, "");
  const [finding] = expectRule(files, "frontmatter", ["core/alpha/two.md"]);
  assert.equal(finding.line, 1);
});
test("frontmatter: unparseable", () => {
  expectRule({ ...validFiles(), "core/alpha/two.md": validFiles()["core/alpha/two.md"].replace("type: variant", "type variant") }, "frontmatter", ["core/alpha/two.md"]);
});
test("frontmatter: missing id", () => {
  expectRule({ ...validFiles(), "core/alpha/one.md": one().replace("id: core/alpha/one\n", "") }, "frontmatter", ["core/alpha/one.md"]);
});
test("frontmatter: missing summary", () => {
  expectRule({ ...validFiles(), "core/alpha/one.md": one().replace(/summary: .*\n/, "") }, "frontmatter", ["core/alpha/one.md"]);
});
test("frontmatter: unknown type", () => {
  expectRule({ ...validFiles(), "core/alpha/one.md": one().replace("type: variant", "type: pattern") }, "frontmatter", ["core/alpha/one.md"]);
});
test("frontmatter: type does not match the file name", () => {
  expectRule({ ...validFiles(), "core/alpha/one.md": one().replace("type: variant", "type: concern") }, "frontmatter", ["core/alpha/one.md"]);
});
test("frontmatter: sources is not a list", () => {
  expectRule({ ...validFiles(), "core/alpha/one.md": one().replace("sources: [src-a]", "sources: src-a") }, "frontmatter", ["core/alpha/one.md"]);
});
test("frontmatter: a cited source is not listed in sources", () => {
  expectRule(withOne({ sources: [], rules: ["MUST do A. [src-a]"] }), "frontmatter", ["core/alpha/one.md"]);
});

// id-path
test("id-path: id differs from the path", () => {
  const files = validFiles();
  files["core/alpha/three.md"] = variantText({ id: "core/alpha/tres" });
  expectRule(files, "id-path", ["core/alpha/three.md"]);
});
test("id-path: two files share an id", () => {
  const files = validFiles();
  files["core/alpha/three.md"] = variantText({ id: "core/alpha/two" });
  const [finding] = expectRule(files, "id-path", ["core/alpha/three.md"]);
  assert.match(finding.message, /core\/alpha\/two\.md/);
});
test("id-path: a markdown file where no entry belongs", () => {
  expectRule({ ...validFiles(), "core/README.md": "# Read me\n" }, "id-path", ["core/README.md"]);
});
test("id-path: a variant whose folder has no concern", () => {
  const files = validFiles();
  files["core/beta/x.md"] = variantText({ id: "core/beta/x" });
  expectRule(files, "id-path", ["core/beta/x.md"]);
});

// section-order
const sectionCase = (name, change, path = "core/alpha/one.md") =>
  test(`section-order: ${name}`, () => {
    const files = validFiles();
    files[path] = change(files[path]);
    expectRule(files, "section-order", [path]);
  });
sectionCase("no title", (t) => t.replace("# One\n", ""));
sectionCase("two titles", (t) => t.replace("# One\n", "# One\n\n# Uno\n"));
sectionCase("a required section is missing", (t) => t.replace("## Avoid\n\n- Doing Y\n\n", ""));
sectionCase("sections out of order", (t) =>
  t.replace("## Avoid\n\n- Doing Y\n\n", "").replace("## Example", "## Avoid\n\n- Doing Y\n\n## Example"),
);
sectionCase("a duplicate section", (t) => t.replace("## Avoid", "## Avoid\n\n- Doing Z\n\n## Avoid"));
sectionCase("an unknown section", (t) => t.replace("## Avoid", "## Notes\n\nN.\n\n## Avoid"));
sectionCase("Rules has no items", (t) => t.replace("- MUST do A. [src-a]", "Just prose."));
sectionCase("a rule starts with no keyword", (t) => t.replace("- MUST do A. [src-a]", "- MUST do A. [src-a]\n- Do B."));
sectionCase("a concern without Forces", (t) => t.replace("## Forces", "## Out of scope"), "core/alpha/_concern.md");
sectionCase("a concern with an unknown section", (t) => `${t}\n## Variants\n\nV.\n`, "core/alpha/_concern.md");
sectionCase(
  "a concern with Related before Out of scope",
  (t) => `${t}\n## Related\n\n- see also: core/alpha/one\n\n## Out of scope\n\nO.\n`,
  "core/alpha/_concern.md",
);

test("section-order: a concern may have Out of scope and Related", () => {
  const files = validFiles();
  files["core/alpha/_concern.md"] = concernText({ id: "core/alpha", outOfScope: "O.", related: ["see also: core/alpha/one"] });
  assert.deepEqual(run(files).findings, []);
});

// uncited-must
test("uncited-must: a MUST with no source", () => {
  const [finding] = expectRule(withOne({ rules: ["MUST do A."] }), "uncited-must", ["core/alpha/one.md"]);
  assert.equal(parseEntry(withOne({ rules: ["MUST do A."] })["core/alpha/one.md"]).rules[0].line, finding.line);
});
test("uncited-must: a MUST NOT with no source", () => {
  expectRule(withOne({ rules: ["MUST NOT do A."] }), "uncited-must", ["core/alpha/one.md"]);
});
test("uncited-must: a SHOULD needs no source", () => {
  assert.deepEqual(run(withOne({ rules: ["MUST do A. [src-a]", "SHOULD do B.", "SHOULD NOT do C."] })).findings, []);
});

// unknown-source
test("unknown-source: listed in sources but not in the registry", () => {
  expectRule(withOne({ sources: ["src-a", "nope"] }), "unknown-source", ["core/alpha/one.md"]);
});
test("unknown-source: cited in a rule but not in the registry, reported once", () => {
  expectRule(withOne({ sources: ["nope"], rules: ["MUST do A. [nope]"] }), "unknown-source", ["core/alpha/one.md"]);
});
test("unknown-source: the registry is missing, reported once", () => {
  expectRule({ ...validFiles(), "sources.yaml": null }, "unknown-source", ["sources.yaml"]);
});
test("unknown-source: the registry cannot be parsed", () => {
  expectRule({ ...validFiles(), "sources.yaml": "not yaml" }, "unknown-source", ["sources.yaml"]);
});
test("unknown-source: a registry entry has no url", () => {
  const sources = "src-a:\n  title: A\n\nsrc-b:\n  title: B\n  url: https://example.com/b\n";
  expectRule({ ...validFiles(), "sources.yaml": sources }, "unknown-source", ["sources.yaml"]);
});

// broken-ref
const refCase = (name, related, extra = {}) =>
  test(`broken-ref: ${name}`, () => {
    expectRule({ ...withOne({ related: ["requires: core/alpha/two", ...related] }), ...extra }, "broken-ref", ["core/alpha/one.md"]);
  });
refCase("an item that is not a relationship", ["nonsense"]);
refCase("an unknown keyword", ["depends: core/alpha/two"]);
refCase("a target that does not exist", ["alternative: core/alpha/nope"]);
refCase("a see also target that does not exist", ["see also: core/nope"]);
refCase("a target that is the entry itself", ["see also: core/alpha/one"]);
refCase("requires pointing at a concern", ["requires: core/alpha"]);
refCase("alternative pointing at a concern", ["alternative: core/alpha"]);

test("broken-ref: a concern declaring anything but see also", () => {
  const files = validFiles();
  files["core/alpha/_concern.md"] = concernText({ id: "core/alpha", related: ["requires: core/alpha/one"] });
  expectRule(files, "broken-ref", ["core/alpha/_concern.md"]);
});
test("broken-ref: see also may point anywhere that exists", () => {
  const files = withOne({ related: ["requires: core/alpha/two", "see also: core/alpha", "refines: core/alpha/two"] });
  assert.deepEqual(run(files).findings, []);
});
test("broken-ref: a target whose own file is broken still exists", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = files["core/alpha/two.md"].replace("type: variant", "type variant");
  assert.deepEqual(run(files).findings.filter((f) => f.rule === "broken-ref"), []);
});

// requires-cycle
test("requires-cycle: two entries that require each other, reported once", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = variantText({ id: "core/alpha/two", sources: ["src-b"], rules: ["MUST do B. [src-b]"], related: ["requires: core/alpha/one"] });
  const [finding] = expectRule(files, "requires-cycle", ["core/alpha/one.md"]);
  assert.match(finding.message, /core\/alpha\/one → core\/alpha\/two → core\/alpha\/one/);
});
test("requires-cycle: a loop of three", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = variantText({ id: "core/alpha/two", sources: ["src-b"], rules: ["MUST do B. [src-b]"], related: ["requires: core/alpha/three"] });
  files["core/alpha/three.md"] = variantText({ id: "core/alpha/three", related: ["requires: core/alpha/one"] });
  expectRule(files, "requires-cycle", ["core/alpha/one.md"]);
});

// length
function variantOfLength(words) {
  const base = one({ useWhen: "W" });
  const pad = words - parseEntry(base).wordCount;
  return one({ useWhen: Array(pad + 1).fill("W").join(" ") });
}
test("length: 400 words is allowed", () => {
  const text = variantOfLength(400);
  assert.equal(parseEntry(text).wordCount, 400);
  assert.deepEqual(run({ ...validFiles(), "core/alpha/one.md": text }).findings, []);
});
test("length: 401 words is reported", () => {
  expectRule({ ...validFiles(), "core/alpha/one.md": variantOfLength(401) }, "length", ["core/alpha/one.md"]);
});
test("length: a long concern is not reported", () => {
  const files = validFiles();
  files["core/alpha/_concern.md"] = concernText({ id: "core/alpha", forces: [Array(500).fill("w").join(" ")] });
  assert.deepEqual(run(files).findings, []);
});

// language-specific
test("language-specific: a fence that declares a language", () => {
  expectRule(withOne({ example: "```js\nx\n```" }), "language-specific", ["core/alpha/one.md"]);
});
test("language-specific: text and pseudocode fences are allowed", () => {
  assert.deepEqual(run(withOne({ example: "```text\nx\n```\n\n```pseudocode\ny\n```" })).findings, []);
});

// planned-ref
test("planned-ref: a planned target is information, not a broken reference", () => {
  const files = withOne({ related: ["requires: core/alpha/two", "alternative: core/alpha/later (planned)"] });
  const { findings, summary } = run(files);
  assert.deepEqual(findings.map((f) => [f.rule, f.severity, f.path]), [["planned-ref", "info", "core/alpha/one.md"]]);
  assert.deepEqual(summary, { errors: 0, warnings: 0, info: 1 });
});
test("planned-ref: says so when the planned target now exists", () => {
  const files = withOne({ related: ["requires: core/alpha/two (planned)"] });
  const [finding] = expectRule(files, "planned-ref", ["core/alpha/one.md"]);
  assert.match(finding.message, /exists/);
});

// orphaned-source
test("orphaned-source: a registry entry nobody cites", () => {
  const sources = "src-a:\n  title: A\n  url: https://example.com/a\n\nsrc-b:\n  title: B\n  url: https://example.com/b\n\nsrc-c:\n  title: C\n  url: https://example.com/c\n";
  const [finding] = expectRule({ ...validFiles(), "sources.yaml": sources }, "orphaned-source", ["sources.yaml"]);
  assert.match(finding.message, /src-c/);
});

test("uncited-must: catches a MUST whatever list marker it uses", () => {
  const files = withOne({ rules: ["MUST do A. [src-a]"] });
  files["core/alpha/one.md"] = files["core/alpha/one.md"].replace("- MUST do A. [src-a]", "- MUST do A. [src-a]\n1. MUST numbered.\n+ MUST plus.\n\nMUST paragraph.");
  expectRule(files, "uncited-must", ["core/alpha/one.md", "core/alpha/one.md", "core/alpha/one.md"]);
});

test("the example in format.md is itself a valid entry", () => {
  const format = readFileSync(new URL("../skills/trodden/references/format.md", import.meta.url), "utf8");
  const example = format.match(/````text\n(---\n[\s\S]*?)````/)[1];
  const sources = "owasp-logging:\n  title: T\n  url: U\n";
  const files = {
    "sources.yaml": sources,
    "core/logging/_concern.md": concernText({ id: "core/logging" }),
    "core/logging/structured.md": example,
  };
  const { findings } = run(files);
  assert.deepEqual(findings.filter((f) => f.severity !== "info"), []);
});
