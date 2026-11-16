import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseYamlSubset } from "../skills/trodden/scripts/lib/yaml.mjs";

const text = readFileSync(new URL("../skills/trodden/SKILL.md", import.meta.url), "utf8");
const [, frontmatterText, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
const frontmatter = parseYamlSubset(frontmatterText);

test("the skill is named trodden and says when to use it", () => {
  assert.equal(frontmatter.name, "trodden");
  assert.ok(frontmatter.description.length > 0);
  assert.ok(frontmatter.description.length <= 1024);
});

test("the skill body stays short", () => {
  const words = body.split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 300, `${words} words`);
});

test("the skill only names commands that exist", () => {
  const named = [...body.matchAll(/trodden\.mjs (\w+)/g)].map((m) => m[1]);
  assert.ok(named.length > 0);
  for (const command of named) assert.ok(["list", "get", "lint", "spec"].includes(command), command);
});

test("the skill tells the agent to list and then get", () => {
  assert.match(body, /trodden\.mjs list/);
  assert.match(body, /trodden\.mjs get/);
});
