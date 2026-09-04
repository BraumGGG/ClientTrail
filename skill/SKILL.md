---
name: clienttrail-desktop-testing
description: 为 Tauri 2、Electron、Windows 原生和 macOS 原生桌面客户端设计、安装、运行和诊断确定性自动化测试。Use when an AI agent needs to test a desktop client through DOM, WebView/CDP, IPC, Accessibility APIs, Playwright, WebdriverIO, pytest, or cargo test. Do not use for mobile apps, browser-only websites, or visual-only OCR testing when structured automation is available.
---

# ClientTrail Desktop Testing

这是 ClientTrail 的桌面客户端自动化测试 Skill。它可以实际调用仓库中的 `client-test` CLI；MCP 只用于 AI 探索和录制，确定性回归始终由 CLI 和测试框架执行。

## 输入

- 被测项目根目录（必须由用户提供或从当前工作目录明确推断）。
- 技术栈声明：Tauri 2、Electron、Windows 原生、macOS 原生，以及可选的 Python/Rust 后端。
- 测试目标、关键业务流程和是否允许修改源码。
- 可选的 WebView/CDP 地址、应用启动命令、原生自动化 helper 命令。

如果项目路径、技术栈或权限不明确，先报告缺失信息，不要猜测或修改文件。

用户不需要手动拼接 CLI 命令。只要提供 Skill 名称、被测项目位置（当前工作目录、自然语言路径或已打开的项目）和测试要求，Agent 就应该自动完成路径解析、CLI 定位、环境检查、setup 计划、依赖安装、测试配置生成、测试执行和 evidence 读取。

## 不适用场景

- 移动端应用测试。
- 只需要浏览器网站测试的任务。
- 用户明确只要截图/OCR 回放，而项目已有结构化 DOM、WebView 或 Accessibility 接口。
- 未经用户确认就修改项目、安装依赖或启动客户端。

## 工作流

按以下顺序执行，不跳过项目诊断和 setup 计划：

```text
intake -> doctor -> strategy -> setup-plan -> confirmation -> setup
       -> explore-or-run -> evidence -> deterministic-result -> diagnosis
```

每一步都必须保留机器可读结果；setup 变更前必须先展示 dry-run 计划并获得用户确认。

### Agent 自动编排

1. 从用户消息、当前工作目录和已打开文件中解析被测项目根目录；如果只有一个合理候选，直接使用；有多个候选时要求用户选择。
2. 自动定位 ClientTrail CLI：优先使用当前仓库的 `pnpm client-test`，否则查找包含 `packages/cli/src/main.ts` 的 ClientTrail checkout；找不到时报告安装位置，不要求用户手写内部路径。
3. 自动执行 `doctor --json`，结合用户声明和项目实际文件选择适配器。
4. 若项目尚未接入测试，自动执行 `setup --dry-run --json`，用自然语言汇总将安装的依赖、创建/修改的文件和风险，并只请求一次确认。
5. 用户确认后自动执行 `setup --yes`；若命令失败，停止后续测试并报告具体依赖或权限错误。
6. 自动执行确定性回归；探索或录制只在用户明确要求时启动 MCP。
7. 自动读取最近一次 evidence，给出通过/失败、最小复现命令、证据文件和可优化项。

用户只要求“测试一下”时，默认执行 doctor → setup 计划 → 请求确认 → setup → run → evidence；不要把内部命令列表当作用户前置工作。

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

源码可修改时使用白盒模式。只有安装包或第三方二进制时使用黑盒模式。不要为了统一接口而牺牲 DOM、IPC、Rust 或 Main Process 的可观测性。

## 3. 安装前确认

先自动调用：

```text
client-test setup --project <project-root> --dry-run --json
```

向用户展示依赖、待创建文件、待修改文件、命令和 `productionRisk`。没有用户明确确认时不要修改项目。不要覆盖已有测试配置；冲突必须停止并报告具体字段。用户确认后由 Agent 自动执行 setup，不要求用户复制命令。

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
6. 已修改文件、安装的依赖和用户需要复核的风险。
7. 未验证的平台能力和下一步建议。

不得把 AI 推断写成测试框架结果；不得编造通过率、截图、日志或业务状态。

## 安全约束

- setup 默认只读；必须先 dry-run。
- 所有路径必须位于项目根目录或 `.client-test` 目录。
- 测试插件只允许在 Debug/Test feature 中启用。
- Release 检查发现测试端口、测试插件或重置接口泄漏时必须失败。
- 证据默认脱敏 Authorization、Cookie、Token、API Key、Secret 和 Password。
- 不自动执行来源不明的 shell 字符串；命令使用 executable、args、cwd 三元组。
