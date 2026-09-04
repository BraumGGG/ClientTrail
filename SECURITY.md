# Security Policy

## Test-only control surfaces

Client Test may add WebDriver, CDP or native automation entry points to a test build. These controls must be limited to localhost and must never be enabled in a production build.

Tauri projects use the `client-test` Cargo feature. Release pipelines should fail if the feature, test plugins, remote debugging flags or reset endpoints are present in the production artifact.

## Evidence handling

Evidence is written under `.client-test/artifacts`. Logs are redacted by default, but screenshots, database snapshots and application-specific files may still contain sensitive data. Do not upload artifacts to public issues without review.

## Reporting

Report security issues privately through GitHub Security Advisories. Do not include credentials, production data or unreleased binaries in an issue.
