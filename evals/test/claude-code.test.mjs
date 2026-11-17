import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { claudeCodeHarness, parseEvents, runCommand } from "../lib/claude-code.mjs";

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

test("sees a change the agent committed itself", async () => {
  const runAgent = async ({ dir }) => {
    writeFileSync(join(dir, "logger.js"), "export const x = 1;\n");
    execFileSync("git", ["-c", "user.name=a", "-c", "user.email=a@example.invalid", "-c", "commit.gpgsign=false", "add", "--all"], { cwd: dir });
    execFileSync("git", ["-c", "user.name=a", "-c", "user.email=a@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "x"], { cwd: dir });
    return "";
  };
  const { diff } = await claudeCodeHarness({ ...options, runAgent }).run({ task, model: "m", withSkill: false });
  assert.match(diff, /logger\.js/);
});

test("leaves installed packages out of the diff", async () => {
  const runAgent = async ({ dir }) => {
    mkdirSync(join(dir, "node_modules/pkg"), { recursive: true });
    writeFileSync(join(dir, "node_modules/pkg/index.js"), "x\n");
    appendFileSync(join(dir, "orders.js"), "// changed\n");
    return "";
  };
  const { diff } = await claudeCodeHarness({ ...options, runAgent }).run({ task, model: "m", withSkill: false });
  assert.match(diff, /\+\/\/ changed/);
  assert.ok(!diff.includes("node_modules"));
});

test("refuses a diff too large to judge", async () => {
  const runAgent = async ({ dir }) => {
    writeFileSync(join(dir, "big.txt"), "line\n".repeat(60000));
    return "";
  };
  await assert.rejects(claudeCodeHarness({ ...options, runAgent }).run({ task, model: "m", withSkill: false }), /too large/);
});

test("a command that exits without reading its input fails the call, not the process", async () => {
  await assert.rejects(runCommand("false", [], { input: "x".repeat(1_000_000), timeout: 10_000 }), /false failed/);
  await assert.rejects(runCommand("no-such-command-xyz", [], { input: "x", timeout: 10_000 }), /failed/);
});
