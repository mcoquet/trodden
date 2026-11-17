// The linter: checks that a library follows the entry format.
// It judges form only, never whether a practice is good.

export const RULES = [
  { name: "frontmatter", severity: "error", description: "Required fields are present and valid for the entry's type" },
  { name: "id-path", severity: "error", description: "The id matches the file's path; no two entries share an id" },
  { name: "section-order", severity: "error", description: "Required sections are present, in order, with no duplicates" },
  { name: "uncited-must", severity: "error", description: "Every MUST cites at least one source" },
  { name: "unknown-source", severity: "error", description: "Every source id exists in the source registry" },
  { name: "broken-ref", severity: "error", description: "Every relationship target exists, unless marked planned, and is of a type that relationship allows" },
  { name: "requires-cycle", severity: "error", description: "requires relationships do not form a loop" },
  { name: "length", severity: "warning", description: "A variant's body is over 400 words" },
  { name: "language-specific", severity: "warning", description: "A code fence declares a programming language" },
  { name: "planned-ref", severity: "info", description: "A relationship points to a planned entry" },
  { name: "orphaned-source", severity: "info", description: "A source in the registry is cited nowhere" },
];

const SEVERITY = Object.fromEntries(RULES.map((rule) => [rule.name, rule.severity]));
const REGISTRY = "sources.yaml";
const MAX_WORDS = 400;
const NEUTRAL_FENCES = new Set(["", "text", "pseudocode"]);
const VARIANT_ONLY = new Set(["requires", "refines", "conflicts-with", "alternative"]);
const KEYWORDS = new Set([...VARIANT_ONLY, "see also"]);
const SECTIONS = {
  concern: { order: ["Forces", "Out of scope", "Related"], required: ["Forces"] },
  variant: {
    order: ["Use when", "Rules", "Example", "Avoid", "Related"],
    required: ["Use when", "Rules", "Example", "Avoid", "Related"],
  },
};

// What the file's location says it is, whatever its frontmatter claims.
function kindOf(file) {
  if (file.expectedId === null) return null;
  return file.path.endsWith("/_concern.md") ? "concern" : "variant";
}

function declaredSources(file) {
  const sources = file.frontmatter?.sources;
  return Array.isArray(sources) ? sources : [];
}

function checkFrontmatter(file, report) {
  if (file.frontmatter === null) {
    report("frontmatter", file, 1, `frontmatter cannot be read: ${file.frontmatterError}`);
    return;
  }
  const fm = file.frontmatter;
  const kind = kindOf(file);
  for (const field of ["type", "id", "summary"]) {
    if (typeof fm[field] !== "string" || fm[field].trim() === "") {
      report("frontmatter", file, 1, `"${field}" is missing`);
    }
  }
  if (typeof fm.type === "string" && fm.type.trim() !== "") {
    if (fm.type !== "concern" && fm.type !== "variant") {
      report("frontmatter", file, 1, `type is "${fm.type}"; it must be "concern" or "variant"`);
    } else if (kind !== null && fm.type !== kind) {
      report("frontmatter", file, 1, `type is "${fm.type}", but this file's name makes it a ${kind}`);
    }
  }
  if ("sources" in fm && !Array.isArray(fm.sources)) {
    report("frontmatter", file, 1, `"sources" must be a list, such as [a, b]`);
    return;
  }
  const declared = new Set(declaredSources(file));
  const undeclared = new Set(file.rules.flatMap((rule) => rule.sources).filter((id) => !declared.has(id)));
  for (const id of undeclared) {
    report("frontmatter", file, 1, `source "${id}" is cited in a rule but not listed in "sources"`);
  }
}

function checkIdPath(file, lib, report) {
  if (file.expectedId === null) {
    report("id-path", file, 1, "no entry belongs here; entries live at <area>/<concern>/_concern.md or <area>/<concern>/<variant>.md");
    return;
  }
  if (kindOf(file) === "variant") {
    const concernPath = file.path.replace(/[^/]+$/, "_concern.md");
    if (!lib.files.some((other) => other.path === concernPath)) {
      report("id-path", file, 1, `this variant has no concern: ${concernPath} does not exist`);
    }
  }
  if (file.id === null || file.id === file.expectedId) return;
  const holder = lib.files.find((other) => other !== file && other.expectedId === file.id);
  const also = holder ? `; that id belongs to ${holder.path}` : "";
  report("id-path", file, 1, `id is "${file.id}", but the path makes it "${file.expectedId}"${also}`);
}

function checkSections(file, report) {
  const kind = kindOf(file);
  if (kind === null) return;
  if (file.titleCount === 0) report("section-order", file, 1, "the entry has no # title");
  if (file.titleCount > 1) report("section-order", file, 1, "the entry has more than one # title");

  const { order, required } = SECTIONS[kind];
  const seen = [];
  for (const section of file.sections) {
    if (!order.includes(section.heading)) {
      report("section-order", file, section.line, `"${section.heading}" is not a section of a ${kind}; allowed: ${order.join(", ")}`);
    } else if (seen.includes(section.heading)) {
      report("section-order", file, section.line, `"${section.heading}" appears more than once`);
    } else {
      seen.push(section.heading);
    }
  }
  for (const heading of required) {
    if (!seen.includes(heading)) report("section-order", file, 1, `the "${heading}" section is missing`);
  }
  const sorted = [...seen].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const misplaced = seen.find((heading, i) => heading !== sorted[i]);
  if (misplaced) {
    const line = file.sections.find((section) => section.heading === misplaced).line;
    report("section-order", file, line, `sections are out of order; expected: ${sorted.join(", ")}`);
  }

  if (kind !== "variant" || !seen.includes("Rules")) return;
  if (file.rules.length === 0) {
    const line = file.sections.find((section) => section.heading === "Rules").line;
    report("section-order", file, line, "the Rules section has no rules");
  }
  for (const rule of file.rules) {
    if (rule.level === null) {
      report("section-order", file, rule.line, "a rule must start with MUST, MUST NOT, SHOULD or SHOULD NOT");
    }
  }
}

function checkRules(file, lib, report) {
  for (const rule of file.rules) {
    if ((rule.level === "MUST" || rule.level === "MUST NOT") && rule.sources.length === 0) {
      report("uncited-must", file, rule.line, `a ${rule.level} must cite a source, such as [source-id]`);
    }
  }
  if (lib.sourcesError !== null) return; // reported once, on the registry
  const used = new Set([...declaredSources(file), ...file.rules.flatMap((rule) => rule.sources)]);
  for (const id of used) {
    if (!lib.sources.has(id)) {
      report("unknown-source", file, 1, `source "${id}" is not in ${REGISTRY}`);
    }
  }
}

function checkRelationships(file, lib, report) {
  const kind = kindOf(file);
  if (kind === null) return;
  const kindById = new Map(lib.files.filter((f) => f.expectedId !== null).map((f) => [f.expectedId, kindOf(f)]));

  for (const rel of file.relationships) {
    if (rel.kind === null) {
      report("broken-ref", file, rel.line, `"${rel.raw}" is not a relationship; write "<keyword>: <id>"`);
      continue;
    }
    if (!KEYWORDS.has(rel.kind)) {
      report("broken-ref", file, rel.line, `"${rel.kind}" is not a relationship keyword; use one of: ${[...KEYWORDS].join(", ")}`);
      continue;
    }
    if (kind === "concern" && rel.kind !== "see also") {
      report("broken-ref", file, rel.line, `a concern may only declare "see also", not "${rel.kind}"`);
      continue;
    }
    if (rel.target === file.expectedId) {
      report("broken-ref", file, rel.line, `${rel.kind} points at the entry itself`);
      continue;
    }
    const targetKind = kindById.get(rel.target);
    if (rel.planned) {
      const note = targetKind ? `${rel.target} is marked planned but now exists; remove the marker` : `${rel.target} is planned and not written yet`;
      report("planned-ref", file, rel.line, note);
      continue;
    }
    if (!targetKind) {
      report("broken-ref", file, rel.line, `${rel.kind} ${rel.target}, which does not exist`);
    } else if (VARIANT_ONLY.has(rel.kind) && targetKind !== "variant") {
      report("broken-ref", file, rel.line, `${rel.kind} must point at a variant, but ${rel.target} is a ${targetKind}`);
    }
  }
}

function checkCycles(lib, report) {
  const variants = new Map(
    lib.files.filter((file) => kindOf(file) === "variant").map((file) => [file.expectedId, file]),
  );
  const edges = (id) =>
    variants
      .get(id)
      .relationships.filter((rel) => rel.kind === "requires" && !rel.planned && rel.target !== id && variants.has(rel.target))
      .map((rel) => rel.target);

  // Shortest path from `from` back to `from`, or null.
  const loopFrom = (from) => {
    const queue = [[from]];
    const visited = new Set();
    while (queue.length) {
      const path = queue.shift();
      for (const next of edges(path[path.length - 1])) {
        if (next === from) return [...path, from];
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([...path, next]);
        }
      }
    }
    return null;
  };

  const reported = new Set();
  for (const id of [...variants.keys()].sort()) {
    if (reported.has(id)) continue;
    const loop = loopFrom(id);
    if (!loop) continue;
    loop.forEach((member) => reported.add(member));
    report("requires-cycle", variants.get(id), 1, `requires forms a loop: ${loop.join(" → ")}`);
  }
}

function checkRegistry(lib, report) {
  const registry = { path: REGISTRY };
  if (lib.sourcesError !== null) {
    report("unknown-source", registry, undefined, `the source registry cannot be read: ${lib.sourcesError}`);
    return;
  }
  const cited = new Set(lib.files.flatMap((file) => [...declaredSources(file), ...file.rules.flatMap((rule) => rule.sources)]));
  for (const [id, source] of lib.sources) {
    for (const field of ["title", "url"]) {
      if (typeof source[field] !== "string" || source[field].trim() === "") {
        report("unknown-source", registry, undefined, `source "${id}" has no ${field}`);
      }
    }
    if (!cited.has(id)) report("orphaned-source", registry, undefined, `source "${id}" is cited by no entry`);
  }
}

export function lint(lib) {
  const findings = [];
  const report = (rule, file, line, message) => {
    const finding = { rule, severity: SEVERITY[rule], path: file.path };
    if (line !== undefined) finding.line = line;
    findings.push({ ...finding, message });
  };

  for (const file of lib.files) {
    checkIdPath(file, lib, report);
    if (file.expectedId === null) continue; // not an entry; nothing else applies
    checkFrontmatter(file, report);
    checkSections(file, report);
    checkRules(file, lib, report);
    checkRelationships(file, lib, report);
    if (kindOf(file) === "variant" && file.wordCount > MAX_WORDS) {
      report("length", file, 1, `the entry is ${file.wordCount} words; keep a variant to about ${MAX_WORDS} and split it instead of growing it`);
    }
    for (const fence of file.fences) {
      if (!NEUTRAL_FENCES.has(fence.lang)) {
        report("language-specific", file, fence.line, `the code fence declares "${fence.lang}"; entries are language-neutral, so use no language, text or pseudocode`);
      }
    }
  }
  checkCycles(lib, report);
  checkRegistry(lib, report);

  const order = RULES.map((rule) => rule.name);
  findings.sort(
    (a, b) =>
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      order.indexOf(a.rule) - order.indexOf(b.rule),
  );
  const count = (severity) => findings.filter((finding) => finding.severity === severity).length;
  return { findings, summary: { errors: count("error"), warnings: count("warning"), info: count("info") } };
}
