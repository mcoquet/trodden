import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLibrary } from "../../skills/trodden/scripts/lib/library.mjs";
import { stubHarness, detectScriptUse } from "../lib/harness.mjs";
import { loadTasks } from "../lib/tasks.mjs";
import { runEval, writeResults } from "../run.mjs";
import { makeLibrary, validFiles } from "../../test/helpers.mjs";

const lib = loadLibrary(makeLibrary(validFiles()));
const tasks = [
  { id: "t1", prompt: "P1", fixture: "f", variants: ["core/alpha/one"] },
  { id: "t2", prompt: "P2", fixture: "f", variants: ["core/alpha/two"] },
];
const bashEvent = (command) => ({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command } }] } });
const passAll = async (model, prompt) => {
  const count = (prompt.match(/^\d+\. /gm) ?? []).length;
  return JSON.stringify(Array.from({ length: count }, (_, i) => ({ index: i + 1, verdict: "pass", reason: "ok" })));
};

test("detects a call to the query script", () => {
  assert.equal(detectScriptUse([bashEvent("node x/trodden.mjs list")]), true);
  assert.equal(detectScriptUse([bashEvent("ls"), { type: "result" }]), false);
  assert.equal(detectScriptUse([{ type: "assistant", message: { content: [{ type: "text", text: "trodden.mjs" }] } }]), false);
  assert.equal(detectScriptUse([]), false);
});

test("runs every task with and without the skill", async () => {
  const seen = [];
  const harness = stubHarness(({ task, model, withSkill }) => {
    seen.push([task.id, model, withSkill]);
    return { diff: "DIFF", events: withSkill ? [bashEvent("node trodden.mjs get x")] : [] };
  });
  const { cases, summary } = await runEval({ tasks, models: ["m1"], judgeModel: "j", harness, complete: passAll, lib });
  assert.deepEqual(seen, [["t1", "m1", true], ["t1", "m1", false], ["t2", "m1", true], ["t2", "m1", false]]);
  assert.equal(cases.length, 4);
  assert.deepEqual(cases.map((c) => c.status), ["ok", "ok", "ok", "ok"]);
  assert.deepEqual(cases.map((c) => c.usedScript), [true, false, true, false]);
  // t1 scores the MUSTs of core/alpha/one and of core/alpha/two, which it requires
  assert.equal(cases[0].verdicts.length, 2);
  assert.equal(cases[2].verdicts.length, 1);
  assert.equal(cases[0].diff, "DIFF");
  assert.equal(summary.overall.withSkill, 1);
  assert.equal(summary.overall.usedScript, 1);
});

test("repeats each case when asked for several runs", async () => {
  const harness = stubHarness(() => ({ diff: "D", events: [] }));
  const { cases } = await runEval({ tasks: [tasks[0]], models: ["m1", "m2"], judgeModel: "j", harness, complete: passAll, lib, runs: 2 });
  assert.equal(cases.length, 8);
  assert.deepEqual([...new Set(cases.map((c) => c.run))], [1, 2]);
});

test("an agent that changes nothing fails every rule without calling the judge", async () => {
  let judged = 0;
  const complete = async (...args) => {
    judged++;
    return passAll(...args);
  };
  const harness = stubHarness(({ withSkill }) => ({ diff: withSkill ? "  \n" : "DIFF", events: [] }));
  const { cases, summary } = await runEval({ tasks: [tasks[0]], models: ["m1"], judgeModel: "j", harness, complete, lib });
  assert.equal(cases[0].status, "no-change");
  assert.deepEqual(cases[0].verdicts.map((v) => v.verdict), ["fail", "fail"]);
  assert.equal(cases[1].status, "ok");
  assert.equal(judged, 1);
  assert.equal(summary.overall.withSkill, 0);
});

test("a harness failure is recorded and the run continues", async () => {
  const harness = stubHarness(({ withSkill }) => {
    if (withSkill) throw new Error("agent timed out");
    return { diff: "DIFF", events: [] };
  });
  const { cases, summary } = await runEval({ tasks, models: ["m1"], judgeModel: "j", harness, complete: passAll, lib });
  assert.equal(cases.length, 4);
  assert.equal(cases[0].status, "harness-error");
  assert.match(cases[0].error, /agent timed out/);
  assert.deepEqual(cases[0].verdicts, []);
  assert.equal(cases[1].status, "ok");
  assert.equal(summary.overall.withSkill, null);
  assert.equal(summary.overall.withoutSkill, 1);
  assert.equal(summary.overall.harnessErrors, 2);
});

test("a task naming a variant the library does not have is rejected before anything runs", async () => {
  let ran = 0;
  const harness = stubHarness(() => {
    ran++;
    return { diff: "D", events: [] };
  });
  const bad = [{ id: "t", prompt: "P", fixture: "f", variants: ["core/nope/x"] }];
  await assert.rejects(runEval({ tasks: bad, models: ["m"], judgeModel: "j", harness, complete: passAll, lib }), /core\/nope\/x/);
  assert.equal(ran, 0);
});

test("writes results.json and summary.md", async () => {
  const harness = stubHarness(() => ({ diff: "DIFF", events: [] }));
  const result = await runEval({ tasks: [tasks[0]], models: ["m1"], judgeModel: "j", harness, complete: passAll, lib });
  const out = join(mkdtempSync(join(tmpdir(), "trodden-eval-")), "nested", "out");
  writeResults(out, { ...result, meta: { models: ["m1"], judge: "j", date: "2026-01-01T00:00:00Z", libraryCommit: "abc" } });
  const saved = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
  assert.equal(saved.cases.length, 2);
  assert.equal(saved.meta.judge, "j");
  assert.equal(saved.summary.overall.withSkill, 1);
  assert.ok(readFileSync(join(out, "summary.md"), "utf8").includes("| Overall |"));
});

test("the shipped tasks are well formed and point at real variants and fixtures", () => {
  const evalsDir = fileURLToPath(new URL("..", import.meta.url));
  const shipped = loadTasks(join(evalsDir, "tasks"));
  const real = loadLibrary(fileURLToPath(new URL("../../skills/trodden/library", import.meta.url)));
  assert.deepEqual(shipped.map((t) => t.id), ["add-config", "add-logging", "add-retry"]);
  for (const task of shipped) {
    assert.ok(task.prompt.length > 20);
    assert.ok(!/trodden/i.test(task.prompt), "the prompt must not name trodden");
    assert.ok(existsSync(join(evalsDir, "fixtures", task.fixture)), task.fixture);
    for (const id of task.variants) assert.equal(real.entries.get(id)?.type, "variant", id);
  }
});

test("reports each case as it finishes, with everything so far", async () => {
  const harness = stubHarness(() => ({ diff: "DIFF", events: [] }));
  const sizes = [];
  await runEval({ tasks, models: ["m1"], judgeModel: "j", harness, complete: passAll, lib, onCase: (c, soFar) => sizes.push(soFar.length) });
  assert.deepEqual(sizes, [1, 2, 3, 4]);
});
