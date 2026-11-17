// Turns query and lint results into the text an agent or a person reads.

import { variantsOf } from "./library.mjs";

const oneLine = (text) => text.replace(/\s+/g, " ").trim();
const cell = (text) => oneLine(text).replace(/\|/g, "\\|");

export function renderList(index) {
  return index
    .map((entry) => `${entry.type === "variant" ? "  " : ""}${entry.id} — ${entry.summary}\n`)
    .join("");
}

function variantsTable(lib, concern) {
  const rows = variantsOf(lib, concern.id).map((variant) => {
    const useWhen = variant.sections.find((section) => section.heading === "Use when")?.body ?? "";
    return `| ${variant.id} | ${cell(variant.frontmatter.summary ?? "")} | ${cell(useWhen)} |`;
  });
  return ["## Variants", "", "| Id | Summary | Use when |", "|---|---|---|", ...rows].join("\n");
}

// One entry as markdown: its body with the id added to the title and,
// for a concern, the table of its variants.
export function renderEntry(lib, entry) {
  let titled = false;
  const body = entry.body
    .split("\n")
    .map((line) => {
      if (titled || !/^#\s+\S/.test(line)) return line;
      titled = true;
      return `${line.trimEnd()} (${entry.id})`;
    })
    .join("\n")
    .trim();
  return entry.type === "concern" ? `${body}\n\n${variantsTable(lib, entry)}` : body;
}

function requiredBy(entries, entry) {
  return entries.find((other) =>
    other.relationships.some((rel) => rel.kind === "requires" && !rel.planned && rel.target === entry.id),
  );
}

export function renderSources(sources) {
  const lines = sources.map((source) => `- ${source.id}: ${source.title ?? "(not in the source registry)"} — ${source.url ?? ""}`.trimEnd());
  return ["## Sources", "", ...lines].join("\n");
}

export function renderGet(lib, resolved, requestedIds) {
  const parts = resolved.entries.map((entry) => {
    const text = renderEntry(lib, entry);
    if (requestedIds.includes(entry.id)) return text;
    const parent = requiredBy(resolved.entries, entry);
    return `Required by ${parent.id}:\n\n${text}`;
  });
  if (resolved.sources.length) parts.push(renderSources(resolved.sources));
  return `${parts.join("\n\n---\n\n")}\n`;
}

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function renderFindings(report) {
  const lines = report.findings.map((finding) => {
    const where = finding.line === undefined ? finding.path : `${finding.path}:${finding.line}`;
    return `${finding.severity} ${where} ${finding.rule} ${finding.message}`;
  });
  const { errors, warnings, info } = report.summary;
  lines.push(`${plural(errors, "error")}, ${plural(warnings, "warning")}, ${info} info`);
  return `${lines.join("\n")}\n`;
}
