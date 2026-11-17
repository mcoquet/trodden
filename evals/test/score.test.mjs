import { test } from "node:test";
import assert from "node:assert/strict";
import { loadLibrary } from "../../skills/trodden/scripts/lib/library.mjs";
import { mustRules, summarise, renderSummary } from "../lib/score.mjs";
import { makeLibrary, validFiles, variantText } from "../../test/helpers.mjs";

const verdicts = (...list) => list.map((verdict, i) => ({ variant: "v", rule: `r${i}`, verdict, reason: "" }));
const aCase = (over) => ({ task: "t1", model: "m1", withSkill: true, run: 1, usedScript: false, status: "ok", verdicts: [], ...over });

test("mustRules returns the MUSTs of the variants and of what they require", () => {
  const files = validFiles();
  files["core/alpha/one.md"] = variantText({
    id: "core/alpha/one",
    rules: ["MUST do A. [src-a]", "MUST NOT do C. [src-a]", "SHOULD do D."],
    related: ["requires: core/alpha/two"],
  });
  const lib = loadLibrary(makeLibrary(files));
  assert.deepEqual(mustRules(lib, ["core/alpha/one"]), [
    { variant: "core/alpha/one", text: "MUST do A. [src-a]" },
    { variant: "core/alpha/one", text: "MUST NOT do C. [src-a]" },
    { variant: "core/alpha/two", text: "MUST do B. [src-b]" },
  ]);
});

test("adherence is pass over pass plus fail, ignoring n/a and error", () => {
  const summary = summarise([aCase({ verdicts: verdicts("pass", "pass", "pass", "fail", "n/a", "error") })]);
  assert.equal(summary.overall.withSkill, 0.75);
  assert.equal(summary.overall.withoutSkill, null);
  assert.equal(summary.overall.difference, null);
});

test("adherence is null when nothing is applicable", () => {
  assert.equal(summarise([aCase({ verdicts: verdicts("n/a", "n/a") })]).overall.withSkill, null);
});

test("compares with and without the skill, overall, per model and per task", () => {
  const cases = [
    aCase({ withSkill: true, usedScript: true, verdicts: verdicts("pass", "pass", "pass", "fail") }),
    aCase({ withSkill: false, verdicts: verdicts("pass", "fail", "fail", "fail") }),
    aCase({ model: "m2", withSkill: true, usedScript: false, verdicts: verdicts("pass", "pass") }),
    aCase({ model: "m2", withSkill: false, verdicts: verdicts("pass", "pass") }),
  ];
  const summary = summarise(cases);
  assert.deepEqual(summary.models.m1, { withSkill: 0.75, withoutSkill: 0.25, difference: 0.5, usedScript: 1, cases: 2 });
  assert.deepEqual(summary.models.m2, { withSkill: 1, withoutSkill: 1, difference: 0, usedScript: 0, cases: 2 });
  assert.equal(summary.overall.usedScript, 0.5);
  assert.equal(summary.overall.cases, 4);
  assert.deepEqual(summary.rows.map((r) => [r.task, r.model]), [["t1", "m1"], ["t1", "m2"]]);
  assert.equal(summary.rows[0].difference, 0.5);
});

test("a harness error is counted but excluded from adherence", () => {
  const summary = summarise([
    aCase({ verdicts: verdicts("pass") }),
    aCase({ run: 2, status: "harness-error", verdicts: [] }),
  ]);
  assert.equal(summary.overall.withSkill, 1);
  assert.equal(summary.overall.cases, 2);
  assert.equal(summary.overall.harnessErrors, 1);
});

test("the summary renders as a markdown table with percentages", () => {
  const text = renderSummary(
    summarise([
      aCase({ withSkill: true, usedScript: true, verdicts: verdicts("pass", "pass", "pass", "fail") }),
      aCase({ withSkill: false, verdicts: verdicts("pass", "fail", "fail", "fail") }),
    ]),
  );
  assert.match(text, /\| t1 \| m1 \| 75% \| 25% \| \+50 \| 100% \|/);
  assert.match(text, /\| Overall \|/);
});

test("counts cases the judge could not score", () => {
  const summary = summarise([
    aCase({ verdicts: verdicts("error", "error") }),
    aCase({ run: 2, verdicts: verdicts("pass", "error") }),
    aCase({ run: 3, verdicts: verdicts("pass") }),
  ]);
  assert.equal(summary.overall.judgeErrors, 1);
  assert.match(renderSummary(summary), /1 could not be judged/);
});
