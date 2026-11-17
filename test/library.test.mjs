import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadLibrary,
  listIndex,
  resolve,
  variantsOf,
  UnknownIdError,
  LibraryNotFoundError,
} from "../skills/trodden/scripts/lib/library.mjs";
import { makeLibrary, validFiles, variantText } from "./helpers.mjs";

const load = (files) => loadLibrary(makeLibrary(files));
const ids = (entries) => entries.map((e) => e.id);

test("loads every entry, keyed by id", () => {
  const lib = load(validFiles());
  assert.deepEqual([...lib.entries.keys()], ["core/alpha", "core/alpha/one", "core/alpha/two"]);
  assert.equal(lib.entries.get("core/alpha").type, "concern");
  assert.equal(lib.entries.get("core/alpha/one").path, "core/alpha/one.md");
  assert.equal(lib.entries.get("core/alpha/one").expectedId, "core/alpha/one");
  assert.equal(lib.sources.get("src-a").title, "Source A");
  assert.equal(lib.sourcesError, null);
});

test("lists the index sorted by id", () => {
  const lib = load(validFiles());
  assert.deepEqual(listIndex(lib), [
    { id: "core/alpha", type: "concern", summary: "Alpha concern." },
    { id: "core/alpha/one", type: "variant", summary: "Variant one." },
    { id: "core/alpha/two", type: "variant", summary: "Variant two." },
  ]);
});

test("narrows the index by area, concern or entry id", () => {
  const lib = load({
    ...validFiles(),
    "core/alphabet/_concern.md": validFiles()["core/alpha/_concern.md"].replace("core/alpha", "core/alphabet"),
  });
  assert.equal(listIndex(lib, "core").length, 4);
  assert.deepEqual(ids(listIndex(lib, "core/alpha")), ["core/alpha", "core/alpha/one", "core/alpha/two"]);
  assert.deepEqual(ids(listIndex(lib, "core/alpha/one")), ["core/alpha/one"]);
});

test("rejects an index prefix that matches nothing", () => {
  assert.throws(() => listIndex(load(validFiles()), "nope"), UnknownIdError);
});

test("resolves a variant with what it requires and their sources", () => {
  const r = resolve(load(validFiles()), ["core/alpha/one"]);
  assert.deepEqual(ids(r.entries), ["core/alpha/one", "core/alpha/two"]);
  assert.deepEqual(r.sources, [
    { id: "src-a", title: "Source A", url: "https://example.com/a" },
    { id: "src-b", title: "Source B", url: "https://example.com/b" },
  ]);
  assert.deepEqual(r.skipped, []);
});

test("includes each entry once", () => {
  const r = resolve(load(validFiles()), ["core/alpha/two", "core/alpha/one"]);
  assert.deepEqual(ids(r.entries), ["core/alpha/two", "core/alpha/one"]);
});

test("rejects a requested id that does not exist", () => {
  assert.throws(
    () => resolve(load(validFiles()), ["core/missing"]),
    (err) => err instanceof UnknownIdError && err.id === "core/missing",
  );
});

test("does not follow planned requirements", () => {
  const files = validFiles();
  files["core/alpha/one.md"] = variantText({ id: "core/alpha/one", related: ["requires: core/alpha/two (planned)"] });
  const r = resolve(load(files), ["core/alpha/one"]);
  assert.deepEqual(ids(r.entries), ["core/alpha/one"]);
  assert.deepEqual(r.skipped, []);
});

test("finds the variants of a concern", () => {
  assert.deepEqual(ids(variantsOf(load(validFiles()), "core/alpha")), ["core/alpha/one", "core/alpha/two"]);
});

test("rejects a library root that is not a directory", () => {
  assert.throws(() => loadLibrary("/no/such/dir"), LibraryNotFoundError);
});

test("ignores files that are not entries", () => {
  const lib = load({
    ...validFiles(),
    LICENSE: "x",
    ".DS_Store": "x",
    "core/notes.txt": "x",
    "core/alpha/.hidden.md": "x",
  });
  assert.deepEqual(lib.files.map((f) => f.path), ["core/alpha/_concern.md", "core/alpha/one.md", "core/alpha/two.md"]);
});

test("keeps a misplaced markdown file for the linter but out of the entries", () => {
  const lib = load({ ...validFiles(), "core/README.md": "# Hello\n" });
  const readme = lib.files.find((f) => f.path === "core/README.md");
  assert.equal(readme.expectedId, null);
  assert.equal(lib.entries.size, 3);
});

test("loads entries when the source registry is missing", () => {
  const lib = load({ ...validFiles(), "sources.yaml": null });
  assert.ok(lib.sourcesError);
  assert.equal(lib.sources.size, 0);
  assert.equal(lib.entries.size, 3);
});

test("reports an unparseable source registry", () => {
  const lib = load({ ...validFiles(), "sources.yaml": "not yaml" });
  assert.match(lib.sourcesError, /line 1/);
});

test("leaves out an entry whose id does not match its path", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = variantText({ id: "core/alpha/other" });
  const lib = load(files);
  assert.deepEqual([...lib.entries.keys()], ["core/alpha", "core/alpha/one"]);
  assert.equal(lib.files.length, 3);
});

test("still serves healthy entries when one entry is broken", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = "# No frontmatter\n";
  const lib = load(files);
  assert.deepEqual(ids(listIndex(lib)), ["core/alpha", "core/alpha/one"]);
  const r = resolve(lib, ["core/alpha/one"]);
  assert.deepEqual(ids(r.entries), ["core/alpha/one"]);
  assert.deepEqual(r.skipped, ["core/alpha/two"]);
});

test("terminates on a requires loop", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = variantText({ id: "core/alpha/two", related: ["requires: core/alpha/one"] });
  const r = resolve(load(files), ["core/alpha/one"]);
  assert.deepEqual(ids(r.entries), ["core/alpha/one", "core/alpha/two"]);
});

test("leaves out an entry whose summary is not a line of text", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = files["core/alpha/two.md"].replace("summary: Variant two.", "summary: [draft]");
  const lib = load(files);
  assert.deepEqual([...lib.entries.keys()], ["core/alpha", "core/alpha/one"]);
});
