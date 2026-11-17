// Loads a library from disk. Every read of a library goes through
// loadLibrary, which is where a manifest filter would later apply.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEntry } from "./entry.mjs";
import { parseYamlSubset, YamlSubsetError } from "./yaml.mjs";

export class LibraryNotFoundError extends Error {
  constructor(root) {
    super(`no library at ${root}`);
    this.name = "LibraryNotFoundError";
    this.root = root;
  }
}

export class UnknownIdError extends Error {
  constructor(id) {
    super(`unknown id: ${id}`);
    this.name = "UnknownIdError";
    this.id = id;
  }
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function markdownFiles(root, dir = "") {
  const found = [];
  for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    const path = dir ? `${dir}/${item.name}` : item.name;
    if (item.isDirectory()) found.push(...markdownFiles(root, path));
    else if (item.name.endsWith(".md")) found.push(path);
  }
  return found;
}

function expectedIdFor(path) {
  const parts = path.split("/");
  if (parts.length !== 3) return null;
  const [area, concern, file] = parts;
  if (file === "_concern.md") return `${area}/${concern}`;
  return `${area}/${concern}/${file.slice(0, -".md".length)}`;
}

function loadSources(root) {
  const path = join(root, "sources.yaml");
  if (!existsSync(path)) return { sources: new Map(), sourcesError: "sources.yaml is missing" };
  try {
    const parsed = parseYamlSubset(readFileSync(path, "utf8"), { nested: true });
    const sources = new Map();
    for (const [id, value] of Object.entries(parsed)) {
      sources.set(id, typeof value === "object" && !Array.isArray(value) ? value : {});
    }
    return { sources, sourcesError: null };
  } catch (err) {
    if (!(err instanceof YamlSubsetError)) throw err;
    return { sources: new Map(), sourcesError: err.message };
  }
}

function isUsable(entry) {
  return (
    entry.frontmatter !== null &&
    entry.expectedId !== null &&
    entry.id === entry.expectedId &&
    typeof entry.frontmatter.summary === "string" &&
    (entry.type === "concern" || entry.type === "variant")
  );
}

export function loadLibrary(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new LibraryNotFoundError(root);

  const files = markdownFiles(root)
    .sort()
    .map((path) => {
      const parsed = parseEntry(readFileSync(join(root, path), "utf8"));
      const text = (value) => (typeof value === "string" ? value : null);
      return {
        ...parsed,
        path,
        expectedId: expectedIdFor(path),
        id: text(parsed.frontmatter?.id),
        type: text(parsed.frontmatter?.type),
      };
    });

  const entries = new Map(
    files
      .filter(isUsable)
      .sort(byId)
      .map((entry) => [entry.id, entry]),
  );
  return { root, ...loadSources(root), files, entries };
}

export function listIndex(lib, prefix) {
  const index = [...lib.entries.values()]
    .filter((entry) => !prefix || entry.id === prefix || entry.id.startsWith(`${prefix}/`))
    .map((entry) => ({ id: entry.id, type: entry.type, summary: entry.frontmatter.summary ?? "" }));
  if (prefix && index.length === 0) throw new UnknownIdError(prefix);
  return index;
}

export function variantsOf(lib, concernId) {
  return [...lib.entries.values()].filter(
    (entry) => entry.type === "variant" && entry.id.startsWith(`${concernId}/`),
  );
}

function sourceIdsOf(entry) {
  const declared = Array.isArray(entry.frontmatter.sources) ? entry.frontmatter.sources : [];
  return [...declared, ...entry.rules.flatMap((rule) => rule.sources)];
}

export function resolve(lib, ids) {
  const entries = [];
  const seen = new Set();
  const skipped = [];

  const requested = ids.map((id) => {
    const entry = lib.entries.get(id);
    if (!entry) throw new UnknownIdError(id);
    return entry;
  });
  // Requested entries come first, in the order asked, then what they require.
  for (const entry of requested) {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      entries.push(entry);
    }
  }
  const required = [];
  const follow = (entry) => {
    for (const rel of entry.relationships) {
      if (rel.kind !== "requires" || rel.planned || rel.target === null) continue;
      const target = lib.entries.get(rel.target);
      if (!target) {
        if (!skipped.includes(rel.target)) skipped.push(rel.target);
      } else if (!seen.has(target.id)) {
        seen.add(target.id);
        required.push(target);
        follow(target);
      }
    }
  };
  requested.forEach(follow);
  entries.push(...required);

  const sourceIds = [...new Set(entries.flatMap(sourceIdsOf))];
  const sources = sourceIds.map((id) => ({
    id,
    title: lib.sources.get(id)?.title ?? null,
    url: lib.sources.get(id)?.url ?? null,
  }));
  return { entries, sources, skipped };
}
