# Client Test

AI-assisted deterministic testing for desktop clients.

Client Test separates AI exploration from regression execution:

```text
Skill -> MCP exploration -> recorded actions -> generated test
                                      |
                                      v
                          deterministic CLI + evidence
```

## Supported adapters

- Tauri 2: WebdriverIO Tauri Service, Windows/macOS test builds
- Electron: Playwright test runner
- Python: pytest
- Rust: cargo test
- Windows native: UI Automation command protocol
- macOS native: Accessibility helper protocol

## Quick Start

```powershell
pnpm install
pnpm exec tsx packages/cli/src/main.ts doctor --json
pnpm exec tsx packages/cli/src/main.ts setup --dry-run --json
```

After reviewing the setup plan:

```powershell
pnpm exec tsx packages/cli/src/main.ts setup --yes
pnpm exec tsx packages/cli/src/main.ts run --all --json
```

Explore through MCP:

```powershell
pnpm exec tsx packages/cli/src/main.ts mcp
```

## Safety model

- `setup` is dry-run by default.
- Setup paths must remain inside the project root.
- Test plugins are isolated behind a `client-test` Cargo feature.
- Release builds must not enable test features or diagnostics.
- Evidence redacts common tokens, cookies, authorization headers and secrets.
- AI diagnostics cannot change the original test status.

## Development

```powershell
pnpm exec tsc -b --pretty false
pnpm test
```

The Tauri fixture is under `fixtures/tauri-basic`. Platform E2E requires a working Rust registry and desktop automation permissions.
