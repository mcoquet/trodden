---
type: variant
id: core/errors/retry-backoff
summary: Retry a failed remote call a limited number of times, waiting longer and less predictably before each attempt.
sources: [aws-retries, sre-cascading, azure-retry]
---
# Retry with backoff

## Use when

A call to another service, a database or a network resource can fail for temporary reasons, and repeating it is safe.

## Rules

- MUST retry only failures that may succeed on a later attempt, and report permanent failures such as invalid input or rejected credentials straight away. [aws-retries, sre-cascading, azure-retry]
- MUST limit the number of attempts, and pass the failure to the caller once the limit is reached. [aws-retries, sre-cascading, azure-retry]
- MUST retry only operations that are safe to repeat; make an operation idempotent before adding retries to it. [aws-retries, azure-retry]
- MUST wait before each new attempt, and grow that wait exponentially. [aws-retries, sre-cascading]
- MUST add randomness (jitter) to each wait, so that many clients do not retry at the same moment. [aws-retries, sre-cascading]
- MUST set a timeout on every remote call that is retried. [aws-retries]
- MUST retry at one layer of a call path only; the layers below it fail fast. [aws-retries, sre-cascading, azure-retry]
- SHOULD cap the wait at a maximum. [aws-retries]
- SHOULD limit retries overall with a budget, so they stop when the dependency is struggling. [aws-retries, sre-cascading]
- SHOULD log a failure that will be retried at a low severity, and only the final failure as an error. [azure-retry]

## Example

```
attempt = 1
loop:
  result = call(operation, timeout)
  if result.ok: return result
  if not result.transient or attempt == MAX_ATTEMPTS: fail(result)
  wait(random(0, min(MAX_WAIT, BASE_WAIT * 2 ^ attempt)))
  attempt = attempt + 1
```

## Avoid

- Retrying every error, including ones that can never succeed
- Retrying without a limit, or with no wait between attempts
- A fixed wait shared by every client, so that they all retry together
- Retrying a payment, a message send or another non-idempotent operation
- Retries stacked at several layers, which multiply the number of attempts

## Related

- see also: core/logging/structured
