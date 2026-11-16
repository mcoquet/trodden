---
type: variant
id: core/config/environment
summary: Read deployment-specific values from environment variables, check them at startup, and keep secrets out of code and logs.
sources: [12factor-config, owasp-secrets]
---
# Configuration from the environment

## Use when

A service is deployed to more than one place, and the platform it runs on can set environment variables for each deployment.

## Rules

- MUST keep every value that differs between deployments out of the code. [12factor-config]
- MUST read those values from environment variables. [12factor-config]
- MUST NOT group values into named environments such as "staging" in the codebase; set each value on its own for each deployment. [12factor-config]
- MUST NOT hard-code credentials in source code or commit them to version control. [12factor-config, owasp-secrets]
- MUST NOT write secret values to logs; mask them where a log line would include them. [owasp-secrets]
- SHOULD read and check all configuration once, at startup, and stop with an error that names the missing or invalid variable.
- SHOULD read the environment in one place and pass typed values to the rest of the code.
- SHOULD fetch secrets from a dedicated secret store where one is available, because environment variables can be read by other processes and can end up in dumps. [owasp-secrets]
- SHOULD give each credential the least privilege it needs, and rotate it. [owasp-secrets]
- SHOULD be able to make the codebase public at any moment without exposing a credential. [12factor-config]

## Example

```
config = load_at_startup({
  DATABASE_URL: required, secret
  PORT:         optional, integer, default 8080
})
# a missing DATABASE_URL stops the process: "DATABASE_URL is not set"
start_server(config.PORT, connect(config.DATABASE_URL))
```

## Avoid

- Files such as `config.production` checked into the repository
- A default value for a credential
- Reading environment variables throughout the code
- Printing the whole configuration at startup, secrets included

## Related

- see also: core/logging/structured
