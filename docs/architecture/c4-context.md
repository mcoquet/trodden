# System context

```mermaid
C4Context
  title System context: trodden
  %% See docs/adr/0001-library-ships-inside-the-skill.md

  Person(dev, "Developer", "Asks a coding agent for a change to their project")
  Person(author, "Entry author", "Writes and maintains entries in a library")
  Person(maintainer, "Maintainer", "Runs the eval by hand")
  System_Ext(agent, "Coding agent", "Any agent harness that supports skills, such as Claude Code")
  System(trodden, "trodden", "A sourced library of engineering practices, with a skill and a query script")

  Rel(dev, agent, "Asks for a change", "Prompt")
  Rel(agent, trodden, "Looks up entries before writing code", "Local command")
  Rel(author, trodden, "Adds entries and lints them", "Local command")
  Rel(maintainer, trodden, "Starts an eval run", "Local command")
  Rel(trodden, agent, "Runs eval tasks and judge prompts through", "Headless CLI")
```

- A **developer** never touches trodden directly. Their agent consults it.
- trodden reaches nothing over the network when an agent queries it. Only the eval drives an agent, and through it a model.
