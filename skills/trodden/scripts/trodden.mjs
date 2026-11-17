#!/usr/bin/env node
// trodden: list, fetch and lint the entries of a library.

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadLibrary, listIndex, resolve, UnknownIdError, LibraryNotFoundError } from "./lib/library.mjs";
import { lint } from "./lib/lint.mjs";
import { renderList, renderGet, renderEntry, renderFindings } from "./lib/render.mjs";

const DEFAULT_LIBRARY = fileURLToPath(new URL("../library", import.meta.url));
const FORMAT_REFERENCE = fileURLToPath(new URL("../references/format.md", import.meta.url));

const USAGE = `Usage: node trodden.mjs <command> [options]

Commands:
  list [<area or concern id>]   Show the index: one line per concern and variant
  get <id>...                   Print entries in full, with what they require and their sources
  lint [<library path>]         Check that a library follows the entry format
  spec                          Print the entry format reference

Options:
  --library <path>   Use another library (default: the one shipped with this skill)
  --json             list, get: print JSON instead of markdown
  --format <f>       lint: json (default) or text
  --help             Show this help
`;

class UsageError extends Error {}
class BrokenEntryError extends Error {
  constructor(path) {
    super(`${path} cannot be loaded: run the lint command to see why`);
  }
}

function parseArgs(argv) {
  const args = { positional: [], json: false, help: false, library: null, format: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--library" || arg === "--format") {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) throw new UsageError(`${arg} needs a value`);
      args[arg.slice(2)] = value;
    } else if (arg.startsWith("--")) throw new UsageError(`unknown option: ${arg}`);
    else args.positional.push(arg);
  }
  return args;
}

// Entries the library holds but could not load; they are reported, not fatal.
function warnSkipped(lib, io) {
  for (const file of lib.files) {
    if (file.id === null || lib.entries.get(file.id) !== file) {
      io.stderr.write(`skipped ${file.path}: run lint\n`);
    }
  }
}

function runList(args, io) {
  if (args.positional.length > 1) throw new UsageError("list takes at most one id");
  const lib = loadLibrary(args.library ?? DEFAULT_LIBRARY);
  const index = listIndex(lib, args.positional[0]);
  warnSkipped(lib, io);
  io.stdout.write(args.json ? `${JSON.stringify({ entries: index }, null, 2)}\n` : renderList(index));
  return 0;
}

function runGet(args, io) {
  const ids = args.positional;
  if (ids.length === 0) throw new UsageError("get needs at least one id");
  const lib = loadLibrary(args.library ?? DEFAULT_LIBRARY);
  for (const id of ids) {
    const broken = lib.entries.has(id) ? null : lib.files.find((file) => file.expectedId === id);
    if (broken) throw new BrokenEntryError(broken.path);
  }
  const resolved = resolve(lib, ids);
  warnSkipped(lib, io);
  for (const entry of resolved.entries) {
    for (const rel of entry.relationships) {
      if (rel.kind === "requires" && !rel.planned && rel.target !== null && !lib.entries.has(rel.target)) {
        io.stderr.write(`${entry.id} requires ${rel.target}, which could not be loaded: run lint\n`);
      }
    }
  }
  if (args.json) {
    const entries = resolved.entries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      summary: entry.frontmatter.summary ?? "",
      requested: ids.includes(entry.id),
      markdown: renderEntry(lib, entry),
    }));
    io.stdout.write(`${JSON.stringify({ entries, sources: resolved.sources }, null, 2)}\n`);
  } else {
    io.stdout.write(renderGet(lib, resolved, ids));
  }
  return 0;
}

function runLint(args, io) {
  if (args.positional.length > 1) throw new UsageError("lint takes at most one library path");
  if (args.positional.length === 1 && args.library !== null) {
    throw new UsageError("give the library path once: as an argument or with --library");
  }
  const format = args.format ?? "json";
  if (format !== "json" && format !== "text") throw new UsageError(`unknown format: ${format}`);
  const report = lint(loadLibrary(args.positional[0] ?? args.library ?? DEFAULT_LIBRARY));
  io.stdout.write(format === "text" ? renderFindings(report) : `${JSON.stringify(report, null, 2)}\n`);
  return report.summary.errors > 0 ? 1 : 0;
}

function runSpec(args, io) {
  io.stdout.write(readFileSync(FORMAT_REFERENCE, "utf8"));
  return 0;
}

const COMMANDS = { list: runList, get: runGet, lint: runLint, spec: runSpec };

export function main(argv, io) {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      io.stdout.write(USAGE);
      return 0;
    }
    const [command, ...positional] = args.positional;
    if (command === undefined) throw new UsageError("no command given");
    if (!Object.hasOwn(COMMANDS, command)) throw new UsageError(`unknown command: ${command}`);
    return COMMANDS[command]({ ...args, positional }, io);
  } catch (err) {
    if (err instanceof UsageError) {
      io.stderr.write(`${err.message}\n\n${USAGE}`);
    } else if (err instanceof UnknownIdError) {
      io.stderr.write(`${err.message}\nRun the list command to see the ids that exist.\n`);
    } else if (err instanceof LibraryNotFoundError || err instanceof BrokenEntryError) {
      io.stderr.write(`${err.message}\n`);
    } else {
      throw err;
    }
    return 2;
  }
}

const invoked = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  process.exitCode = main(process.argv.slice(2), process);
}
