---
type: overlay
language: js
extends: logging/structured
sources: [pino-docs]
---
# Structured logging: JavaScript / Node.js

## Library

Use **pino**. It emits newline-delimited JSON to stdout by default.

## Setup

```js
import pino from "pino";

export const logger = pino({
  base: { "service.name": process.env.SERVICE_NAME },
  redact: ["req.headers.authorization", "*.password", "*.token"],
});
```

## Usage

```js
logger.info({ order_id: id, amount: total }, "order.created");

const log = logger.child({ trace_id }); // per request
```

## Avoid

- `console.log(JSON.stringify(...))` as a logging strategy
- Pretty-printing transports in production (use `pino-pretty` only locally)
