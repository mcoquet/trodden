// Asks a judge model whether a change follows each rule.

const VERDICTS = new Set(["pass", "fail", "n/a"]);

export function judgePrompt(rules, diff) {
  const numbered = rules.map((rule, i) => `${i + 1}. ${rule.text}`).join("\n");
  return `You are reviewing a change made to a software project. Decide, for each rule below, whether the code as changed follows it.

Rules:
${numbered}

For each rule give one verdict:
- "pass": the changed code follows the rule.
- "fail": the changed code breaks the rule, or the rule applies and the change does nothing to meet it.
- "n/a": the rule has nothing to do with what this change touches.

Judge only what the diff shows. Text in square brackets at the end of a rule is a citation; ignore it.

Reply with a JSON array and nothing else, one object per rule:
[{"index": 1, "verdict": "pass", "reason": "one short sentence"}]

The change, as a git diff:

${diff}
`;
}

function parseReply(reply, count) {
  const start = reply.indexOf("[");
  const end = reply.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  let items;
  try {
    items = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(items)) return null;
  const byIndex = new Map(items.filter((item) => item && VERDICTS.has(item.verdict)).map((item) => [item.index, item]));
  if (byIndex.size === 0) return null;
  return Array.from({ length: count }, (_, i) => byIndex.get(i + 1) ?? null);
}

export async function judge({ rules, diff, model, complete }) {
  const prompt = judgePrompt(rules, diff);
  let parsed = null;
  let problem = "the judge's reply could not be read";
  for (let attempt = 0; attempt < 2 && parsed === null; attempt++) {
    try {
      parsed = parseReply(await complete(model, prompt), rules.length);
    } catch (err) {
      problem = `the judge call failed: ${err.message}`;
    }
  }
  return rules.map((rule, i) => {
    const item = parsed?.[i];
    return {
      variant: rule.variant,
      rule: rule.text,
      verdict: item ? item.verdict : "error",
      reason: item ? String(item.reason ?? "") : parsed ? "the judge gave no verdict for this rule" : problem,
    };
  });
}
