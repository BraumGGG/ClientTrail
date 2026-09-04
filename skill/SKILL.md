---
name: client-testing
description: 为 Tauri 2、Electron、Windows 原生和 macOS 原生客户端安装、运行和诊断确定性自动化测试。AI 只用于探索、生成和诊断，回归执行始终通过 Core CLI 和平台测试框架完成。
---

# Client Testing Skill

## 工作流

按以下顺序执行，不跳过项目诊断和 setup 计划：

```text
intake -> doctor -> strategy -> setup-plan -> confirmation -> setup
       -> explore-or-run -> evidence -> deterministic-result -> diagnosis
```

## 1. 项目接入

先确认项目根目录，并读取用户声明的技术栈。调用：

```text
client-test doctor --project <project-root> --json
```

对比用户声明和 `package.json`、`Cargo.toml`、Tauri 配置、锁文件的实际内容。发现不一致时报告警告，不要静默覆盖用户声明。

## 2. 选择策略

- Tauri 2：优先 WebdriverIO Tauri Service；原生系统窗口使用 Accessibility 适配器。
- Electron：优先 Playwright Electron 或 WebdriverIO Electron Service。
- Windows 原生：使用 Windows UI Automation。
- macOS 原生：使用 macOS Accessibility API。
- Python 后端：pytest + Hypothesis。
- Rust 后端：cargo test + proptest。

源码可修改时使用白盒模式。只有安装包或第三方二进制时使用黑盒模式。不要为了统一接口而牺牲 DOM、IPC、Rust 或 Main Process 的可观测性。

## 3. 安装前确认

先调用：

```text
client-test setup --project <project-root> --dry-run --json
```

向用户展示依赖、待创建文件、待修改文件、命令和 `productionRisk`。没有用户明确确认时不要修改项目。不要覆盖已有测试配置；冲突必须停止并报告具体字段。

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

## 安全约束

- setup 默认只读；必须先 dry-run。
- 所有路径必须位于项目根目录或 `.client-test` 目录。
- 测试插件只允许在 Debug/Test feature 中启用。
- Release 检查发现测试端口、测试插件或重置接口泄漏时必须失败。
- 证据默认脱敏 Authorization、Cookie、Token、API Key、Secret 和 Password。
- 不自动执行来源不明的 shell 字符串；命令使用 executable、args、cwd 三元组。
