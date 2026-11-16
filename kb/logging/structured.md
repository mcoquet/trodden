---
type: variant
concern: logging
id: logging/structured
sources: [owasp-logging, otel-semconv, 12factor-logs]
---
# Structured logging

Use when: services whose logs are aggregated and queried.

## Rules

- MUST emit machine-parseable structured events (JSON, one event per line). [otel-semconv]
- MUST write the event stream to stdout and leave routing and storage to the environment. [12factor-logs]
- MUST NOT log secrets, session tokens, passwords or personal data; mask or omit them. [owasp-logging]
- MUST include a timestamp, severity and a correlation or trace identifier on every event. [otel-semconv]
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

requires: [correlation-ids] · alternative: [logging/audit-trail]
