# Contributing

## Checks

Run before opening a pull request:

```powershell
pnpm install --ignore-scripts
pnpm exec tsc -b --pretty false
pnpm test
```

Platform-specific changes should include a fixture or adapter contract test. Do not use screenshots or coordinates when a semantic selector or accessibility property is available.

## Changes to adapters

Keep platform behavior inside its adapter. Core contracts must remain platform-neutral. New capabilities should be reported explicitly and return a structured capability error when unsupported.
