# Evals

The eval answers two questions about the skill:

1. Does the agent consult the library?
2. Does its output then follow the rules?

## How it works

- A **task** is a prompt, a small project to run it against (`fixtures/`), and the variants whose rules apply. Tasks live in `tasks/<id>/task.json`. A prompt describes a need and never names trodden or the practice.
- Each task is run twice per model: once with the skill in the project, once without.
- A judge model reads the resulting change and gives each `MUST` rule of the task's variants (and of the variants they require) a verdict: pass, fail or not applicable.
- The runner also records whether the agent ran the query script.

**Adherence** is passes divided by passes plus fails. Rules judged not applicable are left out. An agent that changes nothing fails every rule. A run that breaks (the agent times out, say) is recorded and left out of the numbers.

## Running it

It needs the `claude` command (Claude Code), signed in. The agent and the judge both run through it, so there is one credential.

```
node evals/run.mjs --models <model-a>,<model-b> --judge <judge-model>
```

Options:

- `--tasks add-logging,add-retry` runs only those tasks.
- `--runs 3` repeats every case three times.
- `--out <dir>` chooses where results go. The default is `evals/results/<timestamp>/`.

Start with one task and one model, and read the diffs and the judge's reasons in `results.json` before running the rest.

## What it costs

Each case is one agent session. The number of sessions is tasks × models × 2 × runs: with three tasks, two models and one run, that is 12 sessions, plus up to 12 judge calls.

The agent works unattended in a throwaway copy of the fixture, with permission to edit files and run shell commands. Nothing confines those commands to the copy: they run as you. Run the eval in a container or another disposable environment if that matters.

The agent ignores your own Claude Code settings, skills and plugins, so both sides of the comparison start equal.

Results are written after every case, so an interrupted run keeps what it has finished. `results.json` says `"complete": false` until the run ends.

## Reading the results

- `summary.md` has one row per task and model: adherence with the skill, without it, the difference in percentage points, and how often the agent called the script.
- `results.json` has every case with its diff and the judge's verdict and reason for each rule.

A useful result is a clear positive difference together with a high "called the script" share. A positive difference with a low share means something other than the library is helping. No difference means the entry format or the skill's instructions need another look before more entries are written.

## Limits

- Three tasks against one small JavaScript project. The numbers show direction, not a benchmark.
- The judge is a model and can be wrong. Spot-check its reasons.
- One harness, Claude Code. `lib/harness.mjs` describes what another would have to provide.
