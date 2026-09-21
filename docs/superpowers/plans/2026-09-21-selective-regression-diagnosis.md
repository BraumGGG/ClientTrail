# ClientTrail Selective Regression and Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加轻量选择性回归规则、单次完整回归升级门和基础设施失败下的 objective 分类校正。

**Architecture:** 测试选择由 Skill 基于契约与项目已有映射完成，Core 不实现项目依赖图。Core 只在运行级致命失败明确且 objective 缺少业务证据时做保守校正；Tauri adapter 生成结构化失败信号摘要。

**Tech Stack:** TypeScript 5.7、Zod、Vitest、Markdown Skill 契约。

## Global Constraints

- 不新增运行时依赖、自动重试、动态 timeout、质量评分或通用依赖图。
- 每个测试请求最多自动升级一次完整回归。
- 有业务阶段或证据引用的 assertion 不得被运行级失败覆盖。
- 正式被测项目保持只读。

---

### Task 1: 运行级失败信号和 objective 校正

**Files:**
- Modify: `packages/core/src/orchestration.ts`
- Modify: `packages/core/src/orchestration.test.ts`
- Modify: `packages/core/src/objective-results.ts`
- Modify: `packages/core/src/objective-results.test.ts`
- Modify: `packages/core/src/evidence.ts`
- Modify: `packages/core/src/contracts.ts`

**Interfaces:**
- Produces: `summarizeRunnerFailureSignals(input): RunnerFailureSummary | undefined`
- Produces: `reconcileObjectiveEvents(events, context): { events: ObjectiveEvent[]; warnings: string[] }`
- Consumes: 运行级 `failureKind`、`timedOut`、`signal`、stdout/stderr。

- [x] 编写失败测试，覆盖 runner timeout、首个不可信 assertion 成为根因、后续失败阻塞，以及显式业务 assertion 保留。
- [x] 实现失败信号摘要和保守 objective 校正。
- [x] 在 `EvidenceSession.finalize()` 中先校正事件再汇总，并将校正告警写入 evidence warnings。
- [x] 运行 Core 定向测试和 typecheck。

### Task 2: Tauri adapter 输出诊断摘要

**Files:**
- Modify: `packages/adapter-tauri/src/run.ts`
- Modify: `packages/adapter-tauri/src/run.test.ts`

**Interfaces:**
- Consumes: `summarizeRunnerFailureSignals()`。
- Produces: `RunResult.diagnosticSummary` 和 `result.json.diagnosticSummary`。

- [x] 编写包含 script timeout、ECONNREFUSED、channel closed、SIGTERM 的回归测试。
- [x] 在 WDIO 完成后生成并传入诊断摘要。
- [x] 运行 Tauri adapter 定向测试。

### Task 3: Skill 选择性回归规则

**Files:**
- Modify: `skill/SKILL.md`
- Modify: `skill/references/failure-diagnosis.md`
- Modify: `tests/skill-contract.test.ts`

**Interfaces:**
- Produces: 直接目标、共享边界补测、不确定条件、单次完整回归升级和停止条件。

- [x] 添加选择性回归默认流程和固定不确定条件。
- [x] 明确完整回归每个请求最多一次，失败后不自动重跑。
- [x] 明确缺少实例 provenance 和首个致命信号的报告格式。
- [x] 运行 Skill 契约测试和 quick validation。

### Task 4: 验证与系统 Skill 同步

**Files:**
- Update: `C:/Users/Redmi/.codex/skills/clienttrail-desktop-testing/`

- [x] 运行 `pnpm typecheck`、完整测试、契约测试和 `git diff --check`。
- [x] 将通过验证的 Skill 文件同步到系统 Skill 目录。
- [x] 对比源 Skill 和系统 Skill，确认内容一致。

## Self-Review

- 选择范围、固定不确定条件、单次升级和禁止自动重试均有 Skill 契约测试。
- 分类校正仅作用于没有业务阶段和证据的 assertion，避免吞掉真实业务失败。
- 诊断摘要只提取信号，不加入恢复、重试或动态预算。
- 新增字段在 Core、adapter 和测试中使用同一名称。
