---
name: clienttrail-desktop-testing
description: 为 Tauri 2、Electron、Windows 原生和 macOS 原生桌面客户端设计、安装、运行和诊断确定性自动化测试。Use when an AI agent needs to test a desktop client through DOM, WebView/CDP, IPC, Accessibility APIs, Playwright, WebdriverIO, pytest, or cargo test. Do not use for mobile apps, browser-only websites, or visual-only OCR testing when structured automation is available.
---

# ClientTrail Desktop Testing

这是 ClientTrail 的桌面客户端自动化测试 Skill。它可以实际调用仓库中的 `client-test` CLI；MCP 只用于 AI 探索和录制，确定性回归始终由 CLI 和测试框架执行。

## 输入

- 被测项目根目录（必须由用户提供或从当前工作目录明确推断）。
- 技术栈声明：Tauri 2、Electron、Windows 原生、macOS 原生，以及可选的 Python/Rust 后端。
- 测试目标和关键业务流程。
- 可选的 WebView/CDP 地址、应用启动命令、原生自动化 helper 命令。

如果项目路径、技术栈或权限不明确，先报告缺失信息，不要猜测或修改文件。

用户不需要手动拼接 CLI 命令。只要提供 Skill 名称、被测项目位置（当前工作目录、自然语言路径或已打开的项目）和测试要求，Agent 就应该自动完成路径解析、CLI 定位、环境检查、已有测试执行和 evidence 读取。

默认采用“纯业务测试、正式项目只读”模式。正式项目永远不执行 setup。需要 setup 时，只能创建隔离副本或临时 worktree，并在隔离目录中接入和运行测试。

## 测试边界（强制）

ClientTrail 的职责是执行真实业务测试并给出可追溯的测试结论，不负责修复、重构或改进被测产品。

- `doctor`、`run`、`evidence` 和失败诊断阶段不得修改被测项目的源码、配置、依赖、数据库或业务数据。
- 不得为了让用例通过而修改业务逻辑、放宽断言、伪造状态、写入生产数据或绕过权限与审批。
- 默认禁止执行 setup，也禁止安装依赖、创建测试配置或修改任何被测项目文件。缺少测试能力时只报告阻塞和可选接入方案。
- 需要 setup 时，必须先创建隔离副本或临时 worktree；禁止直接在正式项目目录执行 `setup --yes`。
- 在隔离目录先执行 `setup --dry-run --json`，展示依赖、创建文件、修改文件和 `productionRisk`；用户确认后才允许在隔离目录执行 setup。
- setup 仅可安装测试所需依赖、创建 E2E 配置与测试草稿，以及为测试模式修改 `package.json`、Tauri 配置、`main.rs`/`lib.rs` 等接线。所有能力必须限制在 Debug/Test 构建，不得进入 Release 行为。
- 隔离 setup 的修改只存在于隔离目录；不得把修改后的配置、锁文件、源码或测试草稿复制回正式项目。
- setup 计划之外出现任何新增文件修改、覆盖已有配置、生产风险扩大或业务代码改动时，立即停止并重新请求确认。
- 测试失败后只报告结论、证据、失败分类和产品侧修复建议；除非用户另行明确委托修复，否则不得修改被测项目。
- 允许写入的运行产物仅限项目配置的 `.client-test` evidence 目录和测试框架自身既有输出目录；不得将运行产物复制进源码、Skill 或 ClientTrail 仓库。

## setup 定义与决策规则

`setup` 不是业务测试本身，而是为缺少自动化入口的项目增加测试基础设施和可观测性。它可能执行以下操作：

- 安装 WebdriverIO、Tauri Service、Playwright 或其他测试运行依赖；
- 更新 `package.json` 及 npm/pnpm/yarn/bun 锁文件；
- 创建 `wdio.conf.ts`、Playwright 配置、E2E 测试草稿和测试脚本；
- 在 Tauri 项目中更新 `Cargo.toml`，增加可选测试依赖和 `client-test` feature；
- 在 `main.rs`/`lib.rs` 中增加测试插件接线，且必须使用 `#[cfg(feature = "client-test")]` 或等效 Test/Debug 门控；
- 生成测试所需的 capability、启动参数或外部 helper 配置。

AI 必须先判断只读模式是否足够，再决定是否提出 setup：

| 判断 | 行为 |
| --- | --- |
| 项目已有可运行的 E2E、CDP/WebDriver、Accessibility、辅助服务 API 或测试命令 | 不使用 setup，直接执行已有测试和证据读取 |
| 只缺少路径、环境变量、启动参数或测试目标说明 | 不使用 setup，补充运行参数或报告缺失信息 |
| 没有任何可连接的客户端自动化入口，且用户要求验证 WebView DOM、真实窗口交互或完整客户端链路 | 提议 setup，但只在隔离副本/worktree 中执行 |
| 只读测试已能覆盖用户要求 | 不使用 setup；不得为了增加覆盖率擅自修改项目 |

提出 setup 前必须向用户明确说明：

1. 为什么只读模式无法完成目标，以及具体缺失的测试入口。
2. setup 会增加哪些依赖、配置、测试文件和 Tauri 测试接线。
3. setup 会修改隔离副本，但不会修改正式项目；正式项目不会接收这些文件或锁文件。
4. 哪些测试可以因此新增，哪些风险仍然存在，例如构建时间、依赖下载、测试插件兼容性和 `productionRisk`。
5. 如果不使用 setup，将只能得到哪些有限结论和哪些“未覆盖/环境阻塞”结论。

只有用户明确确认“在隔离副本中执行这个 setup 计划”后，AI 才能创建隔离目录并运行 setup。用户始终拥有最终决定权；未确认、拒绝或确认内容不明确时，保持正式项目只读并给出有限测试结论。

### setup 决策门（强制交互）

当只读测试发现某个用户要求的套件因缺少测试入口而无法执行时，AI 不得只报告“已暂停”后结束。必须在同一回复末尾明确提出下一步选择，并等待用户决定：

```text
当前已完成的测试：<通过/失败套件和结论>
当前未执行：<套件>，原因：<缺少的入口或依赖>

下一步请选择：
1. 保持正式项目只读：不执行 setup；我只保留当前结论，并将该能力标记为“未覆盖/环境阻塞”。
2. 在隔离副本中接入测试：我会先创建临时 worktree，展示 setup dry-run（依赖、文件、命令、productionRisk），得到你确认后再安装和运行。

请选择 1 或 2。
```

如果用户选择 1，明确结束本轮并写明未覆盖项；如果用户选择 2，继续创建隔离副本并执行 setup dry-run。用户没有选择、回复含糊或拒绝时，不得创建隔离目录或执行 setup，但必须保留上述选择请求，等待后续回复。不得把“暂停”写成无需用户行动的最终状态。

## 回归结果质量规则

- 先找“第一个导致流程无法继续的失败”，把它标记为根因；后续因共享前置变量为空、状态未建立或依赖未满足产生的错误统一标记为 `blocked`/`skipped`，不得计为独立业务失败。
- 测试步骤之间存在依赖时，必须表达依赖关系。前置步骤失败后，后续步骤不得继续发起无意义请求；若测试框架无法跳过，至少在报告中把它们归为级联阻塞。
- 业务失败、环境阻塞、后端/API 错误、定位器错误、测试代码异常和清理异常必须分开分类。不能仅根据进程退出码 `1` 统一标记为 `assertion`。
- 外部服务、Provider、网络、凭据或测试数据准备失败属于前置条件/环境问题时，单独列出，不要据此推断客户端业务逻辑缺陷；同时继续检查与该问题无关的客户端启动、DOM、窗口、状态读取和证据链路。
- 诊断工具必须按“实际 provider/adapter 是否使用”解释告警：如果当前使用 `embedded`、已有 CDP 或其他不依赖外部驱动的路径，则 `tauri-driver not found`、未安装的可选 helper 或自动安装提示只能标记为 `optional_tool_warning`，不得升级为环境失败。只有实际选中的 provider 在启动或执行时需要该工具且因此无法建立 session，才标记为 `environment_blocked`。
- WebDriver、Tauri driver、CDP、窗口焦点、磁盘诊断和 session cleanup 的 warning/error 要与业务断言分栏报告。清理失败不得覆盖原始业务根因。
- 生命周期告警必须带阶段和 session 状态：session 已创建且业务断言完成后，`core.invoke` 探测超时、mock 清理失败、driver 停止失败等只能标记为 `adapter_warning`/`cleanup_warning`；session 尚未建立或启动失败时才可影响环境结论。清理逻辑应在 session 存在且仍有效时执行，避免对已删除 session 重复发请求。
- 多个 spec 或 suite 会共享客户端、端口、用户数据目录、持久化存储或外部依赖时，默认串行执行；smoke、业务流程和后端套件应支持独立运行和独立结论。若实际运行出现多个 worker，必须证明每个 worker 的业务作用域标识、端口、用户数据目录、存储和外部依赖连接均隔离，否则将结果标记为“通过但并发隔离风险未消除”，不能给出无条件的回归通过结论。报告实际 worker/session 数量，不以配置文件中的期望值代替事实。
- 双实例或多实例测试必须额外记录每个实例的二进制路径、PID、WebDriver/CDP 端口、应用数据目录、临时目录、Cargo target/build 目录和启动时间。即使端口和数据目录不同，只要二进制资源、embedded WebDriver 资源、构建目录或全局临时资源仍共享，也不能宣称已完成并发隔离验证。实例 A 通过而实例 B 在启动阶段失败时，分别给出实例结论，并将整体标记为“并发能力未完成”，不得归因于业务断言。
- 轮询异步状态时记录每次关键状态转换、版本、时间戳、最后响应和超时原因。重试必须有明确的错误白名单、次数/时间上限和每次重试证据，不能用无限重试掩盖产品问题。
- 长时间异步任务、Provider 延迟和会话轮换必须由测试代码显式处理，不能由 Skill 通过固定 sleep 或“最后一次响应”猜测完成。测试应声明启动、进行中、成功、失败、取消、超时和会话失效状态；每次轮询记录 `run_id`/任务 ID、会话 ID、版本或事件游标。发生 session 轮换时必须重新建立会话并校验身份、项目和任务仍一致；轮换前后的证据必须能关联到同一业务任务。超过预算时标记为 `timeout` 或 `environment_blocked`，不得标记为通过。
- 业务 API 调用应记录脱敏后的方法、路径、状态码、错误码、耗时、关联 ID 和关键实体 ID；原始 WebDriver 协议日志作为详细证据，不能替代结构化业务摘要。非 2xx 响应必须结合当前断言判定：预期的拒绝、幂等冲突或状态保护（例如已完成后再次修改返回 `409`）应记录为 `expected_business_response`，只有与断言预期不符时才记为业务/API 失败。
- 当非 2xx 响应表明前置条件、许可证、Provider 或生命周期状态未满足时，应记录为 `business_blocked`，并停止依赖该前置条件的后续用例；不能继续断言一个必然不会成立的终态。
- 测试开始时校验并记录正式项目根、隔离 worktree、应用数据目录、业务作用域/租户/项目标识（如果项目有）、外部依赖作用域和实际构建 manifest；发现路径不一致时先报告环境问题。不存在某类标识时记录 `not_applicable`，不得要求所有项目都提供同名字段。
- “通过”还必须经过证据完整性门：除 `result.json.status=passed` 和退出码为 0 外，还要确认 `manifest.json` 已最终化、请求的 suite/spec 均有明确计数、每个业务目标至少有一个可定位证据，并且证据中的 `runId`、workspace、项目标识和关键实体引用一致。缺任一项时输出“测试框架通过，但证据不完整”，不能简化为无条件通过。
- 恢复、终态审计、缓存/记忆/经验或其他持久化数据隔离复验必须做关联校验：记录 baseline 快照、业务作用域标识、本次 `run_id`、workspace/data 目录，以及正向和负向查询的结果。只有项目确实存在跨作用域数据时，才执行污染复验；至少同时证明“目标作用域可见”和“对照作用域不可见”。不存在该能力时标记 `not_applicable`，不能把项目专用检查强加给其他类型客户端。
- 对 WDIO `onPrepare`、Tauri embedded WebDriver、CDP/Accessibility session 建立失败，必须优先归类为 `launch`、`environment` 或 `adapter`，不能使用 `assertion`。只有 session 已建立并进入测试步骤后，业务断言不满足时才可归类为 `assertion`。如果执行器原始 `failureKind` 与日志阶段矛盾，Skill 必须在报告中指出“原始分类不可信”，保留原始值并给出校正分类。
- 当 embedded WebDriver 在指定端口超时未 ready 时，诊断必须核对：应用进程是否存活、端口是否被监听、插件初始化日志、资源文件是否存在、启动参数和环境变量是否传入、实例是否复用了同一二进制/target/临时目录，以及是否存在构建锁或并发启动竞争。不能只提示“注册插件”或直接重跑；应先给出最小复现和隔离修复建议。

### 高级测试能力契约

以下能力属于通用测试工具的可选能力。Skill 必须先读取 adapter 的 capability 声明，再决定是否执行；不支持时返回 `capability_not_supported` 或 `not_configured`，不得伪造完成。

能力字段必须通过 adapter 映射，不使用固定业务名称。推荐的通用映射包括：

```text
businessScopeId       -> 项目/租户/账号/工作区等业务作用域标识
externalDependency    -> Provider、sidecar、服务进程或本地 helper
persistentStore       -> 数据库、文件存储、缓存、索引或用户数据目录
controlDirectory      -> launcher、锁、socket、pipe 或测试控制目录
```

某个项目没有 Provider、sidecar、数据库或多租户概念时，对应字段为 `not_applicable`，不影响其他能力执行。

#### 故障注入

统一的故障注入动作使用以下语义：

```text
provider_disconnect
worker_exit(stage)
external_dependency_restart
session_expire
pause_during_recovery
recover
```

- `provider_disconnect`、`external_dependency_restart`、`session_expire` 可由通用 adapter 提供；`worker_exit(stage)` 和 `pause_during_recovery` 通常需要项目测试入口。`sidecar_restart` 可以作为某些项目对 `external_dependency_restart` 的具体映射，但不是所有项目都必须实现。
- 每次注入必须记录目标实例、注入阶段、开始/结束时间、关联任务或 `run_id`、恢复动作和最终状态。
- 故障注入必须运行在 Debug/Test 或隔离环境；不得向生产服务、真实 Provider 或用户数据注入故障。
- 外部 `taskkill`、端口阻断或进程操作只能标记为粗粒度注入，不得声称覆盖了 Worker 内部阶段。
- 多实例注入必须使用 adapter 返回的实例级控制句柄，至少应包含 `instanceId`，并尽可能提供 `pid`、监听端口、`appDataDirectory`、`controlDirectory` 和外部依赖句柄。仅按项目根目录、进程名或二进制文件名匹配时，必须拒绝执行并报告 `fault_target_ambiguous`。

#### 多实例隔离预检

并发测试开始前必须生成机器可读的 isolation preflight，逐实例比较：

```text
applicationId
binaryPath
binarySha256
resourceDirectory
webdriver/cdpPort
externalDependencyPorts
appDataDirectory
launcherControlDirectory
persistentStorePaths
temporaryDirectory
cargoTargetDirectory
```

关键可写资源、端口、数据库和控制目录发生冲突时，必须在启动前返回 `isolation_blocked`。只读资源允许共享，但要明确标记 `shared_readonly`。预检通过不等于并发测试通过，还必须记录每个实例的 PID、session、实际监听端口和最终退出状态。

#### 二进制和资源 provenance

每个 run 的 `manifest.json` 应尽可能记录：

- 客户端二进制路径、大小、SHA-256；
- 外部依赖或辅助服务路径和 SHA-256（如果存在）；
- Tauri、WebDriver、测试配置 hash；
- resource 目录路径、hash 和共享/隔离模式；
- 实际 executable、args、cwd 和环境变量摘要；
- 构建 commit、应用版本、adapter 版本和 package lock 标识。

环境变量必须脱敏。无法计算 hash 时记录 `not-produced` 和原因，不能静默省略。两个实例的 provenance 不完整时，结果最多为“测试通过但构建独立性未验证”。启动器必须记录实际启动 PID；能够访问文件时自动计算二进制和资源目录 SHA-256，无法计算时将 provenance 维度标记为 `incomplete`。

#### 依赖图和阻塞传播

测试用例或 suite 应声明前置依赖。前置失败后，依赖用例必须标记：

```json
{
  "status": "blocked",
  "blocked_by": "<root-case-id>",
  "reason": "required run_id was not created"
}
```

报告分别统计根因失败、独立失败、级联阻塞、跳过和未执行。不得把级联错误计为多个业务失败。测试框架无法自动跳过时，Skill 至少要根据时间线重分类，并停止继续发送无意义请求。Provider、许可证、凭据或关键前置资源未满足时，编排器应在前置阶段停止依赖套件，后续用例输出 `blocked`、`blocked_by` 或 `not_executed`。

#### Provider live/record/replay

Provider 相关测试应声明：

```text
providerMode: live | record | replay
```

- `live` 用于最终外部依赖连通性、认证、真实延迟和最终验收；
- `record` 在真实执行时生成脱敏、带 schema/version 的录制；
- `replay` 用于状态机、恢复、隔离、UI 和重复回归，不能宣称真实 Provider 能力通过。

录制数据必须脱敏并绑定项目、schema、版本和有效期。报告必须分别统计 live 和 replay 结果，不能混合成一个通过率。

#### 动态预算

长时间测试应根据历史延迟和用例规模生成预算，而不是要求用户手工猜 timeout：

```text
budget = clamp(
  startupBudget
  + specCount * specBudget
  + providerP99Budget
  + recoveryBudget
  + safetyMargin,
  minBudget,
  maxBudget
)
```

预算来源、P95/P99 样本数、最小值、最大值和实际使用值必须写入 manifest。预算不能无限增长；业务已经完成但外层 runner 超时，应标记为 `completed_but_runner_timeout`，不能直接判定为通过。

#### 覆盖和负向断言

- “完整 UI 覆盖”只有在存在视图/页面清单，并且每项都有访问、交互和断言证据时才能使用；否则写成“已验证的 UI 范围”。
- 预期的 `404`、`409`、拒绝或隔离响应必须在用例中标记为 `expected_negative_case`，说明为什么该响应代表通过。
- 稳定性测试必须报告迭代次数、持续时间、失败重试次数和 Provider 模式；少量重复执行只能称为“重复回归通过”，不能自动升级为“长时间稳定”。执行器对档位有最低门槛：`soak` 至少 10 次且持续 15 分钟，`stress` 至少 20 次且持续 5 分钟。

### 后端套件命令发现

`cargo`、`pytest` 等后端套件不能只根据目录名称推断命令。Skill 应先以只读方式收集候选入口：

- Rust：定位实际 `Cargo.toml`，读取 workspace/package、`[package]`、`[workspace]`、features、已有脚本和测试目录；区分 `cargo test --manifest-path <path>`、workspace package 和特定 `--features` 的候选命令。
- Python：定位 `pyproject.toml`、`pytest.ini`、`tox.ini`、`noxfile.py`、`requirements` 和现有 CI/test 脚本，识别虚拟环境和测试路径。
- Node/Electron/Tauri：读取 `package.json` scripts、锁文件和已有 E2E 配置，不把 `npm test` 或 `cargo test` 当作默认事实。

候选命令必须经过以下决策：

1. 只有一个入口、manifest 路径和工作目录均可验证时，生成机器可读的 command plan，并执行 doctor/干运行校验。
2. 存在多个 package、多个 workspace、多个测试脚本或 feature 不明确时，列出候选命令、依据和覆盖范围，要求用户选择；不得静默选择。
3. 找不到可靠入口时，将套件标记为 `not_configured`，说明缺少的配置和最小接入方式；不得伪造 `cargo test`/`pytest` 结果，也不得为了补齐入口修改正式项目。
4. 实际执行命令必须记录 executable、args、cwd、manifest/config 路径和解析依据；命令退出后将“命令未接入”“命令执行失败”和“测试断言失败”分开报告。

## 不适用场景

- 移动端应用测试。
- 只需要浏览器网站测试的任务。
- 用户明确只要截图/OCR 回放，而项目已有结构化 DOM、WebView 或 Accessibility 接口。
- 未经用户确认就修改项目、安装依赖或启动客户端。

## 工作流

按以下顺序执行，不跳过项目诊断；setup 仅在隔离模式且获得确认后执行：

```text
intake -> doctor -> strategy -> capability-negotiation -> isolation-preflight
       -> test-contract -> existing-run-or-readonly-observe -> evidence
       -> deterministic-result -> diagnosis -> test-case-generation

需要新增测试接线时：
intake -> doctor -> isolated-worktree -> setup-plan -> confirmation -> setup
       -> capability-negotiation -> isolation-preflight -> run --contract test-contract.json -> evidence
       -> deterministic-result -> diagnosis -> test-case-generation
```

每一步都必须保留机器可读结果；setup 变更前必须先展示 dry-run 计划并获得用户确认。

高级能力的状态、预检字段和证据结构参考 [references/advanced-capabilities.md](references/advanced-capabilities.md)。

### Agent 自动编排

1. 从用户消息、当前工作目录和已打开文件中解析被测项目根目录；如果只有一个合理候选，直接使用；有多个候选时要求用户选择。
2. 自动定位 ClientTrail CLI：优先使用当前仓库的 `pnpm client-test`；否则查找包含 `packages/cli/src/main.ts` 的 ClientTrail checkout，并执行 `pnpm --dir <clienttrail-root> client-test`。禁止假设系统存在全局 `client-test` 可执行文件；找不到 checkout 时报告安装位置，不伪造结果。
3. 识别单仓库和多目录项目：先找到包含 `package.json`、`Cargo.toml`、`tauri.conf.json` 或 `pyproject.toml` 的实际子项目根目录。若 worktree 根是 Python/工作流仓库而 `desktop/` 是 Tauri 子项目，Tauri doctor/run 必须使用 `desktop/`，后端测试可继续使用 worktree 根。
4. 自动执行 `doctor --json`，结合用户声明和项目实际文件选择适配器。
5. 读取 adapter capability，明确故障注入、并发、Provider 模式、provenance、动态预算和后端命令哪些可用。
6. 并发或多实例测试先执行 isolation preflight；返回 `isolation_blocked` 时不得启动客户端。
7. 若项目已有测试接线，直接执行确定性回归；探索或录制只在用户明确要求时启动 MCP。
8. 若项目没有测试接线，报告“正式项目只读模式无法执行该套件”，然后必须触发“setup 决策门”，明确等待用户选择 1 或 2；不要直接结束且不要在正式项目执行 setup。
9. 用户选择完整接入后，创建隔离副本或临时 worktree，在隔离目录执行 dry-run → 单独确认 → setup → run。
10. 只读取隔离目录的 evidence，测试结论必须标注运行目录和“正式项目未修改”。

用户只要求“测试一下”时，默认执行 doctor。已有测试能力时直接 run → evidence；缺少测试接入时只报告阻塞，不执行 setup。不要把内部命令列表当作用户前置工作。

## 1. 项目接入

先确认项目根目录，并读取用户声明的技术栈。调用：

```text
client-test doctor --project <project-root> --json
```

对比用户声明和 `package.json`、`Cargo.toml`、Tauri 配置、锁文件的实际内容。发现不一致时报告警告，不要静默覆盖用户声明。

## 1.1 测试契约

在正式回归前生成或读取项目内的 `test-contract.json`，并冻结本次业务目标、前置条件、通过/失败/阻塞标准和证据策略。执行时使用：

```text
client-test run --project <project-root> --contract test-contract.json --json
```

CLI 会校验契约哈希，并把 `contractHash` 写入各套件的 `manifest.json`、`result.json` 和汇总输出。契约不存在时只能生成草案并等待确认，不能边执行边改变判定标准。

需要详细接入字段时读取 [references/project-intake.md](references/project-intake.md)。

## 2. 选择策略

- Tauri 2：优先 WebdriverIO Tauri Service；原生系统窗口使用 Accessibility 适配器。
- Electron：优先 Playwright Electron 或 WebdriverIO Electron Service。
- Windows 原生：使用 Windows UI Automation。
- macOS 原生：使用 macOS Accessibility API。
- Python 后端：pytest + Hypothesis。
- Rust 后端：cargo test + proptest。

需要选择 Tauri 具体策略时读取 [references/tauri-strategy.md](references/tauri-strategy.md)。

默认使用黑盒/外部观测模式：优先连接已有 CDP、WebView、Accessibility、外部依赖 API 和已有测试命令，不改源码、不注入插件。已存在测试接线时才使用白盒模式。新增白盒接线只能通过已确认的 setup 计划完成。

## 3. 安装前确认

仅当已决定提出 setup、且已经准备使用隔离目录时调用：

```text
client-test setup --project <project-root> --dry-run --json
```

仅在隔离目录中、且用户明确要求完整接入时展示依赖、待创建文件、待修改文件、命令和 `productionRisk`。确认必须针对当前计划单独取得，不能用用户此前的笼统授权代替。没有用户明确确认时不要修改任何目录。不要覆盖已有测试配置；冲突必须停止并报告具体字段。用户确认后由 Agent 自动执行 setup，不要求用户复制命令。

## 4. 探索模式

仅在用户要求探索、录制或生成测试时启动 MCP：

```text
client-test mcp
```

优先使用结构化 UI Snapshot、role、label、test id、AutomationId 和稳定属性。禁止默认使用坐标、OCR 或截图猜测元素。

Windows 原生操作通过 `winapp ui inspect/search/invoke/wait-for --json` 完成；需要真实鼠标或键盘注入时才降级到 Computer Use。macOS 原生操作通过 Accessibility helper，未安装 helper 时必须报告环境错误。

探索结果必须包含：

- 动作顺序
- 稳定定位器
- 等待条件
- 确定性断言
- 对应证据引用

AI 生成的测试必须先保存为草稿，再运行验证；不要把一次探索结果直接标记为回归通过。

## 5. 回归模式

回归测试不调用 MCP，也不依赖 LLM。使用：

```text
client-test run --project <project-root> --json
# 如已冻结契约：
client-test run --project <project-root> --contract test-contract.json --json
```

退出码含义：

- `0`：通过
- `2`：配置或环境错误
- `3`：测试失败
- `4`：工具内部错误

测试状态以测试框架和断言结果为准。AI 只能补充诊断，不得把 `failed` 改成 `passed`。

## 6. 测试用例生成

测试完成后，Skill 可以根据本次真实执行证据生成可读的标准测试用例，供开发者、测试人员和评审使用。该步骤是证据整理，不是重新设计测试，也不能把未执行的内容补写成已验证。

生成规则：

- 只从测试代码、执行日志、业务 API 摘要、状态时间线和 `result.json`/`manifest.json` 提取事实；没有证据的字段标记为“未验证”或“未知”。
- 每个测试用例包含：用例 ID、标题、目的、优先级、前置条件、测试数据、环境/平台、步骤、预期结果、实际结果、状态、证据引用、关联 `runId` 和备注。
- 步骤必须使用“动作 + 观察点 + 预期结果”的可读语言，避免直接暴露难以理解的 WebDriver 协议细节；必要时在证据引用中保留 API 路径、事件 ID、session ID 和日志文件。
- 一个自动化 spec 可以拆成多个业务测试用例；只有存在独立的前置、动作和断言时才拆分，不得为了增加用例数量重复同一证据。
- 通过、失败、阻塞、跳过、未验证必须与测试框架结论一致；清理告警、Provider 告警和并发风险写入备注或风险栏，不改变业务状态。
- 恢复、会话轮换、记忆/经验隔离和污染复验必须在用例中写出验证的正向结果、负向结果和关联标识。
- 默认生成 Markdown 版本供人阅读；如果执行器支持结构化产物，同时生成同内容的 JSON 版本，便于导入测试管理系统。产物只能写入 `.client-test` evidence 目录或测试框架既有输出目录。

推荐流程：

```text
run -> evidence -> deterministic-result -> diagnosis -> test-case-generation
```

生成前必须完成证据完整性检查；生成后必须校验每个用例至少引用一个证据文件或结构化事件。用例文档应明确区分“自动化已验证”和“建议补测”，不得将建议补测放入通过统计。

标准字段和示例读取 [references/test-case-template.md](references/test-case-template.md)。

## 7. 失败诊断

先读取 `artifactDirectory` 下的 `result.json` 和 `manifest.json`，再读取相关日志。先建立失败时间线并定位第一个根因，再读取相关日志。按以下优先级分类：

```text
environment -> build -> launch -> locator -> timeout -> assertion
-> backend -> network -> crash -> security -> unknown
```

诊断输出必须包含：失败分类、最小复现命令、证据文件、可能原因和建议修复。不要只根据截图推断业务状态。

失败报告必须额外包含：

- 根因失败与级联阻塞的数量；
- 已通过、失败、阻塞、跳过和未执行的 suite/spec；
- 实际 worker/session 数量及是否存在共享状态；
- 外部依赖问题与客户端业务问题的分离结论；
- 业务状态时间线和关键 API 摘要；
- 清理阶段 warning 是否影响测试结论。

需要失败分类和证据映射时读取 [references/failure-diagnosis.md](references/failure-diagnosis.md)。

读取临时日志时使用只读 evidence 命令，不直接扫描项目外路径：

```text
client-test evidence --project <project-root> --json
client-test evidence --project <project-root> --run <run-id> --file result.json --json
client-test evidence --project <project-root> --run <run-id> --file stderr.log --tail 200

# 失败后生成脱敏最小复现包
client-test diagnose --project <project-root> --result <run-dir>\\result.json --repro --json
```

如果用户要求复盘，先列出最近 run，再读取 `result.json`、`manifest.json` 和与失败分类对应的日志；不要把运行产物复制回 Skill 或仓库。

## 输出要求

完成一次任务后按以下顺序返回：

1. 项目和技术栈识别结果。
2. 采用的测试策略和降级原因。
3. 执行过的命令及退出码。
4. 测试汇总：通过、失败、环境错误和未执行套件。
5. `runId`、`artifactDirectory` 和关键证据文件。
6. setup 阶段已修改文件、安装的依赖和用户需要复核的风险；必须明确这些修改只存在于隔离目录，并写明“正式项目未修改”。
7. 未验证的平台能力和下一步建议。
8. 测试用例产物路径（如已生成），并说明每个用例对应的 `runId`、状态和证据引用。
9. 能力矩阵：故障注入、并发隔离、provenance、依赖阻塞传播、Provider 模式和动态预算的状态。
10. 若有多实例测试，附 isolation preflight、每实例 provenance 和 `isolation_blocked`/通过结论。

不得把 AI 推断写成测试框架结果；不得编造通过率、截图、日志或业务状态。

## 安全约束

- 正式项目默认不执行 setup；任何 setup 都必须在隔离目录先 dry-run，再对当前计划取得单独确认。
- run 和 diagnosis 永远只读，除 evidence 目录与既有测试输出外不得写入被测项目。
- 正式项目的所有读写边界必须位于项目根目录或其 `.client-test` evidence 目录；隔离 worktree 必须是单独的临时目录，不能与正式项目目录相同。
- 测试插件只允许在 Debug/Test feature 中启用。
- Release 检查发现测试端口、测试插件或重置接口泄漏时必须失败。
- 证据默认脱敏 Authorization、Cookie、Token、API Key、Secret 和 Password。
- 不自动执行来源不明的 shell 字符串；命令使用 executable、args、cwd 三元组。
