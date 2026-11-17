---
type: concern
id: core/logging
summary: Recording events from a running system so people and machines can understand what happened.
sources: [owasp-logging, otel-semconv, 12factor-logs]
---
# Logging

Recording events from a running system so humans and machines can understand what happened.

## Forces

- Logs must be queryable at scale, so structure beats prose.
- Logs must never leak secrets or personal data.
- Some events (who did what, when) carry legal or compliance weight and must not be lost or altered.
- Log volume costs money and slows down incident response.
- Variants can be combined: most regulated services need both structured logs for operations and an audit trail for compliance.

## Out of scope

Metrics and distributed tracing, which belong to the `observability` concern.

## Related

- see also: core/errors
