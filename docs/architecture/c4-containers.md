# Containers

```mermaid
C4Container
  title Containers: trodden
  %% See docs/adr/0001-library-ships-inside-the-skill.md
  %% See docs/adr/0002-entries-are-language-neutral.md

  Person(author, "Entry author", "Writes and maintains entries")
  Person(maintainer, "Maintainer", "Runs the eval by hand")
  System_Ext(agent, "Coding agent", "Any agent harness that supports skills, such as Claude Code")

  System_Boundary(trodden, "trodden") {
    Container(skill, "Skill", "Markdown", "Tells the agent when to consult the library and what to do with the result")
    Container(script, "Query script", "Node.js", "Lists and fetches entries, lints a library, prints the format")
    ContainerDb(library, "Library", "Markdown and YAML files", "Entries and the source registry")
    Container(evals, "Eval runner", "Node.js", "Runs tasks with and without the skill and scores the result against MUST rules")
  }

  Rel(agent, skill, "Loads", "Skill discovery")
  Rel(agent, script, "Runs list and get", "Shell command")
  Rel(author, script, "Runs lint and spec", "Shell command")
  Rel(script, library, "Reads", "File system")
  Rel(maintainer, evals, "Starts a run", "Shell command")
  Rel(evals, script, "Reads the rules to score against", "Module import")
  Rel(evals, agent, "Runs tasks and judge prompts", "Headless CLI")
```

- The **skill**, the **query script** and the **library** ship together in one folder, `skills/trodden/`, which works wherever it is copied.
- The **eval runner** lives outside that folder, in `evals/`, and is not part of what an agent installs.
- The eval's judge is a model reached through the same coding agent command line, so there is one credential.
