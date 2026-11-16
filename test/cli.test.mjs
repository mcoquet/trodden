import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../skills/trodden/scripts/trodden.mjs";
import { makeLibrary, validFiles, variantText } from "./helpers.mjs";

const skillDir = fileURLToPath(new URL("../skills/trodden", import.meta.url));

function run(...args) {
  let out = "";
  let err = "";
  const code = main(args, {
    stdout: { write: (s) => (out += s) },
    stderr: { write: (s) => (err += s) },
  });
  return { code, out, err };
}

const lib = makeLibrary(validFiles());
const brokenFiles = () => ({ ...validFiles(), "core/alpha/two.md": variantText({ id: "core/alpha/two", sources: ["src-b"], rules: ["MUST do B."] }) });
const brokenLib = makeLibrary(brokenFiles());

test("list prints one line per entry, variants indented under their concern", () => {
  const { code, out, err } = run("list", "--library", lib);
  assert.equal(code, 0);
  assert.equal(out, "core/alpha — Alpha concern.\n  core/alpha/one — Variant one.\n  core/alpha/two — Variant two.\n");
  assert.equal(err, "");
});

test("list narrows to a concern and prints JSON", () => {
  const { code, out } = run("list", "core/alpha", "--json", "--library", lib);
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(out), {
    entries: [
      { id: "core/alpha", type: "concern", summary: "Alpha concern." },
      { id: "core/alpha/one", type: "variant", summary: "Variant one." },
      { id: "core/alpha/two", type: "variant", summary: "Variant two." },
    ],
  });
});

test("list rejects an id that matches nothing", () => {
  const { code, err } = run("list", "nope", "--library", lib);
  assert.equal(code, 2);
  assert.match(err, /unknown id: nope/);
});

test("get prints a variant, what it requires, then the sources", () => {
  const { code, out } = run("get", "core/alpha/one", "--library", lib);
  assert.equal(code, 0);
  const positions = ["# One (core/alpha/one)", "MUST do A. [src-a]", "\n---\n", "Required by core/alpha/one:", "# Two (core/alpha/two)", "## Sources", "- src-a: Source A — https://example.com/a", "- src-b: Source B — https://example.com/b"].map((text) => out.indexOf(text));
  assert.ok(positions.every((p) => p >= 0), out);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.ok(!out.includes("type: variant"), "frontmatter is not printed");
});

test("get prints a concern with a generated variants table", () => {
  const { code, out } = run("get", "core/alpha", "--library", lib);
  assert.equal(code, 0);
  assert.ok(out.includes("# Alpha (core/alpha)"));
  assert.ok(out.includes("## Variants"));
  assert.ok(out.includes("| core/alpha/one | Variant one. | When X. |"));
  assert.ok(out.includes("| core/alpha/two | Variant two. | When X. |"));
});

test("get --json marks which entries were requested", () => {
  const { code, out } = run("get", "core/alpha/one", "--json", "--library", lib);
  assert.equal(code, 0);
  const parsed = JSON.parse(out);
  assert.deepEqual(
    parsed.entries.map((e) => [e.id, e.type, e.summary, e.requested]),
    [
      ["core/alpha/one", "variant", "Variant one.", true],
      ["core/alpha/two", "variant", "Variant two.", false],
    ],
  );
  assert.ok(parsed.entries[0].markdown.startsWith("# One (core/alpha/one)"));
  assert.deepEqual(parsed.sources[0], { id: "src-a", title: "Source A", url: "https://example.com/a" });
});

test("get rejects an unknown id and points to list", () => {
  const { code, out, err } = run("get", "core/nope", "--library", lib);
  assert.equal(code, 2);
  assert.equal(out, "");
  assert.match(err, /unknown id: core\/nope/);
  assert.match(err, /list/);
});

test("get needs at least one id", () => {
  assert.equal(run("get", "--library", lib).code, 2);
});

test("lint prints a JSON report and exits 0 when there are no errors", () => {
  const { code, out } = run("lint", lib);
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(out), { findings: [], summary: { errors: 0, warnings: 0, info: 0 } });
});

test("lint exits 1 when there are errors", () => {
  const { code, out } = run("lint", "--library", brokenLib);
  assert.equal(code, 1);
  assert.equal(JSON.parse(out).findings[0].rule, "uncited-must");
});

test("lint --format text prints one line per finding and a summary", () => {
  const { code, out } = run("lint", brokenLib, "--format", "text");
  assert.equal(code, 1);
  assert.match(out, /^error core\/alpha\/two\.md:\d+ uncited-must .+$/m);
  assert.match(out, /^1 error, 0 warnings, 0 info$/m);
});

test("lint exits 0 when there are only warnings and info", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = variantText({ id: "core/alpha/two", sources: ["src-b"], rules: ["MUST do B. [src-b]"], example: "```js\nx\n```" });
  assert.equal(run("lint", makeLibrary(files)).code, 0);
});

test("usage errors exit 2", () => {
  assert.equal(run("lint", lib, "--library", lib).code, 2);
  assert.equal(run("lint", "/no/such/dir").code, 2);
  assert.equal(run("lint", lib, "--format", "xml").code, 2);
  assert.equal(run("list", "--library").code, 2);
  assert.equal(run("list", "--nope", "--library", lib).code, 2);
  assert.equal(run("frobnicate").code, 2);
  const none = run();
  assert.equal(none.code, 2);
  assert.match(none.err, /Usage/);
});

test("--help prints usage and exits 0", () => {
  const { code, out } = run("--help");
  assert.equal(code, 0);
  for (const command of ["list", "get", "lint", "spec"]) assert.ok(out.includes(command));
});

test("spec prints the format reference", () => {
  const { code, out } = run("spec");
  assert.equal(code, 0);
  assert.equal(out, readFileSync(join(skillDir, "references/format.md"), "utf8"));
});

test("a broken entry does not stop list or get", () => {
  const files = validFiles();
  files["core/alpha/two.md"] = "# No frontmatter\n";
  const broken = makeLibrary(files);
  const listed = run("list", "--library", broken);
  assert.equal(listed.code, 0);
  assert.equal(listed.out, "core/alpha — Alpha concern.\n  core/alpha/one — Variant one.\n");
  assert.equal(listed.err, "skipped core/alpha/two.md: run lint\n");
  const got = run("get", "core/alpha/one", "--library", broken);
  assert.equal(got.code, 0);
  assert.ok(got.out.includes("# One (core/alpha/one)"));
  assert.match(got.err, /skipped core\/alpha\/two\.md: run lint/);
});

test("works from a copied skill folder, run from another directory", () => {
  const copy = join(mkdtempSync(join(tmpdir(), "trodden copy ")), "trodden");
  cpSync(skillDir, copy, { recursive: true });
  const result = spawnSync(process.execPath, [join(copy, "scripts/trodden.mjs"), "list"], { cwd: tmpdir(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^core\/logging — /m);
});

test("exits with the right code when run as a program", () => {
  const script = join(skillDir, "scripts/trodden.mjs");
  assert.equal(spawnSync(process.execPath, [script, "frobnicate"], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync(process.execPath, [script, "lint", brokenLib], { encoding: "utf8" }).status, 1);
});

test("real library lints clean", () => {
  const { code, out } = run("lint");
  assert.equal(code, 0);
  const { summary } = JSON.parse(out);
  assert.equal(summary.errors, 0);
  assert.equal(summary.warnings, 0);
});
