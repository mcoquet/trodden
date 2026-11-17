---
type: variant
id: core/logging/structured
summary: Emit logs as machine-parseable events with consistent fields.
sources: [owasp-logging, otel-semconv, 12factor-logs]
---
# Structured logging

## Use when

Services whose logs are aggregated and queried.

## Rules

- MUST emit events in a structured, machine-parseable format, not free text. [owasp-logging]
- MUST write the event stream to stdout and leave routing and storage to the environment. [12factor-logs]
- MUST NOT log secrets, session tokens, passwords or personal data; mask or omit them. [owasp-logging]
- MUST record on every event when it happened, where, who was involved and what happened. [owasp-logging]
- SHOULD include a severity and an identifier that links all events of one request. [owasp-logging]
- SHOULD use JSON with one event per line.
- SHOULD use OpenTelemetry semantic convention names for common fields (`trace_id`, `service.name`). [otel-semconv]
- SHOULD name the event and pass values as fields (`order.created`) rather than interpolating them into a message string.
- SHOULD log an error once, where it is handled, not at every layer it passes through.

## Example

```
logger.info("order.created", { order_id: id, amount: total })
```

## Avoid

- String interpolation: `"Order " + id + " created"`
- Logging and re-throwing the same error at every layer
- Logging full request or response bodies by default

## Related

- requires: core/tracing/correlation-ids (planned)
- alternative: core/logging/audit-trail (planned)
