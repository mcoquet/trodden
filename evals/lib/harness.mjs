// A harness runs one task through a coding agent and returns what changed.
//
//   Harness = { name, run({ task, model, withSkill }) → Promise<{ diff, events }> }
//
// `diff` is the change the agent made to the fixture project, as a git diff.
// `events` is the agent's event stream, used to see whether it called the query script.

export function stubHarness(fn) {
  return { name: "stub", run: async (request) => fn(request) };
}

// True when the agent ran a shell command that calls the query script.
export function detectScriptUse(events) {
  return events.some(
    (event) =>
      event?.type === "assistant" &&
      Array.isArray(event.message?.content) &&
      event.message.content.some(
        (block) =>
          block?.type === "tool_use" &&
          block.name === "Bash" &&
          typeof block.input?.command === "string" &&
          block.input.command.includes("trodden.mjs"),
      ),
  );
}
