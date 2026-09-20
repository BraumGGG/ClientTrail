# ClientTrail Lightweight Reliability Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ClientTrail 增加唯一 runId、结构化目标失败事件、最小 evidence 闭环和实际运行事实，同时保持 Skill/CLI 轻量且不引入通用测试平台能力。

**Architecture:** `EvidenceSession` 继续作为每次运行的身份和 evidence 所有者；`CommandSpec.env` 将同一 runId 注入所有子进程；Core 使用小型目标事件汇总器检查冻结契约；adapter 只提供进程事实并消费最终化后的真实状态。Skill 只保留三条执行门，不承担运行时状态机。

**Tech Stack:** TypeScript 5.7、Zod、Vitest、Node.js `child_process`/`fs/promises`、现有 pnpm workspace。

## Global Constraints

- 不新增运行时依赖、常驻服务、数据库或自定义 reporter SDK。
- 不实现通用依赖图、故障注入矩阵、Provider 录制回放、动态 timeout 或全量 provenance。
- 正式被测项目保持只读；运行写入仅限配置的 evidence 目录和测试框架既有输出目录。
- `EvidenceSession` 是 `runId` 的唯一创建者；adapter、测试框架和应用实例不得自行生成替代 runId。
- 缺少 required objective 终态时不得返回 `passed`。
- 空日志可以存在，但必须在 manifest 中标记为 `empty`；未生成的日志必须标记为 `not-produced`。
- 修改保持向后兼容：未提供测试契约时，现有无契约运行仍以执行器退出状态为主。
- 每个任务仅修改与该能力直接相关的文件，并在提交前运行定向测试与 `pnpm typecheck`。

---

## File Structure

- `packages/core/src/contracts.ts`：为结构化命令增加可选环境变量，扩展 `RunResult` 最小汇总字段。
- `packages/core/src/process-runner.ts`：无 shell 地合并并传递命令环境变量。
- `packages/core/src/objective-results.ts`：定义目标事件、运行事实和 required objective 汇总逻辑。
- `packages/core/src/evidence.ts`：记录目标事件、运行事实、文件状态并执行最小闭环最终化。
- `packages/core/src/index.ts`：导出新增公共接口。
- `packages/adapter-*/src/run.ts`：注入统一运行环境、记录 runner 事实并返回最终化后的状态。
- `skill/SKILL.md`：将重复说明收敛成三条可执行可靠性门。
- `tests/skill-contract.test.ts`：锁定轻量 evidence closure 行为。

---

### Task 1: 子进程环境变量安全传播

**Files:**
- Modify: `packages/core/src/contracts.ts:11`
- Modify: `packages/core/src/process-runner.ts:15`
- Modify: `packages/core/src/contracts.test.ts`
- Modify: `packages/core/src/process-runner.test.ts`

**Interfaces:**
- Produces: `CommandSpec.env?: Record<string, string>`
- Consumes: 现有 `runProcess(spec, options)` 调用方式不变。

- [ ] **Step 1: 为结构化命令环境变量写失败测试**

在 `packages/core/src/contracts.test.ts` 增加：

```ts
it("accepts explicit child environment variables", () => {
  const parsed = commandSpecSchema.parse({
    executable: "node",
    args: ["script.js"],
    cwd: "C:/repo",
    env: { CLIENT_TEST_RUN_ID: "run-123" },
  });
  expect(parsed.env).toEqual({ CLIENT_TEST_RUN_ID: "run-123" });
});
```

同时把导入改为：

```ts
import { commandSpecSchema, setupPlanSchema } from "./contracts.js";
```

- [ ] **Step 2: 运行 schema 测试并确认失败**

Run: `pnpm vitest run packages/core/src/contracts.test.ts`

Expected: FAIL，因为 `commandSpecSchema` 当前会剥离或不接受 `env`。

- [ ] **Step 3: 扩展 CommandSpec schema**

在 `packages/core/src/contracts.ts` 中将 schema 改为：

```ts
export const commandSpecSchema = z.object({
  executable: z.string().min(1),
  args: z.array(z.string()),
  cwd: z.string().min(1),
  env: z.record(z.string()).optional(),
});
```

- [ ] **Step 4: 为进程环境传播写失败测试**

在 `packages/core/src/process-runner.test.ts` 增加：

```ts
it("merges explicit environment variables into the child process", async () => {
  const result = await runProcess({
    executable: process.execPath,
    args: ["-e", "process.stdout.write(process.env.CLIENT_TEST_RUN_ID || '')"],
    cwd: process.cwd(),
    env: { CLIENT_TEST_RUN_ID: "run-123" },
  });
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe("run-123");
});
```

- [ ] **Step 5: 运行进程测试并确认失败**

Run: `pnpm vitest run packages/core/src/process-runner.test.ts`

Expected: FAIL，子进程未收到 `CLIENT_TEST_RUN_ID`。

- [ ] **Step 6: 合并环境变量且保持无 shell 执行**

在 `packages/core/src/process-runner.ts` 创建子进程时使用：

```ts
const child = crossSpawn(spec.executable, spec.args, {
  cwd: spec.cwd,
  env: spec.env ? { ...process.env, ...spec.env } : process.env,
  windowsHide: true,
  shell: false,
});
```

- [ ] **Step 7: 验证 Task 1**

Run: `pnpm vitest run packages/core/src/contracts.test.ts packages/core/src/process-runner.test.ts`

Expected: 两个测试文件全部通过。

Run: `pnpm typecheck`

Expected: PASS。

- [ ] **Step 8: 提交 Task 1**

```bash
git add packages/core/src/contracts.ts packages/core/src/contracts.test.ts packages/core/src/process-runner.ts packages/core/src/process-runner.test.ts
git commit -m "feat: propagate structured child environments"
```

---

### Task 2: 目标事件和 required objective 汇总

**Files:**
- Create: `packages/core/src/objective-results.ts`
- Create: `packages/core/src/objective-results.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `ObjectiveEvent`, `ObjectiveEventInput`, `RuntimeInstanceFacts`, `ObjectiveSummary`
- Produces: `summarizeObjectiveEvents(contract, events): ObjectiveSummary`
- Consumes: `TestContract`、`FailureKind`。

- [ ] **Step 1: 编写缺失目标和阻塞传播测试**

创建 `packages/core/src/objective-results.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import type { TestContract } from "./contracts.js";
import { objectiveEventSchema, summarizeObjectiveEvents } from "./objective-results.js";

const contract: TestContract = {
  contractVersion: 1,
  objectives: [
    { id: "launch", description: "launch", required: true },
    { id: "share", description: "share", required: true },
    { id: "optional", description: "optional", required: false },
  ],
  preconditions: [],
  requiredCapabilities: [],
  optionalDegradations: [],
  passCriteria: [],
  failCriteria: [],
  blockedCriteria: [],
};

describe("objective results", () => {
  it("uses the latest terminal event and marks missing required objectives not_executed", () => {
    const summary = summarizeObjectiveEvents(contract, [
      { runId: "run-1", objectiveId: "launch", state: "started", at: "2026-09-20T00:00:00.000Z" },
      { runId: "run-1", objectiveId: "launch", state: "passed", at: "2026-09-20T00:00:01.000Z" },
    ]);
    expect(summary.objectives).toEqual([
      expect.objectContaining({ id: "launch", state: "passed", required: true }),
      expect.objectContaining({ id: "share", state: "not_executed", required: true }),
    ]);
    expect(summary.counts).toEqual({ passed: 1, failed: 0, blocked: 0, notExecuted: 1 });
    expect(summary.allRequiredPassed).toBe(false);
  });

  it("preserves the blocking root id", () => {
    const summary = summarizeObjectiveEvents(contract, [
      { runId: "run-1", objectiveId: "launch", state: "failed", failureKind: "launch", at: "2026-09-20T00:00:01.000Z" },
      { runId: "run-1", objectiveId: "share", state: "blocked", blockedBy: "launch", at: "2026-09-20T00:00:02.000Z" },
    ]);
    expect(summary.objectives.find((item) => item.id === "share")?.blockedBy).toBe("launch");
    expect(summary.counts).toEqual({ passed: 0, failed: 1, blocked: 1, notExecuted: 0 });
  });

  it("rejects blocked events without blockedBy", () => {
    expect(() => objectiveEventSchema.parse({
      runId: "run-1",
      objectiveId: "share",
      state: "blocked",
      at: "2026-09-20T00:00:00.000Z",
    })).toThrow();
  });
});
```

- [ ] **Step 2: 运行新测试并确认模块缺失**

Run: `pnpm vitest run packages/core/src/objective-results.test.ts`

Expected: FAIL，`objective-results.ts` 尚不存在。

- [ ] **Step 3: 实现最小事件 schema 和汇总器**

创建 `packages/core/src/objective-results.ts`，公共接口固定为：

```ts
import { z } from "zod";
import type { FailureKind, TestContract } from "./contracts.js";

export const objectiveStateSchema = z.enum(["started", "passed", "failed", "blocked", "not_executed"]);

export const objectiveEventSchema = z.object({
  runId: z.string().min(1),
  objectiveId: z.string().min(1),
  state: objectiveStateSchema,
  at: z.string().datetime(),
  phase: z.string().optional(),
  failureKind: z.enum([
    "environment", "build", "launch", "locator", "timeout",
    "assertion", "backend", "network", "crash", "security",
    "adapter", "evidence_incomplete", "unknown",
  ]).optional(),
  blockedBy: z.string().optional(),
  instanceId: z.string().optional(),
  sessionId: z.string().optional(),
  message: z.string().optional(),
  evidence: z.array(z.string()).optional(),
}).superRefine((event, context) => {
  if (event.state === "blocked" && !event.blockedBy) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["blockedBy"], message: "blocked objective events require blockedBy" });
  }
});

export type ObjectiveEvent = z.infer<typeof objectiveEventSchema>;
export type ObjectiveEventInput = Omit<ObjectiveEvent, "runId" | "at"> & { at?: string };

export interface RuntimeInstanceFacts {
  instanceId: string;
  binaryPath?: string;
  pid?: number;
  webdriverOrCdpPort?: number;
  appDataDirectory?: string;
  sessionId?: string;
}

export interface ObjectiveOutcome {
  id: string;
  required: boolean;
  state: "passed" | "failed" | "blocked" | "not_executed";
  failureKind?: FailureKind;
  blockedBy?: string;
  message?: string;
  evidence?: string[];
}

export interface ObjectiveSummary {
  objectives: ObjectiveOutcome[];
  counts: { passed: number; failed: number; blocked: number; notExecuted: number };
  allRequiredPassed: boolean;
}

export function summarizeObjectiveEvents(contract: TestContract, events: ObjectiveEvent[]): ObjectiveSummary {
  const terminal = new Map<string, ObjectiveEvent>();
  for (const event of events) {
    if (event.state !== "started") terminal.set(event.objectiveId, event);
  }
  const objectives = contract.objectives
    .filter((objective) => objective.required || terminal.has(objective.id))
    .map<ObjectiveOutcome>((objective) => {
      const event = terminal.get(objective.id);
      if (!event) return { id: objective.id, required: objective.required, state: "not_executed" };
      return {
        id: objective.id,
        required: objective.required,
        state: event.state as ObjectiveOutcome["state"],
        failureKind: event.failureKind,
        blockedBy: event.blockedBy,
        message: event.message,
        evidence: event.evidence,
      };
    });
  const counts = {
    passed: objectives.filter((item) => item.state === "passed").length,
    failed: objectives.filter((item) => item.state === "failed").length,
    blocked: objectives.filter((item) => item.state === "blocked").length,
    notExecuted: objectives.filter((item) => item.state === "not_executed").length,
  };
  return {
    objectives,
    counts,
    allRequiredPassed: objectives.filter((item) => item.required).every((item) => item.state === "passed"),
  };
}
```

- [ ] **Step 4: 导出公共接口**

在 `packages/core/src/index.ts` 增加：

```ts
export * from "./objective-results.js";
```

- [ ] **Step 5: 验证 Task 2**

Run: `pnpm vitest run packages/core/src/objective-results.test.ts`

Expected: 3 tests PASS。

Run: `pnpm typecheck`

Expected: PASS。

- [ ] **Step 6: 提交 Task 2**

```bash
git add packages/core/src/objective-results.ts packages/core/src/objective-results.test.ts packages/core/src/index.ts
git commit -m "feat: summarize contract objective outcomes"
```

---

### Task 3: EvidenceSession 最小闭环和运行事实

**Files:**
- Modify: `packages/core/src/evidence.ts`
- Modify: `packages/core/src/evidence.test.ts`
- Modify: `packages/core/src/contracts.ts:31`

**Interfaces:**
- Produces: `EvidenceSession.childEnvironment(): Record<string, string>`
- Produces: `EvidenceSession.recordObjective(input: ObjectiveEventInput): Promise<void>`
- Produces: `EvidenceSession.recordRuntimeInstance(facts: RuntimeInstanceFacts): Promise<void>`
- Produces: `EvidenceSession.finalize(...): Promise<EvidenceFinalization>`
- Produces: `RunResult.objectiveSummary?`、`RunResult.evidenceWarnings?`

- [ ] **Step 1: 写 runId、目标闭环和空日志测试**

扩展 `packages/core/src/evidence.test.ts`，保留现有脱敏测试并增加：

```ts
it("exposes one child environment for the whole evidence session", async () => {
  const root = await mkdtemp(join(tmpdir(), "evidence-env-"));
  const session = await EvidenceSession.create(await createProjectContext(root));
  expect(session.childEnvironment()).toEqual({
    CLIENT_TEST_RUN_ID: session.runId,
    CLIENT_TEST_ARTIFACT_DIR: session.directory,
  });
});

it("blocks a nominally passing run when a required objective has no terminal event", async () => {
  const root = await mkdtemp(join(tmpdir(), "evidence-objective-"));
  const context = await createProjectContext(root);
  const contract = validateTestContract({
    contractVersion: 1,
    objectives: [
      { id: "launch", description: "launch", required: true },
      { id: "share", description: "share", required: true },
    ],
    preconditions: [], requiredCapabilities: [], optionalDegradations: [],
    passCriteria: [], failCriteria: [], blockedCriteria: [],
  });
  const session = await EvidenceSession.create(context, contract);
  await session.recordObjective({ objectiveId: "launch", state: "passed" });
  await session.write("stdout.log", "");
  await session.write("stderr.log", "");
  const finalized = await session.finalize("passed", { exitCode: 0 });

  expect(finalized.status).toBe("blocked");
  expect(finalized.failureKind).toBe("evidence_incomplete");
  expect(finalized.objectiveSummary?.counts.notExecuted).toBe(1);
  expect(finalized.evidenceWarnings).toContain("stdout.log is empty");

  const manifest = JSON.parse(await readFile(join(session.directory, "manifest.json"), "utf8"));
  expect(manifest.files["stdout.log"].status).toBe("empty");
});

it("records runtime instance facts in the final result", async () => {
  const root = await mkdtemp(join(tmpdir(), "evidence-runtime-"));
  const session = await EvidenceSession.create(await createProjectContext(root));
  await session.recordRuntimeInstance({ instanceId: "runner", pid: 1234, binaryPath: "node" });
  const finalized = await session.finalize("passed", { exitCode: 0 });
  expect(finalized.runtimeInstances).toEqual([{ instanceId: "runner", pid: 1234, binaryPath: "node" }]);
});
```

增加导入：

```ts
import { validateTestContract } from "./test-contract.js";
```

- [ ] **Step 2: 运行 evidence 测试并确认失败**

Run: `pnpm vitest run packages/core/src/evidence.test.ts`

Expected: FAIL，新增方法和返回值尚不存在。

- [ ] **Step 3: 扩展 RunResult 最小字段**

在 `packages/core/src/contracts.ts` 中扩展 `RunResult`：

```ts
import type { ObjectiveSummary } from "./objective-results.js";

export interface RunResult {
  status: RunStatus;
  failureKind?: FailureKind;
  runId?: string;
  artifactDirectory?: string;
  exitCode?: number | null;
  objectiveSummary?: ObjectiveSummary;
  evidenceWarnings?: string[];
}
```

- [ ] **Step 4: 在 EvidenceSession 中保存轻量状态**

在 `packages/core/src/evidence.ts` 增加：

```ts
import type { FailureKind, ProjectContext, RunStatus, TestContract } from "./contracts.js";
import {
  objectiveEventSchema,
  summarizeObjectiveEvents,
  type ObjectiveEvent,
  type ObjectiveEventInput,
  type ObjectiveSummary,
  type RuntimeInstanceFacts,
} from "./objective-results.js";

export interface EvidenceFinalization {
  status: RunStatus | "interrupted";
  failureKind?: FailureKind;
  objectiveSummary?: ObjectiveSummary;
  evidenceWarnings: string[];
  runtimeInstances: RuntimeInstanceFacts[];
}
```

类内新增字段：

```ts
private objectiveEvents: ObjectiveEvent[] = [];
private runtimeInstances = new Map<string, RuntimeInstanceFacts>();
private files: Record<string, { status: "produced" | "empty" | "not-produced"; bytes?: number; reason?: string }> = {};
```

- [ ] **Step 5: 实现统一子进程环境和事件记录**

在 `EvidenceSession` 中新增：

```ts
childEnvironment(): Record<string, string> {
  return {
    CLIENT_TEST_RUN_ID: this.runId,
    CLIENT_TEST_ARTIFACT_DIR: this.directory,
  };
}

async recordObjective(input: ObjectiveEventInput): Promise<void> {
  const event = objectiveEventSchema.parse({
    ...input,
    runId: this.runId,
    at: input.at ?? new Date().toISOString(),
  }) as ObjectiveEvent;
  this.objectiveEvents.push(event);
  await this.write("objective-events.json", this.objectiveEvents);
}

async recordRuntimeInstance(facts: RuntimeInstanceFacts): Promise<void> {
  this.runtimeInstances.set(facts.instanceId, facts);
  await this.write("runtime-instances.json", [...this.runtimeInstances.values()]);
}

markNotProduced(name: string, reason: string): void {
  this.files[name] = { status: "not-produced", reason };
}
```

- [ ] **Step 6: 让 write 记录 produced/empty 状态**

在 `write` 中计算 UTF-8 大小并更新 `files`：

```ts
const bytes = Buffer.byteLength(content, "utf8");
this.files[name] = { status: bytes === 0 ? "empty" : "produced", bytes };
await writeFile(join(this.directory, name), this.redact ? redactText(content) : content, "utf8");
```

创建和最终更新 `manifest.json` 时不要调用会把 manifest 自己加入 `files` 的公共 `write`；增加私有 `writeManifest(value)` 直接执行脱敏后的 `writeFile`。

- [ ] **Step 7: 实现最终状态收敛**

将 `finalize` 返回 `EvidenceFinalization`。状态规则使用以下最小逻辑：

```ts
const objectiveSummary = this.contract
  ? summarizeObjectiveEvents(this.contract, this.objectiveEvents)
  : undefined;
const requiredFailed = objectiveSummary?.objectives.some((item) => item.required && item.state === "failed") ?? false;
const requiredIncomplete = objectiveSummary?.objectives.some((item) => item.required && (item.state === "blocked" || item.state === "not_executed")) ?? false;

let finalStatus = status;
let failureKind = details.failureKind as FailureKind | undefined;
if (status === "passed" && requiredFailed) finalStatus = "failed";
if (status === "passed" && !requiredFailed && requiredIncomplete) finalStatus = "blocked";
if (status === "passed" && objectiveSummary && !objectiveSummary.allRequiredPassed) {
  failureKind ??= "evidence_incomplete";
}

const evidenceWarnings = Object.entries(this.files).flatMap(([name, file]) =>
  file.status === "empty" ? [`${name} is empty`]
    : file.status === "not-produced" ? [`${name} was not produced: ${file.reason}`]
      : []);
```

`result.json` 和最终 `manifest.json` 都必须包含：

```ts
{
  objectiveSummary,
  evidenceWarnings,
  runtimeInstances: [...this.runtimeInstances.values()],
}
```

方法最后返回：

```ts
return {
  status: finalStatus,
  failureKind,
  objectiveSummary,
  evidenceWarnings,
  runtimeInstances: [...this.runtimeInstances.values()],
};
```

- [ ] **Step 8: 验证 Task 3**

Run: `pnpm vitest run packages/core/src/evidence.test.ts packages/core/src/objective-results.test.ts`

Expected: PASS。

Run: `pnpm typecheck`

Expected: PASS。

- [ ] **Step 9: 提交 Task 3**

```bash
git add packages/core/src/contracts.ts packages/core/src/evidence.ts packages/core/src/evidence.test.ts
git commit -m "feat: enforce minimal evidence closure"
```

---

### Task 4: 将统一运行身份接入全部 adapter

**Files:**
- Modify: `packages/adapter-tauri/src/run.ts`
- Modify: `packages/adapter-tauri/src/run.test.ts`
- Modify: `packages/adapter-electron/src/run.ts`
- Modify: `packages/adapter-native/src/run.ts`
- Modify: `packages/adapter-native/src/native.test.ts`
- Modify: `packages/adapter-backend/src/pytest.ts`
- Modify: `packages/adapter-backend/src/cargo-test.ts`
- Modify: `packages/adapter-backend/src/backend.test.ts`

**Interfaces:**
- Consumes: `EvidenceSession.childEnvironment()`、`recordRuntimeInstance()`、`finalize()` 返回值。
- Produces: 所有 adapter 的 `RunResult.status/failureKind/objectiveSummary/evidenceWarnings` 与落盘结果一致。

- [ ] **Step 1: 写 adapter 环境传播集成测试**

在 `packages/adapter-native/src/native.test.ts` 增加：

```ts
it("propagates the evidence run id into the configured command", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "client-test-native-env-"));
  const result = await runNativeSuite({
    projectRoot,
    platform: process.platform,
    files: [],
    config: {
      version: 1,
      project: { root: "." },
      adapters: {
        native: {
          enabled: true,
          command: {
            executable: process.execPath,
            args: ["-e", "process.stdout.write(process.env.CLIENT_TEST_RUN_ID || '')"],
          },
        },
      },
      artifacts: { directory: ".client-test/artifacts", redact: true },
    },
  });
  expect(result.status).toBe("passed");
  const stdout = await readFile(join(result.artifactDirectory!, "native.stdout.log"), "utf8");
  expect(stdout).toBe(result.runId);
});
```

- [ ] **Step 2: 运行 native 测试并确认失败**

Run: `pnpm vitest run packages/adapter-native/src/native.test.ts`

Expected: FAIL，adapter 尚未注入 evidence 环境。

- [ ] **Step 3: 为每个执行命令注入同一环境**

所有创建了 `EvidenceSession` 的 adapter 在 `runProcess` 的 `CommandSpec` 中增加：

```ts
env: session.childEnvironment(),
```

适用位置：

- Tauri build 和 WDIO run；
- Electron Playwright run；
- Native suite command；
- pytest；
- cargo test。

`runNativeOperation()` 不创建 EvidenceSession，保持原状。

- [ ] **Step 4: 记录 runner 的最小实际事实**

每个 adapter 在得到 `ProcessResult` 后执行：

```ts
await session.recordRuntimeInstance({
  instanceId: "adapter-runner",
  binaryPath: executable,
  pid: result.pid,
});
```

Cargo 和 pytest 使用各自实际 executable；Tauri 最终 WDIO 进程覆盖 build 进程记录。此任务不把 runner PID 宣称为应用 PID。

- [ ] **Step 5: 使用 finalize 返回的真实状态**

将以下模式：

```ts
await session.finalize(status, details);
return { status, failureKind, runId: session.runId, artifactDirectory: session.directory };
```

统一改为：

```ts
const finalized = await session.finalize(status, details);
return {
  status: finalized.status === "interrupted" ? "error" : finalized.status,
  failureKind: finalized.failureKind ?? failureKind,
  runId: session.runId,
  artifactDirectory: session.directory,
  exitCode: result.exitCode,
  objectiveSummary: finalized.objectiveSummary,
  evidenceWarnings: finalized.evidenceWarnings,
};
```

构建失败、缺少配置等提前返回路径也必须使用 `finalized.status` 和 `finalized.failureKind`。

- [ ] **Step 6: 为 Tauri contract 缺失目标写回归测试**

在 `packages/adapter-tauri/src/run.test.ts` 的 preflight 测试中传入一个 required objective 契约，并验证环境失败仍保持 `error`，不会被 objective closure 降级覆盖：

```ts
const result = await runTauriSuite(context, {
  contract: {
    contractVersion: 1,
    objectives: [{ id: "launch", description: "launch", required: true }],
    preconditions: [], requiredCapabilities: [], optionalDegradations: [],
    passCriteria: [], failCriteria: [], blockedCriteria: [],
  },
});
expect(result.status).toBe("error");
expect(result.failureKind).toBe("environment");
```

- [ ] **Step 7: 为 backend 结果一致性增加断言**

在 `packages/adapter-backend/src/backend.test.ts` 的 Cargo 测试中增加：

```ts
expect(evidence.runId).toBe(result.runId);
expect(evidence.runtimeInstances).toEqual([
  expect.objectContaining({ instanceId: "adapter-runner", pid: expect.any(Number) }),
]);
```

- [ ] **Step 8: 验证所有 adapter**

Run: `pnpm vitest run packages/adapter-tauri/src/run.test.ts packages/adapter-native/src/native.test.ts packages/adapter-backend/src/backend.test.ts packages/adapter-electron/src/electron.test.ts`

Expected: PASS。

Run: `pnpm typecheck`

Expected: PASS。

- [ ] **Step 9: 提交 Task 4**

```bash
git add packages/adapter-tauri/src/run.ts packages/adapter-tauri/src/run.test.ts packages/adapter-electron/src/run.ts packages/adapter-native/src/run.ts packages/adapter-native/src/native.test.ts packages/adapter-backend/src/pytest.ts packages/adapter-backend/src/cargo-test.ts packages/adapter-backend/src/backend.test.ts
git commit -m "feat: bind adapters to one evidence run"
```

---

### Task 5: CLI、Skill 和发布契约收口

**Files:**
- Modify: `packages/cli/src/main.test.ts`
- Modify: `packages/core/src/aggregate.test.ts`
- Modify: `skill/SKILL.md:87-105`
- Modify: `tests/skill-contract.test.ts`
- Modify: `README.md:150-181`

**Interfaces:**
- Consumes: adapter 已返回的最终 `RunResult`。
- Produces: CLI JSON 中稳定暴露 `objectiveSummary` 和 `evidenceWarnings`；Skill 明确轻量闭环门。

- [ ] **Step 1: 锁定 CLI 命令面和 JSON 字段不被过滤**

在 `packages/cli/src/main.test.ts` 增加一个纯对象回归测试，确认 Commander 命令面不新增重型命令：

```ts
it("does not add a separate workflow or replay command", () => {
  const names = createCli().commands.map((command) => command.name());
  expect(names).not.toContain("workflow");
  expect(names).not.toContain("replay");
  expect(names).not.toContain("fault-matrix");
});
```

CLI `run` 继续直接 `JSON.stringify(aggregateResults(results))`，不得重建或删除 suite 内的 `objectiveSummary` 和 `evidenceWarnings`。

- [ ] **Step 2: 扩展 aggregate 回归测试**

在 `packages/core/src/aggregate.test.ts` 增加：

```ts
it("preserves objective summaries and evidence warnings from suites", () => {
  const suite = {
    status: "blocked" as const,
    failureKind: "evidence_incomplete" as const,
    objectiveSummary: {
      objectives: [{ id: "share", required: true, state: "not_executed" as const }],
      counts: { passed: 0, failed: 0, blocked: 0, notExecuted: 1 },
      allRequiredPassed: false,
    },
    evidenceWarnings: ["stdout.log is empty"],
  };
  const result = aggregateResults([suite]);
  expect(result.status).toBe("failed");
  expect(result.suites[0]).toBe(suite);
});
```

保持现有 aggregate 状态协议：suite 为 `blocked` 时总状态仍为 `failed`，不在本阶段扩展聚合状态机。

- [ ] **Step 3: 将 Skill 收敛为三条执行门**

在 `skill/SKILL.md` 的“回归结果质量规则”中保留现有安全边界，新增或替换重复段落为：

```markdown
- 每次运行只能有一个由 ClientTrail evidence session 创建的 `runId`。CLI 必须把它传给 adapter、测试框架和应用实例；项目测试不得另建无法关联的运行编号。
- 最终结论必须经过最小 evidence closure：required objective 均有 `passed/failed/blocked/not_executed` 终态，`manifest.json` 和 `result.json` 已最终化，退出码与目标汇总一致。缺少任一项时标记 `evidence_incomplete`，不得给出无条件通过。
- adapter 至少记录可获得的实际 runner 或实例事实，包括 executable、PID、端口、数据目录和 sessionId。字段无法取得时写明未产生原因；不得用配置中的期望值冒充实际值。
```

删除与这三条完全重复的句子，但保留 setup 隔离、失败分类、清理告警和多实例安全边界。

- [ ] **Step 4: 强化 Skill 契约测试**

在 `tests/skill-contract.test.ts` 增加：

```ts
it("requires one run id and a minimal evidence closure", () => {
  expect(skill).toContain("每次运行只能有一个");
  expect(skill).toContain("required objective");
  expect(skill).toContain("evidence_incomplete");
  expect(skill).toContain("不得用配置中的期望值冒充实际值");
});
```

- [ ] **Step 5: 更新 README 的结果说明**

在 `README.md` 的 CLI/evidence 说明附近增加一个短段落：

```markdown
每次 `client-test run` 只生成一个 `runId`。当提供测试契约时，required objective 必须全部获得终态；执行器退出码为 0 但目标或必需 evidence 缺失时，结果会标记为 `evidence_incomplete`，不会报告为无条件通过。
```

- [ ] **Step 6: 运行定向契约测试**

Run: `pnpm vitest run packages/cli/src/main.test.ts packages/core/src/aggregate.test.ts tests/skill-contract.test.ts`

Expected: PASS。

- [ ] **Step 7: 运行完整验证**

Run: `pnpm typecheck`

Expected: PASS。

Run: `pnpm test -- --pool=forks --maxWorkers=1`

Expected: 现有测试和新增测试全部通过；允许出现已知 Vitest WebSocket `Port is already in use` 警告，但退出码必须为 0。

Run: `pnpm test:contract -- --pool=forks --maxWorkers=1`

Expected: PASS。

- [ ] **Step 8: 检查范围和工作树**

Run: `git diff --check`

Expected: 无空白错误。

Run: `git status --short`

Expected: 只包含 Task 5 列出的文件。

- [ ] **Step 9: 提交 Task 5**

```bash
git add packages/cli/src/main.test.ts packages/core/src/aggregate.test.ts skill/SKILL.md tests/skill-contract.test.ts README.md
git commit -m "docs: enforce lightweight evidence reliability"
```

---

## Self-Review

### Spec Coverage

- 唯一 runId：Task 1、Task 3、Task 4。
- 结构化失败事件：Task 2、Task 3。
- required objective 最小闭环：Task 2、Task 3、Task 5。
- 实际运行事实：Task 3、Task 4。
- Skill 保持轻量：Task 5 明确不新增 workflow、replay 或 fault-matrix 命令。
- 空日志可见性：Task 3。
- 正式项目只读和无新增运行时依赖：Global Constraints 和 Task 5 契约测试。

### Scope Control

计划未包含依赖图执行、ScreenCast 专用恢复逻辑、视频像素算法、Provider replay、动态预算或完整 provenance。所有新增数据结构均服务于运行身份、目标终态、最小 evidence 和实际 runner 事实。

### Type Consistency

- `ObjectiveEventInput` 由 `objective-results.ts` 定义，并由 `EvidenceSession.recordObjective()` 消费。
- `ObjectiveSummary` 同时用于 `EvidenceFinalization` 和 `RunResult.objectiveSummary`。
- `EvidenceSession.finalize()` 的真实状态由所有 adapter 返回，不保留 adapter 本地推断的旧状态。
- `CommandSpec.env` 始终为 `Record<string, string>`，不会把 `undefined` 传给 Zod 或 `cross-spawn`。
