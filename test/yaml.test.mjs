import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYamlSubset, YamlSubsetError } from "../skills/trodden/scripts/lib/yaml.mjs";

test("parses scalars and one-line lists", () => {
  assert.deepEqual(parseYamlSubset("type: variant\nsources: [a, b]\n"), {
    type: "variant",
    sources: ["a", "b"],
  });
});

test("parses an empty list", () => {
  assert.deepEqual(parseYamlSubset("sources: []"), { sources: [] });
});

test("ignores comments and blank lines", () => {
  assert.deepEqual(parseYamlSubset("# note\n\nid: core/x\n"), { id: "core/x" });
});

test("keeps a colon inside a quoted value", () => {
  assert.deepEqual(parseYamlSubset('title: "The Twelve-Factor App: XI. Logs"'), {
    title: "The Twelve-Factor App: XI. Logs",
  });
});

test("keeps a URL as one string", () => {
  assert.deepEqual(parseYamlSubset("url: https://12factor.net/logs"), {
    url: "https://12factor.net/logs",
  });
});

test("treats brackets and colons mid-value as text", () => {
  assert.deepEqual(parseYamlSubset("summary: Use [brackets] mid-sentence: fine"), {
    summary: "Use [brackets] mid-sentence: fine",
  });
});

test("accepts CRLF line endings", () => {
  assert.deepEqual(parseYamlSubset("a: 1\r\nb: 2\r\n"), { a: "1", b: "2" });
});

test("parses one level of nesting when asked", () => {
  assert.deepEqual(parseYamlSubset("x:\n  title: T\n  url: U\n", { nested: true }), {
    x: { title: "T", url: "U" },
  });
});

function failsAt(text, line, opts) {
  assert.throws(
    () => parseYamlSubset(text, opts),
    (err) => err instanceof YamlSubsetError && err.line === line,
  );
}

test("rejects a duplicate key", () => failsAt("a: 1\na: 2", 2));
test("rejects a line with no colon", () => failsAt("just text", 1));
test("rejects nesting unless asked", () => failsAt("x:\n  title: T", 1));
test("rejects two levels of nesting", () => failsAt("x:\n  y:\n    z: 1", 2, { nested: true }));
