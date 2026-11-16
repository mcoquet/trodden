---
name: trodden
description: Use before writing or changing code that touches a cross-cutting concern such as logging, error handling, retries or configuration, to look up the established, sourced practice for it.
---
# trodden

A library of sourced engineering practices. Look up the relevant entries before you write the code, not after.

## Look it up

The query script is `scripts/trodden.mjs` in this skill's directory. Run it with `node`.

1. See what the library covers:

   ```
   node scripts/trodden.mjs list
   ```

2. Fetch every entry that applies to the task. A concern explains the forces and lists its variants with when each applies; a variant holds the rules.

   ```
   node scripts/trodden.mjs get core/logging
   node scripts/trodden.mjs get core/logging/structured
   ```

   `get` also returns the entries a variant requires, and the sources behind the rules.

3. Read the output in full before writing code.

If nothing in the list applies, carry on without it.

## Apply it

- Follow every `MUST` and `MUST NOT`.
- Treat every `SHOULD` and `SHOULD NOT` as the default. Depart from one only for a reason you can state.
- Entries name no language or library. Apply the rules with what the project already uses.
- If a concern offers several variants, pick the one whose "Use when" matches the project. If the project has already chosen, follow that.
- The project's own conventions and the user's instructions come first. If one conflicts with a `MUST`, say so and let the user decide.

## Report it

When you finish, name the entries you consulted and any rule you did not follow, with the reason.

## Writing entries

To add to the library, read the format with `node scripts/trodden.mjs spec` and check your work with `node scripts/trodden.mjs lint --format text`.
