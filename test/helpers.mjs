// Builders for small throwaway libraries used by the tests.

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_SOURCES = "src-a:\n  title: Source A\n  url: https://example.com/a\n\nsrc-b:\n  title: Source B\n  url: https://example.com/b\n";

export function makeLibrary(files) {
  const root = mkdtempSync(join(tmpdir(), "trodden-lib-"));
  const all = { "sources.yaml": DEFAULT_SOURCES, ...files };
  for (const [path, text] of Object.entries(all)) {
    if (text === null) continue;
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

export function variantText({
  id,
  summary = "A summary.",
  sources = ["src-a"],
  title = "A variant",
  useWhen = "When X.",
  rules = ["MUST do A. [src-a]"],
  example = "```\nx\n```",
  avoid = ["Doing Y"],
  related = [],
} = {}) {
  const list = (items) => items.map((item) => `- ${item}`).join("\n");
  return [
    "---",
    "type: variant",
    `id: ${id}`,
    `summary: ${summary}`,
    `sources: [${sources.join(", ")}]`,
    "---",
    `# ${title}`,
    "",
    "## Use when",
    "",
    useWhen,
    "",
    "## Rules",
    "",
    list(rules),
    "",
    "## Example",
    "",
    example,
    "",
    "## Avoid",
    "",
    list(avoid),
    "",
    "## Related",
    "",
    related.length ? list(related) : "None.",
    "",
  ].join("\n");
}

export function concernText({
  id,
  summary = "A summary.",
  title = "A concern",
  forces = ["A force"],
  outOfScope = null,
  related = [],
} = {}) {
  const list = (items) => items.map((item) => `- ${item}`).join("\n");
  const parts = ["---", "type: concern", `id: ${id}`, `summary: ${summary}`, "---", `# ${title}`, "", "## Forces", "", list(forces), ""];
  if (outOfScope) parts.push("## Out of scope", "", outOfScope, "");
  if (related.length) parts.push("## Related", "", list(related), "");
  return parts.join("\n");
}

export function validFiles() {
  return {
    "core/alpha/_concern.md": concernText({ id: "core/alpha", summary: "Alpha concern.", title: "Alpha" }),
    "core/alpha/one.md": variantText({
      id: "core/alpha/one",
      summary: "Variant one.",
      title: "One",
      related: ["requires: core/alpha/two"],
    }),
    "core/alpha/two.md": variantText({
      id: "core/alpha/two",
      summary: "Variant two.",
      title: "Two",
      sources: ["src-b"],
      rules: ["MUST do B. [src-b]"],
    }),
  };
}
