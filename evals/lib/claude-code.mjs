// The real harness: runs a task through Claude Code in headless mode.
//
// Flags checked against `claude --help` (November 2026):
//   --print                      headless: answer and exit
//   --output-format stream-json  one JSON event per line (needs --verbose)
//   --setting-sources project    ignore the user's own settings, skills and plugins
//   --strict-mcp-config          no MCP servers
//   --permission-mode acceptEdits, --allowedTools ...   work unattended in the throwaway copy
//   --no-session-persistence     leave no session behind

import { execFile, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const AGENT_TIMEOUT_MS = 15 * 60 * 1000;
const JUDGE_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_OUTPUT = 64 * 1024 * 1024;
const MAX_DIFF_CHARS = 200_000;

// Runs a command, feeding it `input`, and resolves with what it printed.
export function runCommand(command, args, { cwd, input, timeout }) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, { cwd, timeout, maxBuffer: MAX_OUTPUT }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${command} failed: ${err.message}${stderr ? `\n${stderr.slice(-2000)}` : ""}`));
      else resolve(stdout);
    });
    // A command that exits before reading its input must fail this call, not the process.
    child.stdin?.on("error", () => {});
    child.stdin?.end(input ?? "");
  });
}

const claude = (args, options) => runCommand("claude", args, options);

function runClaude({ dir, prompt, model }) {
  const args = [
    "--print",
    "--model", model,
    "--output-format", "stream-json",
    "--verbose",
    "--setting-sources", "project",
    "--strict-mcp-config",
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Bash,Read,Edit,Write,Glob,Grep,Skill",
    "--no-session-persistence",
  ];
  return claude(args, { cwd: dir, input: prompt, timeout: AGENT_TIMEOUT_MS });
}

// The judge call: a plain completion with no tools, through the same CLI and credential.
export function claudeComplete(model, prompt) {
  const args = ["--print", "--model", model, "--output-format", "text", "--tools", "", "--setting-sources", "", "--strict-mcp-config", "--no-session-persistence"];
  return claude(args, { cwd: tmpdir(), input: prompt, timeout: JUDGE_TIMEOUT_MS });
}

export function parseEvents(stdout) {
  return stdout.split("\n").flatMap((line) => {
    if (line.trim() === "") return [];
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

const git = (dir, ...args) =>
  execFileSync("git", ["-c", "user.name=eval", "-c", "user.email=eval@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd: dir,
    encoding: "utf8",
    maxBuffer: MAX_OUTPUT,
  });

export function claudeCodeHarness({ skillDir, fixturesDir, runAgent = runClaude }) {
  return {
    name: "claude-code",
    async run({ task, model, withSkill }) {
      const fixture = join(fixturesDir, task.fixture);
      if (!existsSync(fixture)) throw new Error(`fixture not found: ${task.fixture}`);

      const dir = mkdtempSync(join(tmpdir(), `trodden-eval-${task.id}-`));
      cpSync(fixture, dir, { recursive: true });
      git(dir, "init", "--quiet");
      // The skill is part of the setup, not of the agent's change.
      // Nor are installed packages.
      appendFileSync(join(dir, ".git", "info", "exclude"), ".claude/\nnode_modules/\n");
      git(dir, "add", "--all");
      git(dir, "commit", "--quiet", "--message", "fixture");
      const fixtureCommit = git(dir, "rev-parse", "HEAD").trim();
      if (withSkill) cpSync(skillDir, join(dir, ".claude", "skills", "trodden"), { recursive: true });

      const stdout = await runAgent({ dir, prompt: task.prompt, model });
      git(dir, "add", "--all");
      // Compare with the fixture itself, so a change the agent committed still counts.
      const diff = git(dir, "diff", "--cached", fixtureCommit);
      if (diff.length > MAX_DIFF_CHARS) {
        throw new Error(`the change is too large to judge (${diff.length} characters)`);
      }
      return { diff, events: parseEvents(stdout) };
    },
  };
}
