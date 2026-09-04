# Tauri Client Testing Skill M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可公开发布的首个里程碑，提供独立 Core CLI、通用 Skill、Tauri 2 Windows/macOS 白盒适配器、后端测试适配器、统一证据包和基础 MCP 探索接口。

**Architecture:** 使用 pnpm workspace 管理 TypeScript 包。`@client-test/core` 定义协议与适配器注册表，`@client-test/cli` 提供确定性命令，平台适配器封装现有测试框架，`@client-test/mcp` 只把探索能力映射为 MCP 工具；Skill 通过 CLI 的 JSON 接口完成诊断、安装、运行和分析。

**Tech Stack:** Node.js 20+、TypeScript 5、pnpm 9、Vitest、Zod、Commander、execa、yaml、WebdriverIO、`@wdio/tauri-service`、Model Context Protocol TypeScript SDK、GitHub Actions。

## Global Constraints

- 首版支持 Tauri 2，运行平台为 Windows 和 macOS。
- MCP 只服务 AI 探索，不作为确定性回归的必经链路。
- 源码可修改时使用白盒模式；黑盒驱动不在 M1 实现。
- 测试插件只能存在于 Debug/Test 构建，Release 泄漏必须导致检查失败。
- CLI 的 JSON 模式只向 stdout 输出 JSON，日志写入 stderr。
- 所有文件删除行为只能发生在已解析的项目根目录或 `.client-test` 目录内。
- 默认不修改项目；`setup` 必须先展示计划，并在 `--yes` 后执行。
- 不自行实现 WebDriver、UI Automation 或 Accessibility 驱动。

---

## Planned File Structure

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
vitest.workspace.ts
packages/
  core/src/
    contracts.ts
    config.ts
    project-context.ts
    registry.ts
    evidence.ts
    redaction.ts
  cli/src/
    main.ts
    output.ts
    commands/doctor.ts
    commands/inspect.ts
    commands/setup.ts
    commands/run.ts
    commands/evidence.ts
    commands/mcp.ts
  adapter-tauri/src/
    index.ts
    detect.ts
    doctor.ts
    setup-plan.ts
    apply-setup.ts
    run.ts
    release-guard.ts
  adapter-backend/src/
    index.ts
    pytest.ts
    cargo-test.ts
  mcp/src/
    server.ts
    tools.ts
  skill/
    SKILL.md
fixtures/
  tauri-basic/
tests/
  contract/
  integration/
  security/
.github/workflows/ci.yml
docs/
  configuration.md
  security.md
  tauri.md
```

### Task 1: Workspace and Public Package Skeleton

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `packages/core/package.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/cli/package.json`
- Create: `packages/cli/src/main.ts`
- Test: `packages/cli/src/main.test.ts`

**Interfaces:**
- Produces: `client-test --version` and `client-test --help`.
- Produces: workspace scripts `build`, `test`, `lint`, and `typecheck`.

- [ ] **Step 1: Create a failing CLI smoke test**

```ts
import { describe, expect, it } from "vitest";
import { createCli } from "./main.js";

describe("client-test CLI", () => {
  it("registers the stable command surface", () => {
    const commandNames = createCli().commands.map((command) => command.name());
    expect(commandNames).toEqual([
      "doctor",
      "inspect",
      "setup",
      "run",
      "evidence",
      "mcp",
    ]);
  });
});
```

- [ ] **Step 2: Run the smoke test and verify failure**

Run: `pnpm vitest packages/cli/src/main.test.ts --run`

Expected: FAIL because `createCli` and the workspace configuration do not exist.

- [ ] **Step 3: Add the workspace and minimal CLI**

Implement `createCli(): Command` with Commander. Register all six commands with descriptions and placeholder handlers that throw `CommandNotImplementedError`; do not implement platform behavior in this task.

- [ ] **Step 4: Verify workspace commands**

Run: `pnpm install && pnpm typecheck && pnpm test`

Expected: all commands resolve, the smoke test passes, and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts packages/core packages/cli
git commit -m "chore: scaffold client testing workspace"
```

### Task 2: Stable Core Contracts and Exit Codes

**Files:**
- Create: `packages/core/src/contracts.ts`
- Create: `packages/core/src/errors.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/contracts.test.ts`

**Interfaces:**
- Produces: `TestAdapter`, `ProjectContext`, `DetectionResult`, `DoctorReport`, `SetupPlan`, `SetupResult`, `RunContext`, and `RunResult`.
- Produces: `ExitCode.Success = 0`, `Configuration = 2`, `TestFailure = 3`, `Internal = 4`.

- [ ] **Step 1: Write contract validation tests**

Test that `setupPlanSchema` rejects absolute paths outside `projectRoot`, requires a risk value, and rejects shell command strings in favor of argument arrays.

```ts
expect(() => setupPlanSchema.parse({
  projectRoot: "C:/repo",
  dependencies: [],
  filesToCreate: ["C:/outside/file.ts"],
  filesToModify: [],
  commands: [{ executable: "pnpm", args: ["install"] }],
  productionRisk: "none",
})).toThrow();
```

- [ ] **Step 2: Run the contract test and verify failure**

Run: `pnpm vitest packages/core/src/contracts.test.ts --run`

Expected: FAIL because the schemas do not exist.

- [ ] **Step 3: Implement discriminated Zod schemas and TypeScript types**

Define explicit result unions:

```ts
type RunStatus = "passed" | "failed" | "error";
type FailureKind =
  | "environment" | "build" | "launch" | "locator" | "timeout"
  | "assertion" | "backend" | "network" | "crash" | "security"
  | "unknown";
```

Commands must be represented as `{ executable: string; args: string[]; cwd: string }` and never as concatenated shell strings.

- [ ] **Step 4: Run contract and type tests**

Run: `pnpm vitest packages/core/src/contracts.test.ts --run && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: define stable adapter contracts"
```

### Task 3: Configuration Loading and Project Context

**Files:**
- Create: `packages/core/src/config.ts`
- Create: `packages/core/src/project-context.ts`
- Test: `packages/core/src/config.test.ts`
- Test: `packages/core/src/project-context.test.ts`

**Interfaces:**
- Produces: `loadConfig(projectRoot: string): Promise<ClientTestConfig>`.
- Produces: `createProjectContext(projectRoot: string): Promise<ProjectContext>`.
- Consumes: schemas from Task 2.

- [ ] **Step 1: Write tests for defaults and path containment**

Cover missing configuration, valid `client-test.config.yaml`, unsupported schema versions, symlink-resolved project roots, and artifact paths escaping the project.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest packages/core/src/config.test.ts packages/core/src/project-context.test.ts --run`

Expected: FAIL because loaders do not exist.

- [ ] **Step 3: Implement versioned YAML configuration**

Use this initial shape:

```yaml
version: 1
project:
  kind: tauri
  root: .
adapters:
  tauri:
    enabled: true
  pytest:
    enabled: auto
  cargoTest:
    enabled: auto
artifacts:
  directory: .client-test/artifacts
  redact: true
```

Resolve all paths with `realpath` where possible and reject paths outside `projectRoot`.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm vitest packages/core/src/config.test.ts packages/core/src/project-context.test.ts --run && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/config.ts packages/core/src/project-context.ts packages/core/src/*.test.ts
git commit -m "feat: load project configuration safely"
```

### Task 4: Adapter Registry and Capability Detection

**Files:**
- Create: `packages/core/src/registry.ts`
- Test: `packages/core/src/registry.test.ts`
- Create: `packages/adapter-tauri/package.json`
- Create: `packages/adapter-tauri/src/index.ts`
- Create: `packages/adapter-tauri/src/detect.ts`
- Test: `packages/adapter-tauri/src/detect.test.ts`

**Interfaces:**
- Produces: `AdapterRegistry.register(adapter)` and `AdapterRegistry.detectAll(context)`.
- Produces: `tauriAdapter` with id `tauri-2`.
- Consumes: `TestAdapter` and `ProjectContext`.

- [ ] **Step 1: Write registry ordering and Tauri detection tests**

Fixtures must cover Tauri 2 in `src-tauri/Cargo.toml`, Tauri 1 rejection, non-Tauri projects, npm/pnpm/yarn/bun lockfiles, and missing Rust toolchain metadata.

- [ ] **Step 2: Verify detection tests fail**

Run: `pnpm vitest packages/core/src/registry.test.ts packages/adapter-tauri/src/detect.test.ts --run`

Expected: FAIL because registry and detector do not exist.

- [ ] **Step 3: Implement deterministic detection**

Read structured TOML and JSON using parsers. Do not detect Tauri versions with regular expressions. Return evidence with the exact manifest path and detected dependency version.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest packages/core/src/registry.test.ts packages/adapter-tauri/src/detect.test.ts --run`

Expected: PASS with Tauri 2 confidence `1.0` and Tauri 1 marked unsupported.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/registry* packages/adapter-tauri
git commit -m "feat: detect Tauri 2 projects"
```

### Task 5: Doctor Command and Machine-Readable Output

**Files:**
- Create: `packages/adapter-tauri/src/doctor.ts`
- Create: `packages/cli/src/output.ts`
- Create: `packages/cli/src/commands/doctor.ts`
- Modify: `packages/cli/src/main.ts`
- Test: `packages/cli/src/commands/doctor.test.ts`

**Interfaces:**
- Produces: `runDoctor(options): Promise<DoctorReport>`.
- Consumes: adapter registry and Tauri detector.

- [ ] **Step 1: Write doctor output tests**

Assert that JSON mode contains `schemaVersion`, `project`, `platform`, `checks`, and `recommendedAdapters`; capture stdout and stderr separately and assert stdout parses as one JSON document.

- [ ] **Step 2: Verify the test fails**

Run: `pnpm vitest packages/cli/src/commands/doctor.test.ts --run`

Expected: FAIL because the command is not implemented.

- [ ] **Step 3: Implement checks**

Check Node.js 20+, package manager availability, Rust, Cargo, Tauri CLI, supported OS, writable artifact directory, and presence of Tauri 2 manifests. Return remediation commands as argument arrays without executing them.

- [ ] **Step 4: Verify human and JSON modes**

Run: `pnpm client-test doctor --json` and `pnpm client-test doctor`

Expected: JSON mode is parseable; human mode is concise; both produce exit code 2 when required tooling is missing.

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-tauri/src/doctor.ts packages/cli/src
git commit -m "feat: add project doctor command"
```

### Task 6: Safe Setup Planning and Idempotent Application

**Files:**
- Create: `packages/adapter-tauri/src/setup-plan.ts`
- Create: `packages/adapter-tauri/src/apply-setup.ts`
- Create: `packages/cli/src/commands/setup.ts`
- Test: `packages/adapter-tauri/src/setup-plan.test.ts`
- Test: `packages/adapter-tauri/src/apply-setup.test.ts`
- Test: `tests/security/path-containment.test.ts`

**Interfaces:**
- Produces: `createTauriSetupPlan(context): Promise<SetupPlan>`.
- Produces: `applyTauriSetupPlan(context, plan): Promise<SetupResult>`.
- Consumes: configuration and contracts from Tasks 2-3.

- [ ] **Step 1: Write dry-run, idempotency, and escape tests**

Cover clean Tauri project, existing WDIO config, repeated setup, conflicting dependency versions, `../` paths, directory symlinks, and an absolute path outside the project.

- [ ] **Step 2: Verify setup tests fail**

Run: `pnpm vitest packages/adapter-tauri/src/setup-plan.test.ts packages/adapter-tauri/src/apply-setup.test.ts tests/security/path-containment.test.ts --run`

Expected: FAIL because setup planning is not implemented.

- [ ] **Step 3: Implement structured manifest edits**

Use TOML and JSON parsers. Plan these changes only when absent:

- test-only Rust dependencies for the current official WDIO Tauri plugins;
- guarded plugin initialization in the Tauri builder;
- WDIO dev dependencies in the detected frontend package manager;
- `wdio.conf.ts` and `tests/e2e` scaffolding;
- `.client-test/` artifact ignore rules.

Do not overwrite an existing WDIO configuration. Return a conflict with exact file and field names.

- [ ] **Step 4: Enforce confirmation**

Implement `client-test setup --dry-run --json` and require `--yes` for non-interactive application. Interactive mode must print the full plan before asking for confirmation.

- [ ] **Step 5: Run setup twice against a fixture**

Run: `client-test setup --yes --project fixtures/tauri-basic` twice.

Expected: first run applies changes; second run reports zero changes.

- [ ] **Step 6: Commit**

```bash
git add packages/adapter-tauri/src packages/cli/src/commands/setup.ts tests/security
git commit -m "feat: add safe Tauri setup workflow"
```

### Task 7: Process Runner and Unified Evidence Package

**Files:**
- Create: `packages/core/src/process-runner.ts`
- Create: `packages/core/src/evidence.ts`
- Create: `packages/core/src/redaction.ts`
- Test: `packages/core/src/process-runner.test.ts`
- Test: `packages/core/src/evidence.test.ts`
- Test: `packages/core/src/redaction.test.ts`

**Interfaces:**
- Produces: `runProcess(spec, evidence): Promise<ProcessResult>`.
- Produces: `EvidenceSession.create(context)` and `EvidenceSession.finalize(result)`.
- Produces: `redactText(input: string): string`.

- [ ] **Step 1: Write timeout, cancellation, and redaction tests**

Cover success, non-zero exit, timeout with child-process cleanup, SIGINT forwarding, stdout/stderr capture, `Authorization` headers, cookies, common API key formats, and explicit redaction opt-out.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest packages/core/src/process-runner.test.ts packages/core/src/evidence.test.ts packages/core/src/redaction.test.ts --run`

Expected: FAIL because evidence APIs do not exist.

- [ ] **Step 3: Implement evidence lifecycle**

Create `.client-test/artifacts/<timestamp>-<random-id>/manifest.json` before launch. Write logs incrementally. Finalize atomically by writing a temporary result file and renaming it to `result.json`.

- [ ] **Step 4: Verify interrupted-run evidence**

Add a test that terminates a child process and asserts the manifest remains readable with status `interrupted`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/process-runner* packages/core/src/evidence* packages/core/src/redaction*
git commit -m "feat: collect deterministic test evidence"
```

### Task 8: Tauri WebdriverIO Runner

**Files:**
- Create: `packages/adapter-tauri/src/run.ts`
- Create: `packages/cli/src/commands/run.ts`
- Create: `fixtures/tauri-basic/tests/e2e/smoke.e2e.ts`
- Test: `packages/adapter-tauri/src/run.test.ts`
- Test: `tests/contract/run-result.test.ts`

**Interfaces:**
- Produces: `runTauriSuite(context, options): Promise<RunResult>`.
- Consumes: process runner and evidence session.

- [ ] **Step 1: Write runner command-construction tests**

Assert that the runner uses the detected package manager, passes a concrete WDIO config path, creates a run id, never enables CDP by default, and maps test failures to exit code 3.

- [ ] **Step 2: Verify runner tests fail**

Run: `pnpm vitest packages/adapter-tauri/src/run.test.ts tests/contract/run-result.test.ts --run`

Expected: FAIL because the runner is absent.

- [ ] **Step 3: Implement WDIO execution**

Invoke the project's local WDIO binary through the package manager. Capture JUnit/JSON results, frontend console output, backend logs, screenshots, and video when supported. Record unsupported evidence explicitly in `manifest.json`.

- [ ] **Step 4: Add a deterministic fixture test**

The fixture test must launch a Tauri 2 app, locate a button by accessible role and name, invoke it, verify rendered state, and verify one Tauri Command result. Do not use coordinates or arbitrary sleeps.

- [ ] **Step 5: Run on the local supported platform**

Run: `client-test run smoke --project fixtures/tauri-basic --json`

Expected: exit code 0 and a complete artifact manifest.

- [ ] **Step 6: Commit**

```bash
git add packages/adapter-tauri/src/run* packages/cli/src/commands/run.ts fixtures/tauri-basic tests/contract
git commit -m "feat: run Tauri tests through WebdriverIO"
```

### Task 9: Python and Rust Backend Adapters

**Files:**
- Create: `packages/adapter-backend/package.json`
- Create: `packages/adapter-backend/src/index.ts`
- Create: `packages/adapter-backend/src/pytest.ts`
- Create: `packages/adapter-backend/src/cargo-test.ts`
- Test: `packages/adapter-backend/src/pytest.test.ts`
- Test: `packages/adapter-backend/src/cargo-test.test.ts`

**Interfaces:**
- Produces: adapters `pytest` and `cargo-test`.
- Consumes: core contracts, process runner, and evidence collector.

- [ ] **Step 1: Write detection and command tests**

Detect pytest from `pyproject.toml`, `pytest.ini`, or test files; detect Cargo tests from `Cargo.toml`. Assert that user-specified commands remain argument arrays and working directories stay inside the project.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest packages/adapter-backend/src --run`

Expected: FAIL because adapters do not exist.

- [ ] **Step 3: Implement adapters**

pytest must request JUnit XML and preserve its exit status. Cargo must request JSON message format where supported and store raw output. Neither adapter installs Python or Rust automatically; `doctor` reports missing runtimes.

- [ ] **Step 4: Add aggregation behavior**

When UI and backend suites run together, the aggregate result fails if either suite fails and preserves both child results in `result.json`.

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-backend packages/core/src/registry.ts
git commit -m "feat: add backend test adapters"
```

### Task 10: Release Safety Guard

**Files:**
- Create: `packages/adapter-tauri/src/release-guard.ts`
- Create: `packages/cli/src/commands/inspect.ts`
- Test: `packages/adapter-tauri/src/release-guard.test.ts`
- Test: `tests/security/release-leak.test.ts`

**Interfaces:**
- Produces: `inspectReleaseSafety(context): Promise<ReleaseSafetyReport>`.
- Consumes: Tauri project context.

- [ ] **Step 1: Write unsafe-release fixtures**

Cover unconditional test-plugin dependencies, unconditional plugin registration, remote-debugging flags in production config, wildcard bind addresses, and test reset endpoints compiled without a feature guard.

- [ ] **Step 2: Verify safety tests fail**

Run: `pnpm vitest packages/adapter-tauri/src/release-guard.test.ts tests/security/release-leak.test.ts --run`

Expected: FAIL because the guard is absent.

- [ ] **Step 3: Implement static safety inspection**

Parse Cargo and Tauri configuration structurally. Inspect Rust source conservatively and report exact file and line evidence. Unknown dynamic registration must produce `warning`, not an unsupported claim of safety.

- [ ] **Step 4: Wire safety into inspect and run**

`client-test inspect --release --json` returns exit code 2 for confirmed leaks. `client-test run` refuses a release-mode run when confirmed leaks exist unless the user removes them; no bypass flag is provided in M1.

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-tauri/src/release-guard* packages/cli/src/commands/inspect.ts tests/security
git commit -m "feat: block test tooling from release builds"
```

### Task 11: Basic MCP Exploration Server

**Files:**
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/src/server.ts`
- Create: `packages/mcp/src/tools.ts`
- Create: `packages/cli/src/commands/mcp.ts`
- Test: `packages/mcp/src/tools.test.ts`
- Test: `tests/contract/mcp-cli-parity.test.ts`

**Interfaces:**
- Produces MCP tools: `project_status`, `app_launch`, `app_stop`, `ui_snapshot`, and `evidence_capture`.
- Consumes the same adapter registry and result schemas as the CLI.

- [ ] **Step 1: Write MCP schema and parity tests**

Assert all tools use strict input schemas, reject unknown fields, return adapter ids, and return the same project status structure as `client-test doctor --json`.

- [ ] **Step 2: Verify MCP tests fail**

Run: `pnpm vitest packages/mcp/src/tools.test.ts tests/contract/mcp-cli-parity.test.ts --run`

Expected: FAIL because the server does not exist.

- [ ] **Step 3: Implement stdio MCP server**

Use the official MCP TypeScript SDK. Route each tool through core services rather than spawning the CLI. `ui_snapshot` may expose only capabilities provided by the Tauri adapter; unsupported operations return structured capability errors.

- [ ] **Step 4: Test server lifecycle**

Start the stdio server, call `project_status`, stop it, and assert no child application remains running.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp packages/cli/src/commands/mcp.ts tests/contract/mcp-cli-parity.test.ts
git commit -m "feat: expose exploration tools over MCP"
```

### Task 12: Agent Skill

**Files:**
- Create: `skill/SKILL.md`
- Create: `skill/references/project-intake.md`
- Create: `skill/references/tauri-strategy.md`
- Create: `skill/references/failure-diagnosis.md`
- Test: `tests/skill/skill-contract.test.ts`

**Interfaces:**
- Produces a reusable Skill that invokes `client-test` commands.
- Consumes CLI JSON schemas and documented exit codes.

- [ ] **Step 1: Write static Skill contract tests**

Assert the Skill requires project-root confirmation, runs doctor before setup, displays setup plans before mutation, never routes regression through MCP, and reads evidence before diagnosing failures.

- [ ] **Step 2: Verify contract test fails**

Run: `pnpm vitest tests/skill/skill-contract.test.ts --run`

Expected: FAIL because `skill/SKILL.md` does not exist.

- [ ] **Step 3: Write the Skill workflow**

The Skill must implement this state sequence:

```text
intake -> doctor -> strategy -> setup-plan -> confirmation -> setup
       -> explore-or-run -> evidence -> deterministic-result -> diagnosis
```

It must ask the user to declare the technology stack, then verify the declaration against project manifests. Disagreement becomes a visible warning, not an automatic override.

- [ ] **Step 4: Add failure diagnosis rules**

Map deterministic failure kinds to relevant evidence files. The Skill must never change `failed` to `passed`; it may only add a diagnosis and remediation proposal.

- [ ] **Step 5: Commit**

```bash
git add skill tests/skill
git commit -m "feat: add universal client testing skill"
```

### Task 13: Windows and macOS CI Acceptance

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `fixtures/tauri-basic/README.md`
- Create: `docs/tauri.md`
- Test: `tests/integration/artifact-manifest.test.ts`

**Interfaces:**
- Produces required CI checks `unit-windows`, `unit-macos`, `tauri-e2e-windows`, and `tauri-e2e-macos`.
- Consumes the fixture and CLI from earlier tasks.

- [ ] **Step 1: Add artifact manifest acceptance tests**

Assert both platforms report the same schema, required metadata, explicit unsupported evidence entries, and redaction status.

- [ ] **Step 2: Add CI jobs**

Pin Node.js 20 and pnpm 9. Cache pnpm and Cargo directories. Run unit tests on both systems, then build and test the Tauri fixture. Upload `.client-test/artifacts` only on failure and set a finite retention period.

- [ ] **Step 3: Verify platform-specific setup**

Windows job must verify WebView2 availability. macOS job must document and apply required application automation permissions without weakening the runner globally.

- [ ] **Step 4: Run local non-platform checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml fixtures/tauri-basic/README.md docs/tauri.md tests/integration
git commit -m "ci: verify Tauri testing on Windows and macOS"
```

### Task 14: Public Documentation and Release Preparation

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `LICENSE`
- Create: `docs/configuration.md`
- Create: `docs/security.md`
- Modify: all package manifests
- Test: `tests/docs/commands.test.ts`

**Interfaces:**
- Produces install, quick-start, architecture, security, compatibility, and contribution documentation.

- [ ] **Step 1: Write executable documentation tests**

Extract shell commands from marked README blocks and verify `--help`, `doctor --json`, and `setup --dry-run --json` against the fixture.

- [ ] **Step 2: Write public documentation**

Document the white-box security model, production exclusion, exact CLI exit codes, generated files, supported Tauri versions, Windows/macOS requirements, evidence redaction, and removal procedure.

- [ ] **Step 3: Add package publication metadata**

Set repository, license, engines, files, bin, exports, and version fields consistently. Publish only compiled output, schemas, Skill files, and documentation; exclude fixtures and raw test artifacts.

- [ ] **Step 4: Run final verification**

Run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
```

Expected: all checks pass and package contents contain no `.client-test/artifacts`, fixture databases, tokens, or local paths.

- [ ] **Step 5: Commit**

```bash
git add README.md CONTRIBUTING.md SECURITY.md LICENSE docs packages tests/docs
git commit -m "docs: prepare first public milestone"
```

## Self-Review Results

- Spec coverage: M1 covers Core CLI, Tauri 2 Windows/macOS white-box execution, backend adapters, evidence, Skill, MCP exploration, setup installation and production safety. Electron and native black-box adapters remain explicitly assigned to later milestones in the approved design.
- Placeholder scan: implementation steps use concrete commands, interfaces, result types and expected behavior; no unspecified implementation placeholders remain.
- Type consistency: all commands and adapters consume the contracts defined in Task 2; MCP and Skill use the same registry and result schemas as the CLI.
- Residual risk: exact upstream WDIO Tauri plugin versions must be pinned when implementation begins because they may change after this plan date; `doctor` and setup tests must treat version compatibility as data rather than hard-coded assumptions spread across packages.

