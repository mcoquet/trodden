---
type: concern
id: core/errors
summary: Handling the failure of an operation the system depends on, such as a call to another service.
sources: [aws-retries, sre-cascading, azure-retry]
---
# Error handling

Deciding what a system does when an operation it depends on fails.

## Forces

- Many failures of remote calls are temporary, so trying again often works.
- Trying again adds load to a dependency that may be failing because it is overloaded.
- Repeating an operation is only safe when doing it twice has the same effect as doing it once.
- Someone is waiting for the result, and time spent recovering is time they wait.
- A failure that is hidden is harder to diagnose than one that is reported.

## Out of scope

Rejecting invalid input, which belongs to a validation concern.

## Related

- see also: core/logging
