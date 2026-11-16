// Turns judged cases into adherence numbers.

import { resolve } from "../../skills/trodden/scripts/lib/library.mjs";

// Every MUST and MUST NOT of the given variants and of the variants they require.
export function mustRules(lib, variantIds) {
  return resolve(lib, variantIds)
    .entries.filter((entry) => entry.type === "variant")
    .flatMap((entry) =>
      entry.rules
        .filter((rule) => rule.level === "MUST" || rule.level === "MUST NOT")
        .map((rule) => ({ variant: entry.id, text: rule.text })),
    );
}

function adherence(cases) {
  const verdicts = cases.flatMap((c) => c.verdicts);
  const pass = verdicts.filter((v) => v.verdict === "pass").length;
  const fail = verdicts.filter((v) => v.verdict === "fail").length;
  return pass + fail === 0 ? null : pass / (pass + fail);
}

function row(cases) {
  const scored = cases.filter((c) => c.status !== "harness-error");
  const withCases = scored.filter((c) => c.withSkill);
  const withSkill = adherence(withCases);
  const withoutSkill = adherence(scored.filter((c) => !c.withSkill));
  return {
    withSkill,
    withoutSkill,
    difference: withSkill === null || withoutSkill === null ? null : withSkill - withoutSkill,
    usedScript: withCases.length === 0 ? null : withCases.filter((c) => c.usedScript).length / withCases.length,
    cases: cases.length,
  };
}

export function summarise(cases) {
  const unique = (values) => [...new Set(values)].sort();
  const models = unique(cases.map((c) => c.model));
  const tasks = unique(cases.map((c) => c.task));
  return {
    overall: { ...row(cases), harnessErrors: cases.filter((c) => c.status === "harness-error").length },
    models: Object.fromEntries(models.map((model) => [model, row(cases.filter((c) => c.model === model))])),
    rows: tasks.flatMap((task) =>
      models
        .map((model) => ({ task, model, matching: cases.filter((c) => c.task === task && c.model === model) }))
        .filter(({ matching }) => matching.length > 0)
        .map(({ matching, ...key }) => ({ ...key, ...row(matching) })),
    ),
  };
}

const percent = (value) => (value === null ? "–" : `${Math.round(value * 100)}%`);
const points = (value) => {
  if (value === null) return "–";
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
};
const cells = (r) => `${percent(r.withSkill)} | ${percent(r.withoutSkill)} | ${points(r.difference)} | ${percent(r.usedScript)}`;

export function renderSummary(summary) {
  const lines = [
    "| Task | Model | With skill | Without skill | Difference (points) | Called the script |",
    "|---|---|---|---|---|---|",
    ...summary.rows.map((r) => `| ${r.task} | ${r.model} | ${cells(r)} |`),
    ...Object.entries(summary.models).map(([model, r]) => `| All tasks | ${model} | ${cells(r)} |`),
    `| Overall | | ${cells(summary.overall)} |`,
    "",
    `${summary.overall.cases} cases, ${summary.overall.harnessErrors} of them harness errors.`,
    "",
    "Adherence is the share of applicable MUST rules the change follows. \"Called the script\" is the share of with-skill cases in which the agent ran the query script.",
  ];
  return `${lines.join("\n")}\n`;
}
