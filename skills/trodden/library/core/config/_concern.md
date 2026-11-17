---
type: concern
id: core/config
summary: Supplying the values that differ between deployments of the same code, such as addresses, credentials and limits.
sources: [12factor-config, owasp-secrets]
---
# Configuration

Supplying the values that differ between deployments of the same code.

## Forces

- The same build should run in every deployment, so what differs must live outside the code.
- Some values are secrets, and a secret that reaches source control or a log is compromised.
- A missing or malformed value is cheapest to find at startup and most expensive to find in the middle of a request.
- The simplest place to put a secret is not the safest one.

## Out of scope

Feature flags and settings that users change while the system runs.

## Related

- see also: core/logging
