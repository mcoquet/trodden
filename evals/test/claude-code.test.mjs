import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { claudeCodeHarness, parseEvents } from "../lib/claude-code.mjs";

const evalsDir = fileURLToPath(new URL("..", import.meta.url));
const options = {
  skillDir: join(evalsDir, "..", "skills", "trodden"),
  fixturesDir: join(evalsDir, "fixtures"),
};
const task = { id: "t", prompt: "Do the thing.", fixture: "orders-service", variants: [] };

test("gives the agent a copy of the fixture, with the skill only when asked", async () => {
  const seen = [];
  const runAgent = async ({ dir, prompt, model }) => {
    seen.push({
      prompt,
      model,
      fixture: existsSync(join(dir, "server.js")),
      skill: existsSync(join(dir, ".claude/skills/trodden/SKILL.md")),
      script: existsSync(join(dir, ".claude/skills/trodden/scripts/trodden.mjs")),
    });
    return "";
  };
  const harness = claudeCodeHarness({ ...options, runAgent });
  await harness.run({ task, model: "m", withSkill: true });
  await harness.run({ task, model: "m", withSkill: false });
  assert.deepEqual(seen, [
    { prompt: "Do the thing.", model: "m", fixture: true, skill: true, script: true },
    { prompt: "Do the thing.", model: "m", fixture: true, skill: false, script: false },
  ]);
});

test("returns the agent's changes as a diff, without the skill's own files", async () => {
  const runAgent = async ({ dir }) => {
    appendFileSync(join(dir, "orders.js"), "// changed\n");
    writeFileSync(join(dir, "logger.js"), "export const x = 1;\n");
    return '{"type":"result"}\n';
  };
  const { diff, events } = await claudeCodeHarness({ ...options, runAgent }).run({ task, model: "m", withSkill: true });
  assert.match(diff, /\+\/\/ changed/);
  assert.match(diff, /logger\.js/);
  assert.ok(!diff.includes(".claude/"), "the skill folder is not part of the change");
  assert.deepEqual(events, [{ type: "result" }]);
});

test("returns an empty diff when the agent changes nothing", async () => {
  const { diff } = await claudeCodeHarness({ ...options, runAgent: async () => "" }).run({ task, model: "m", withSkill: true });
  assert.equal(diff, "");
});

test("rejects a task whose fixture does not exist", async () => {
  const harness = claudeCodeHarness({ ...options, runAgent: async () => "" });
  await assert.rejects(harness.run({ task: { ...task, fixture: "nope" }, model: "m", withSkill: false }), /nope/);
});

test("parses an event stream, skipping lines that are not JSON", () => {
  assert.deepEqual(parseEvents('{"type":"a"}\nnot json\n\n{"type":"b"}\n'), [{ type: "a" }, { type: "b" }]);
});
