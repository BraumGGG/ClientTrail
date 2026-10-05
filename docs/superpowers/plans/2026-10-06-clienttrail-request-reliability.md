# ClientTrail Request Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为一次 ClientTrail 测试请求提供可追溯的聚合结论、分阶段固定预算和更完整的结构化证据。

**Architecture:** suite 保持独立 EvidenceSession，通过 CLI 创建的 `requestRunId` 关联，并由请求目录中的 `aggregate-result.json` 形成总闭环。Core 承担通用状态、版本和证据校验，adapter 只实现各自阶段的事实提取。

**Tech Stack:** TypeScript、Commander、Vitest、cross-spawn、pnpm workspace。

## Global Constraints

- 正式被测项目保持只读，仅写 `.client-test` evidence。
- 不增加自动重试、动态预算、构建缓存或常驻服务。
- 保持 `--timeout` 兼容，新增 `--build-timeout` 默认 300000 ms。
- 每个任务先写失败测试，再写最小实现。

---

### Task 1: 请求级聚合与未配置状态

**Files:**
- Modify: `packages/core/src/contracts.ts`
- Modify: `packages/core/src/aggregate.ts`
- Test: `packages/core/src/aggregate.test.ts`
- Create: `packages/cli/src/run-request.ts`
- Test: `packages/cli/src/run-request.test.ts`
- Modify: `packages/cli/src/main.ts`
- Modify: `packages/adapter-tauri/src/run.ts`
- Test: `packages/adapter-tauri/src/run.test.ts`

**Interfaces:**
- Produces: `requestRunId`, `capability_not_configured`, `writeAggregateResult(...)` 和聚合 `blocked` 状态。

- [x] 写聚合优先级、原子落盘和 preflight blocked 的失败测试。
- [x] 运行相关 Vitest，确认测试失败。
- [x] 实现请求标识传播、选择范围、聚合结果及退出码。
- [x] 运行相关 Vitest，确认通过。

### Task 2: Tauri 分阶段预算与进程树终止

**Files:**
- Modify: `packages/core/src/process-runner.ts`
- Test: `packages/core/src/process-runner.test.ts`
- Modify: `packages/core/src/contracts.ts`
- Modify: `packages/adapter-tauri/src/run.ts`
- Test: `packages/adapter-tauri/src/run.test.ts`
- Modify: `packages/cli/src/main.ts`

**Interfaces:**
- Consumes: Task 1 的 adapter 运行选项。
- Produces: `buildTimeoutMs`、`testTimeoutMs`、`buildCompletedNearTimeout` 和进程树终止结果。

- [x] 写双预算和子进程树终止失败测试。
- [x] 运行相关 Vitest，确认测试失败。
- [x] 实现 `--build-timeout`、阶段预算和跨平台进程树终止。
- [x] 运行相关 Vitest，确认通过。

### Task 3: Cargo 摘要、证据版本与 provenance

**Files:**
- Modify: `packages/core/src/contracts.ts`
- Modify: `packages/core/src/evidence.ts`
- Modify: `packages/core/src/objective-results.ts`
- Test: `packages/core/src/evidence.test.ts`
- Modify: `packages/adapter-backend/src/cargo-test.ts`
- Test: `packages/adapter-backend/src/backend.test.ts`
- Modify: `packages/adapter-electron/src/run.ts`
- Modify: `packages/adapter-native/src/run.ts`
- Modify: `packages/adapter-backend/src/pytest.ts`
- Modify: `packages/adapter-tauri/src/run.ts`

**Interfaces:**
- Produces: `producerVersion`、`adapterVersion`、`testSummary`、规范事件兼容读取和明确 PID 字段。

- [x] 写 Cargo 统计、旧事件结构和实例事实缺失的失败测试。
- [x] 运行相关 Vitest，确认测试失败。
- [x] 实现最小解析与证据增强。
- [x] 运行相关 Vitest，确认通过。

### Task 4: 文档、Skill 同步与发布验证

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `skill/CHANGELOG.md`
- Modify: `skill/SKILL.md`
- Sync: `C:/Users/Redmi/.codex/skills/clienttrail-desktop-testing`

**Interfaces:**
- Consumes: Tasks 1-3 的最终行为。
- Produces: 与实现一致的仓库 Skill、系统 Skill 和发布记录。

- [x] 更新更新日志和 Skill 行为说明。
- [x] 运行 `pnpm typecheck`、`pnpm test`、`pnpm test:contract`。
- [x] 同步系统 Skill并比较目录内容。
- [ ] 检查 Git diff，提交并推送功能分支与 `main`。
