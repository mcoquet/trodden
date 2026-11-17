#!/usr/bin/env node
// Runs the eval: each task with and without the skill, judged against
// the MUST rules of the task's variants.

import { execFileSync } from "node:child_process";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadLibrary } from "../skills/trodden/scripts/lib/library.mjs";
import { detectScriptUse } from "./lib/harness.mjs";
import { judge } from "./lib/judge.mjs";
import { mustRules, summarise, renderSummary } from "./lib/score.mjs";

// Called after every case in a real run, so a run that is interrupted
// keeps what it has already paid for.
function progressWriter(out, meta) {
  return (c, cases) => {
    process.stderr.write(`${c.task} ${c.model} ${c.withSkill ? "with skill" : "without skill"} run ${c.run}: ${c.status}\n`);
    writeResults(out, { cases, summary: summarise(cases), meta: { ...meta, complete: false } });
  };
}
import { loadTasks } from "./lib/tasks.mjs";

export async function runEval({ tasks, models, judgeModel, harness, complete, lib, runs = 1, onCase = () => {} }) {
  // Resolve every task's rules first, so a bad task fails before any model is called.
  const rulesByTask = new Map(tasks.map((task) => [task.id, mustRules(lib, task.variants)]));
  const cases = [];
  for (const task of tasks) {
    const rules = rulesByTask.get(task.id);
    for (const model of models) {
      for (let run = 1; run <= runs; run++) {
        for (const withSkill of [true, false]) {
          const result = { task: task.id, model, withSkill, run, usedScript: false, status: "ok", verdicts: [] };
          try {
            const { diff, events } = await harness.run({ task, model, withSkill });
            result.usedScript = detectScriptUse(events);
            result.diff = diff;
            if (diff.trim() === "") {
              result.status = "no-change";
              result.verdicts = rules.map((rule) => ({
                variant: rule.variant,
                rule: rule.text,
                verdict: "fail",
                reason: "the agent made no change",
              }));
            } else {
              result.verdicts = await judge({ rules, diff, model: judgeModel, complete });
            }
          } catch (err) {
            result.status = "harness-error";
            result.error = err.message;
          }
          cases.push(result);
          onCase(result, cases);
        }
      }
    }
  }
  return { cases, summary: summarise(cases) };
}

export function writeResults(dir, { cases, summary, meta }) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "results.json"), `${JSON.stringify({ meta, summary, cases }, null, 2)}\n`);
  const heading = `# Eval results\n\n${meta.date}. Models: ${meta.models.join(", ")}. Judge: ${meta.judge}. Library commit: ${meta.libraryCommit}.\n\n`;
  writeFileSync(join(dir, "summary.md"), heading + renderSummary(summary));
}

const USAGE = `Usage: node evals/run.mjs --models <a,b> --judge <model> [--tasks <id,...>] [--runs <n>] [--out <dir>]
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i];
    if (!["--models", "--judge", "--tasks", "--runs", "--out"].includes(name) || argv[i + 1] === undefined) return null;
    args[name.slice(2)] = argv[i + 1];
  }
  return args.models && args.judge ? args : null;
}

async function cli(argv) {
  const args = parseArgs(argv);
  if (!args) {
    process.stderr.write(USAGE);
    return 2;
  }
  const here = fileURLToPath(new URL(".", import.meta.url));
  const skillDir = join(here, "..", "skills", "trodden");
  const { claudeCodeHarness, claudeComplete } = await import("./lib/claude-code.mjs");

  let tasks = loadTasks(join(here, "tasks"));
  if (args.tasks) {
    const wanted = args.tasks.split(",");
    const unknown = wanted.filter((id) => !tasks.some((task) => task.id === id));
    if (unknown.length) {
      process.stderr.write(`unknown task: ${unknown.join(", ")}\n`);
      return 2;
    }
    tasks = tasks.filter((task) => wanted.includes(task.id));
  }
  const runs = Number(args.runs ?? 1);
  if (!Number.isInteger(runs) || runs < 1) {
    process.stderr.write(USAGE);
    return 2;
  }
  const models = args.models.split(",");
  const date = new Date().toISOString();
  const out = args.out ?? join(here, "results", date.replace(/[:.]/g, "-"));
  let libraryCommit = "unknown";
  try {
    libraryCommit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: here, encoding: "utf8" }).trim();
  } catch {
    // not a git checkout; the results say so
  }

  const meta = { models, judge: args.judge, runs, date, libraryCommit };
  const result = await runEval({
    tasks,
    models,
    judgeModel: args.judge,
    harness: claudeCodeHarness({ skillDir, fixturesDir: join(here, "fixtures") }),
    complete: claudeComplete,
    lib: loadLibrary(join(skillDir, "library")),
    runs,
    onCase: progressWriter(out, meta),
  });
  writeResults(out, { ...result, meta: { ...meta, complete: true } });
  process.stdout.write(`${renderSummary(result.summary)}\nResults written to ${out}\n`);
  return 0;
}

const invoked = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  process.exitCode = await cli(process.argv.slice(2));
}
