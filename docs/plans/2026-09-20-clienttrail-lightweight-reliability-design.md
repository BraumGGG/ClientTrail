# ClientTrail 轻量可靠性核心设计说明

## 背景与目标

ClientTrail 已能调用现有桌面测试框架执行 Tauri、Electron、原生客户端和后端测试，但真实双实例运行暴露出一个关键问题：测试能够运行，不代表输出已经足够可信、可关联和可诊断。

本设计不扩展为重型测试平台，只增加四项通用且低成本的可靠性能力：

1. 一次运行只使用一个 `runId`；
2. 每个失败目标都产生结构化失败事件；
3. required objective 与最终结果形成最小闭环；
4. evidence 记录少量实际运行事实，而不是只记录计划值。

成功标准：

- CLI、测试框架、adapter、应用实例和 evidence 使用同一 `runId`；
- required objective 不会在时间线中无声消失；
- `run:finished` 不能替代 `passed/failed/blocked/error` 最终状态；
- 缺少必需证据时输出 `evidence_incomplete`，不得给出无条件通过；
- 多实例运行至少记录二进制、PID、端口、数据目录和 sessionId；
- 不引入新的常驻服务、数据库、录制平台或通用工作流引擎。

## 现状与约束

当前 `EvidenceSession` 能创建并最终化 `manifest.json` 和 `result.json`，Tauri adapter 也能保存 WDIO stdout/stderr。但项目专用测试可以绕开这些能力，自行生成时间线和截图，导致多个不一致的运行标识、缺失的失败事件、空日志和无法闭合的 required objective。

项目约束：

- Skill 保持薄层，只负责选择策略、解释结论和执行可靠性门；
- CLI/Core 只实现通用可靠性，不理解 ScreenCast 等项目业务字段；
- adapter 负责提供平台实际运行事实；
- 不要求所有平台一次性实现完整 provenance；
- 保持正式被测项目只读，运行产物仅写入 evidence 目录；
- 使用现有 TypeScript、Zod、Vitest 和 JSON evidence 模型，不引入新运行时依赖。

## 方案对比

### 方案一：继续增强 Skill 文本

- 优点：实现成本最低。
- 缺点：规则无法阻止测试遗漏失败事件、错误关联 runId 或输出不完整证据；真实帮助有限。

### 方案二：轻量可靠性核心

- 优点：用少量通用代码解决运行身份、失败丢失、结果闭环和实例事实问题；适用于所有 adapter；不会演变成测试平台。
- 缺点：不能自动解决项目专用业务流程和平台特有自动化问题。

### 方案三：完整测试编排平台

- 优点：可覆盖依赖图、故障注入、录制回放、质量评分和复杂 provenance。
- 缺点：实现和维护成本高，偏离当前轻量 Skill/CLI 定位。

## 推荐方案

采用方案二。可靠性核心只提供统一数据结构、生命周期钩子和最终校验；测试执行继续交给 Playwright、WebdriverIO、Accessibility、pytest 和 cargo test，项目专用恢复流程继续留在项目测试代码中。

## 详细设计

### 架构

```text
CLI 生成 runId
  -> 通过环境变量和 RunContext 传给 adapter
  -> adapter 传给测试框架和应用实例
  -> 测试事件写入同一 EvidenceSession
  -> finalizer 校验 required objective 和必需文件
  -> 输出 passed / failed / blocked / error / evidence_incomplete
```

### 1. 唯一 runId

`EvidenceSession` 仍是 runId 的唯一创建者。adapter 启动子进程时注入 `CLIENT_TEST_RUN_ID` 和 `CLIENT_TEST_ARTIFACT_DIR`。测试配置和测试代码只能读取该值，不得自行生成第二个运行标识。

若外部测试没有消费注入的 runId，CLI 仍保存其 stdout/stderr，但在最终结果中增加运行关联告警，不尝试猜测目录映射。

### 2. 结构化目标事件

Core 新增最小事件模型：

```ts
type ObjectiveState = "started" | "passed" | "failed" | "blocked" | "not_executed";

interface ObjectiveEvent {
  runId: string;
  objectiveId: string;
  state: ObjectiveState;
  at: string;
  phase?: string;
  failureKind?: FailureKind;
  blockedBy?: string;
  instanceId?: string;
  sessionId?: string;
  message?: string;
  evidence?: string[];
}
```

测试框架集成只需要在 `afterEach`、`afterTest` 或等效 hook 中写入失败事件。Core 不实现通用依赖执行引擎，只在最终化时读取已有事件。

### 3. 最小结果闭环

finalizer 根据冻结的 `TestContract.objectives` 检查 required objective：

- `passed`：目标通过；
- `failed`：独立失败；
- `blocked`：必须包含 `blockedBy`；
- `not_executed`：明确未执行；
- 无任何终态：自动记为 `not_executed`，整体不得通过。

最终状态规则：

```text
存在 error                         -> error
存在 required failed               -> failed
存在 required blocked/not_executed -> blocked
测试框架通过但证据缺失              -> failed + evidence_incomplete
全部 required passed 且证据完整      -> passed
```

最小必需证据为 `manifest.json`、`result.json`、stdout/stderr 生产状态、目标汇总和退出码。空日志允许存在，但必须在 manifest 中记录 `not-produced` 或 `empty`，不能静默视为有效日志。

### 4. 实际运行事实

adapter 可在启动后补充以下最小事实：

```ts
interface RuntimeInstanceFacts {
  instanceId: string;
  binaryPath?: string;
  pid?: number;
  webdriverOrCdpPort?: number;
  appDataDirectory?: string;
  sessionId?: string;
}
```

本阶段不强制计算所有目录 hash，也不实现完整 planned/effective diff。若 adapter 同时提供计划值和实际值，Core 只比较端口、路径和 instanceId 等已提供字段，并把差异写入 warning。

### 5. Skill 行为

Skill 不增加大量新说明，只收敛为三条执行规则：

1. 优先通过 ClientTrail CLI 执行，不把项目自建 evidence 目录当作完整 ClientTrail run；
2. 结论前运行最小证据闭环检查；
3. 发现 required objective 缺少终态时，明确报告失败或阻塞，不根据截图补写通过。

## 异常与边界处理

- 子进程在测试 hook 执行前崩溃：adapter 写入运行级失败，目标统一记为 `not_executed`；
- 进程退出但没有 `result.json`：EvidenceSession 在父进程中完成兜底最终化；
- stdout/stderr 为空：记录为空，不自动判定失败；若同时缺少目标事件，则判定 evidence 不完整；
- contract 未提供：仍可运行，但只汇总观察到的目标事件，不宣称契约覆盖完成；
- adapter 无法获得 PID、端口或 sessionId：字段省略并记录原因，不阻塞单实例普通测试；
- 多实例测试缺少实例事实：业务结果可以保留，但并发隔离结论为未验证。

## 测试策略

- 单元测试覆盖 runId 注入、目标事件 schema、终态汇总和证据缺失规则；
- Tauri adapter 测试覆盖环境变量传递、空日志记录和父进程兜底最终化；
- CLI 测试覆盖 required objective 缺失时不能返回 passed；
- 根级契约测试确保 Skill 仍要求正式项目只读和 evidence closure；
- 不在本阶段新增真实双实例 CI，使用现有 fixture 和进程模拟测试通用行为。

## 非目标

- 不实现通用测试依赖图；
- 不实现故障注入矩阵；
- 不实现 Provider 录制回放；
- 不实现全量文件和资源 provenance；
- 不实现动态 timeout 引擎；
- 不自动修复项目专用测试步骤；
- 不把屏幕捕获、Viewer 恢复等 ScreenCast 专用逻辑写入 ClientTrail Core。

## 风险与控制

- 事件模型可能与测试框架 reporter 重复：先保持 JSON 文件接口最小，不编写自定义 reporter SDK；
- 外部测试可能不写目标事件：父进程仍能给出测试框架结果，但标记契约覆盖未验证；
- 最终状态规则可能改变历史结果：通过回归测试明确区分业务失败、阻塞和证据不完整；
- Skill 文本继续增长：修改时删除重复说明，以执行规则代替新增概念章节。
