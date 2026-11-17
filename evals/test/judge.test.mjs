import { test } from "node:test";
import assert from "node:assert/strict";
import { judge } from "../lib/judge.mjs";

const rules = [
  { variant: "core/a/one", text: "MUST do A. [s]" },
  { variant: "core/a/one", text: "MUST NOT do B. [s]" },
];
const replies = (...texts) => {
  const calls = [];
  const complete = async (model, prompt) => {
    calls.push({ model, prompt });
    return texts[Math.min(calls.length - 1, texts.length - 1)];
  };
  return { complete, calls };
};
const good = '[{"index":1,"verdict":"pass","reason":"r1"},{"index":2,"verdict":"n/a","reason":"r2"}]';

test("returns one verdict per rule", async () => {
  const { complete, calls } = replies(good);
  const result = await judge({ rules, diff: "DIFF", model: "judge-m", complete });
  assert.deepEqual(result, [
    { variant: "core/a/one", rule: "MUST do A. [s]", verdict: "pass", reason: "r1" },
    { variant: "core/a/one", rule: "MUST NOT do B. [s]", verdict: "n/a", reason: "r2" },
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "judge-m");
  assert.ok(calls[0].prompt.includes("DIFF"));
  assert.ok(calls[0].prompt.includes("1. MUST do A. [s]"));
  assert.ok(calls[0].prompt.includes("2. MUST NOT do B. [s]"));
});

test("finds the JSON when the judge wraps it in prose", async () => {
  const { complete } = replies(`Here you go:\n\`\`\`json\n${good}\n\`\`\`\nDone.`);
  const result = await judge({ rules, diff: "D", model: "m", complete });
  assert.deepEqual(result.map((v) => v.verdict), ["pass", "n/a"]);
});

test("asks once more when the reply cannot be parsed", async () => {
  const { complete, calls } = replies("no idea", good);
  const result = await judge({ rules, diff: "D", model: "m", complete });
  assert.equal(calls.length, 2);
  assert.deepEqual(result.map((v) => v.verdict), ["pass", "n/a"]);
});

test("marks every verdict as error after two unparseable replies", async () => {
  const { complete, calls } = replies("no idea");
  const result = await judge({ rules, diff: "D", model: "m", complete });
  assert.equal(calls.length, 2);
  assert.deepEqual(result.map((v) => v.verdict), ["error", "error"]);
  assert.equal(result[0].rule, "MUST do A. [s]");
});

test("marks a rule the judge left out, or gave an unknown verdict, as error", async () => {
  const { complete } = replies('[{"index":1,"verdict":"maybe","reason":"x"}]', '[{"index":1,"verdict":"maybe","reason":"x"}]');
  const result = await judge({ rules, diff: "D", model: "m", complete });
  assert.deepEqual(result.map((v) => v.verdict), ["error", "error"]);
});

test("treats a failing judge call as an unparseable reply", async () => {
  let calls = 0;
  const complete = async () => {
    calls++;
    throw new Error("boom");
  };
  const result = await judge({ rules, diff: "D", model: "m", complete });
  assert.equal(calls, 2);
  assert.deepEqual(result.map((v) => v.verdict), ["error", "error"]);
});

test("accepts an index given as a string", async () => {
  const { complete } = replies('[{"index":"1","verdict":"pass","reason":"a"},{"index":"2","verdict":"fail","reason":"b"}]');
  const result = await judge({ rules, diff: "D", model: "m", complete });
  assert.deepEqual(result.map((v) => v.verdict), ["pass", "fail"]);
});
