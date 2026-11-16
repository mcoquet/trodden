---
type: concern
id: logging
sources: [owasp-logging, otel-semconv, 12factor-logs]
---
# Logging

Recording events from a running system so humans and machines can understand what happened.

## Forces

- Logs must be queryable at scale, so structure beats prose.
- Logs must never leak secrets or personal data.
- Some events (who did what, when) carry legal or compliance weight and must not be lost or altered.
- Log volume costs money and slows down incident response.

## Variants

| Variant | Use when | File |
|---|---|---|
| Structured | Services whose logs are aggregated and queried | [structured](structured.md) |
| Audit trail | Security- or compliance-relevant actions must be provable | planned |

The variants can be combined: most regulated services need both structured logs for operations and an audit trail for compliance.

## Related

requires: [correlation-ids] · see also: [error-handling]

## Out of scope

Metrics and distributed tracing, which belong to the `observability` concern.
