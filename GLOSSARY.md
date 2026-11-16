# trodden

A library of sourced, cross-cutting engineering practices, and the tooling that lets a coding agent look them up before it writes code.

## Language

### The library

**Library**:
A collection of entries with one source registry. The main library lives in this repo; a team can keep a private one in the same format.
_Avoid_: Knowledge base, KB, corpus, database

**Area**:
A top-level group of concerns within a library. `core` is the area for generic, cross-cutting practice.
_Avoid_: Module, category

**Concern**:
A cross-cutting topic that a project has to deal with, such as logging or configuration. It states the forces at play and groups the variants that address them.
_Avoid_: Topic, pattern, module

**Variant**:
One established way of addressing a concern, with criteria for when it applies and the rules for doing it well. Where reputable sources support different approaches, each is its own variant.
_Avoid_: Pattern, option, recipe

**Entry**:
A single file in a library: either a concern or a variant.
_Avoid_: Document, page, article

**Rule**:
One statement in a variant that an agent can follow and a reviewer can check. A rule is either a MUST or a SHOULD.
_Avoid_: Guideline, best practice

**MUST**:
A rule that is a requirement, backed by at least one cited source.
_Avoid_: Required, mandatory

**SHOULD**:
A rule that is a strong recommendation, to be followed unless there is a good reason not to. A source is optional.
_Avoid_: Recommended, nice to have

**Source**:
A reputable published reference that supports a rule, identified by a short id.
_Avoid_: Citation, reference, link

**Source registry**:
The single list of a library's sources. Every source id used in an entry resolves here.
_Avoid_: Bibliography

**Relationship**:
A declared link from one entry to another: `requires`, `refines`, `conflicts-with`, `alternative` or `see also`.
_Avoid_: Dependency, link

### The tooling

**Skill**:
The packaged instructions that tell a coding agent when to consult the library and how.

**Query script**:
The program the skill calls to list and fetch entries, so the agent gets exactly the right ones without browsing files.
_Avoid_: CLI, tool

**Linter**:
The check that an entry follows the entry format. It judges form only, never whether the practice is good.
_Avoid_: Validator, checker

**Finding**:
One result reported by the linter: a rule name, a severity, a location and a message.
_Avoid_: Error, violation

**Eval**:
A run that compares what an agent produces with and without the skill, scored against the MUST rules of the relevant variants.
_Avoid_: Benchmark, test

### Not yet built

**Manifest**:
A file in a consuming project that narrows the library to the parts that project uses and records which variants it chose.
_Avoid_: Config

**Pack**:
A named selection of entries that can be adopted together.
_Avoid_: Bundle, preset

**Overlay**:
An addition to a variant that pins the library and idioms for one programming language.
_Avoid_: Binding, adapter
