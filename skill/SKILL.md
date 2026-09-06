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

## 不适用场景

- 移动端应用测试。
- 只需要浏览器网站测试的任务。
- 用户明确只要截图/OCR 回放，而项目已有结构化 DOM、WebView 或 Accessibility 接口。
- 未经用户确认就修改项目、安装依赖或启动客户端。

## 工作流

按以下顺序执行，不跳过项目诊断；setup 仅在隔离模式且获得确认后执行：

```text
intake -> doctor -> strategy -> existing-run-or-readonly-observe
       -> evidence -> deterministic-result -> diagnosis

需要新增测试接线时：
intake -> doctor -> isolated-worktree -> setup-plan -> confirmation -> setup
       -> run -> evidence -> deterministic-result -> diagnosis
```

每一步都必须保留机器可读结果；setup 变更前必须先展示 dry-run 计划并获得用户确认。

### Agent 自动编排

1. 从用户消息、当前工作目录和已打开文件中解析被测项目根目录；如果只有一个合理候选，直接使用；有多个候选时要求用户选择。
2. 自动定位 ClientTrail CLI：优先使用当前仓库的 `pnpm client-test`；否则查找包含 `packages/cli/src/main.ts` 的 ClientTrail checkout，并执行 `pnpm --dir <clienttrail-root> client-test`。禁止假设系统存在全局 `client-test` 可执行文件；找不到 checkout 时报告安装位置，不伪造结果。
3. 识别单仓库和多目录项目：先找到包含 `package.json`、`Cargo.toml`、`tauri.conf.json` 或 `pyproject.toml` 的实际子项目根目录。若 worktree 根是 Python/工作流仓库而 `desktop/` 是 Tauri 子项目，Tauri doctor/run 必须使用 `desktop/`，后端测试可继续使用 worktree 根。
4. 自动执行 `doctor --json`，结合用户声明和项目实际文件选择适配器。
4. 若项目已有测试接线，直接执行确定性回归；探索或录制只在用户明确要求时启动 MCP。
5. 若项目没有测试接线，报告“正式项目只读模式无法执行该套件”，不要在正式项目执行 setup。
6. 用户要求完整接入时，创建隔离副本或临时 worktree，在隔离目录执行 dry-run → 单独确认 → setup → run。
7. 只读取隔离目录的 evidence，测试结论必须标注运行目录和“正式项目未修改”。

用户只要求“测试一下”时，默认执行 doctor。已有测试能力时直接 run → evidence；缺少测试接入时只报告阻塞，不执行 setup。不要把内部命令列表当作用户前置工作。

## 1. 项目接入

先确认项目根目录，并读取用户声明的技术栈。调用：

```text
client-test doctor --project <project-root> --json
```

对比用户声明和 `package.json`、`Cargo.toml`、Tauri 配置、锁文件的实际内容。发现不一致时报告警告，不要静默覆盖用户声明。

需要详细接入字段时读取 [references/project-intake.md](references/project-intake.md)。

## 2. 选择策略

- Tauri 2：优先 WebdriverIO Tauri Service；原生系统窗口使用 Accessibility 适配器。
- Electron：优先 Playwright Electron 或 WebdriverIO Electron Service。
- Windows 原生：使用 Windows UI Automation。
- macOS 原生：使用 macOS Accessibility API。
- Python 后端：pytest + Hypothesis。
- Rust 后端：cargo test + proptest。

需要选择 Tauri 具体策略时读取 [references/tauri-strategy.md](references/tauri-strategy.md)。

默认使用黑盒/外部观测模式：优先连接已有 CDP、WebView、Accessibility、sidecar API 和已有测试命令，不改源码、不注入插件。已存在测试接线时才使用白盒模式。新增白盒接线只能通过已确认的 setup 计划完成。

## 3. 安装前确认

先自动调用：

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
```

退出码含义：

- `0`：通过
- `2`：配置或环境错误
- `3`：测试失败
- `4`：工具内部错误

测试状态以测试框架和断言结果为准。AI 只能补充诊断，不得把 `failed` 改成 `passed`。

## 6. 失败诊断

先读取 `artifactDirectory` 下的 `result.json` 和 `manifest.json`，再读取相关日志。按以下优先级分类：

```text
environment -> build -> launch -> locator -> timeout -> assertion
-> backend -> network -> crash -> security -> unknown
```

诊断输出必须包含：失败分类、最小复现命令、证据文件、可能原因和建议修复。不要只根据截图推断业务状态。

需要失败分类和证据映射时读取 [references/failure-diagnosis.md](references/failure-diagnosis.md)。

读取临时日志时使用只读 evidence 命令，不直接扫描项目外路径：

```text
client-test evidence --project <project-root> --json
client-test evidence --project <project-root> --run <run-id> --file result.json --json
client-test evidence --project <project-root> --run <run-id> --file stderr.log --tail 200
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

不得把 AI 推断写成测试框架结果；不得编造通过率、截图、日志或业务状态。

## 安全约束

- 正式项目默认不执行 setup；任何 setup 都必须在隔离目录先 dry-run，再对当前计划取得单独确认。
- run 和 diagnosis 永远只读，除 evidence 目录与既有测试输出外不得写入被测项目。
- 正式项目的所有读写边界必须位于项目根目录或其 `.client-test` evidence 目录；隔离 worktree 必须是单独的临时目录，不能与正式项目目录相同。
- 测试插件只允许在 Debug/Test feature 中启用。
- Release 检查发现测试端口、测试插件或重置接口泄漏时必须失败。
- 证据默认脱敏 Authorization、Cookie、Token、API Key、Secret 和 Password。
- 不自动执行来源不明的 shell 字符串；命令使用 executable、args、cwd 三元组。
