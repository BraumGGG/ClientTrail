# 通用客户端自动化测试 Skill 设计说明

## 背景与目标

目标是创建一个公开 GitHub 项目，为 Tauri 2、Electron、Windows 原生应用和 macOS 原生应用提供统一的 AI 辅助测试能力。

项目必须同时支持两种模式：

1. AI 探索模式：分析项目、安装依赖、启动应用、读取结构化 UI、探索流程、录制动作并生成测试。
2. 确定性回归模式：脱离 LLM，直接运行生成后的测试，输出稳定退出码、断言结果和证据包。

核心成功标准不是“AI 能点击客户端”，而是“AI 能生成可重复执行、可审计、适合 CI 的客户端测试”。

## 设计原则

1. AI 可以探索、生成和诊断，但不能作为业务测试通过与否的主要裁判。
2. MCP 只服务交互式探索，不进入确定性回归的必经链路。
3. 优先复用成熟测试框架，不重新实现 DOM、WebDriver、UI Automation 或 Accessibility 驱动。
4. 源码可修改时使用白盒测试；只有二进制时自动降级为黑盒测试。
5. 所有测试后端通过统一适配器协议接入，但保留各平台原生能力。
6. 测试插件和诊断接口必须在生产构建中被编译期移除。
7. 每次失败都应产生统一、机器可读的证据包。

## 支持矩阵

| 应用类型 | 白盒主驱动 | 黑盒补充 | 首版优先级 |
| --- | --- | --- | --- |
| Tauri 2 | WebdriverIO Tauri Service | Windows UIA、macOS AX、Windows CDP 诊断 | P0 |
| Electron | Playwright Electron 或 WebdriverIO Electron Service | Windows UIA、macOS AX、CDP | P1 |
| Windows 原生 | 项目自身单元/集成测试 | UI Automation | P1 |
| macOS 原生 | 项目自身单元/集成测试 | AXUIElement | P1 |

首个可发布里程碑只实现 Tauri 2 白盒链路、后端测试适配、统一证据协议和 Skill 编排。其余平台共享相同核心协议，在后续里程碑中加入。

## 方案对比

### 方案一：Skill 直接调用 MCP

- 优点：开发快，交互路径短。
- 缺点：回归测试依赖 AI 会话和 MCP 生命周期，CI 调试困难，结果稳定性差。

### 方案二：Skill + Core CLI + Adapter + 可选 MCP

- 优点：探索与回归解耦；CLI 可独立运行；适合 CI；平台能力可插拔；MCP 只承担结构化交互。
- 缺点：需要定义稳定协议和维护适配器生命周期。

### 方案三：常驻跨平台自动化服务

- 优点：适合远程设备池、并行执行和商业化平台。
- 缺点：首版需要解决认证、升级、端口、权限和服务恢复，范围过大。

## 推荐方案

采用方案二。公开项目以 Core CLI 为产品核心，Skill 是面向 Agent 的入口，MCP Server 是可选探索接口，现有测试框架负责实际执行和断言。

## 总体架构

```text
User / Agent
    |
    v
Client Testing Skill
    |-- project intake
    |-- strategy selection
    |-- setup approval
    |-- test generation
    |-- failure diagnosis
    |
    v
Core CLI
    |-- doctor
    |-- inspect
    |-- setup
    |-- explore
    |-- generate
    |-- run
    |-- diagnose
    |
    +--> Adapter Registry
    |      |-- Tauri Adapter
    |      |-- Electron Adapter
    |      |-- Windows Adapter
    |      |-- macOS Adapter
    |      |-- pytest Adapter
    |      `-- cargo-test Adapter
    |
    +--> Evidence Collector
    |
    `--> Optional MCP Server
           `-- inspect / act / capture / record
```

## 组件职责

### Skill

Skill 负责对话和决策，不包含平台自动化实现。

主要流程：

1. 读取项目清单和用户提供的技术栈。
2. 执行 `client-test doctor --json`。
3. 给出将安装或修改的内容，并要求用户确认。
4. 执行 `client-test setup`。
5. 选择探索、生成、运行或诊断流程。
6. 将失败证据交给 AI 分析，但保留原始测试结果。

### Core CLI

CLI 是稳定边界，必须支持无 AI 运行和机器可读输出。

首版命令：

```text
client-test doctor [--json]
client-test inspect [--json]
client-test setup [--dry-run] [--yes]
client-test run [suite] [--json]
client-test evidence <run-id>
client-test mcp
```

所有命令遵循以下约定：

- 成功退出码为 0。
- 配置或环境错误退出码为 2。
- 测试失败退出码为 3。
- 工具内部错误退出码为 4。
- `--json` 模式只向 stdout 输出 JSON，日志写入 stderr。

### Adapter Registry

每个适配器实现同一接口：

```ts
interface TestAdapter {
  readonly id: string;
  detect(context: ProjectContext): Promise<DetectionResult>;
  doctor(context: ProjectContext): Promise<DoctorReport>;
  planSetup(context: ProjectContext): Promise<SetupPlan>;
  applySetup(context: ProjectContext, plan: SetupPlan): Promise<SetupResult>;
  run(context: RunContext): Promise<RunResult>;
}
```

适配器不得直接打印用户输出，也不得修改未列入 `SetupPlan` 的文件。

### Evidence Collector

统一证据目录：

```text
.client-test/artifacts/<run-id>/
  manifest.json
  result.json
  stdout.log
  stderr.log
  backend.log
  frontend-console.jsonl
  event-journal.jsonl
  network.har
  accessibility-tree.json
  screenshot.png
  video.mp4
```

`manifest.json` 记录平台、适配器版本、Git commit、应用版本、测试命令、开始结束时间和敏感数据清理状态。

并非每种驱动都能生成全部文件。缺失项必须在 manifest 中明确记录为 `unsupported`、`disabled` 或 `not-produced`，不能静默忽略。

### MCP Server

MCP 只提供探索工具：

```text
project_status
app_launch
app_stop
ui_snapshot
ui_find
ui_action
ui_wait
evidence_capture
record_start
record_stop
```

MCP 工具返回稳定 JSON，并包含所用适配器、窗口标识、元素定位器和证据引用。回归测试不得通过循环调用这些 MCP 工具执行。

## 白盒与黑盒模式

### 白盒模式

适用于可以修改源码的项目。

- 注入仅用于 Debug/Test 的驱动或插件。
- 能访问 DOM、IPC、应用日志、测试重置和故障注入接口。
- 生成的测试可以直接进入项目测试目录和 CI。

### 黑盒模式

适用于发布包或第三方二进制。

- Windows 使用 UI Automation。
- macOS 使用 Accessibility API。
- Electron 可在允许远程调试时附加 CDP。
- Tauri Windows 可将 WebView2 CDP 作为诊断通道，但不作为跨平台主驱动。

黑盒模式不承诺访问内部 IPC、数据库或应用状态，只验证用户可见行为和 OS 集成。

## Tauri 2 首版策略

Tauri 2 白盒模式采用 WebdriverIO Tauri Service，不自行实现 WebDriver。

首版覆盖：

1. 检测 Tauri 2、前端包管理器和 Rust toolchain。
2. 生成测试专用 Rust 条件依赖和插件初始化补丁。
3. 生成 WebdriverIO 配置和基础测试目录。
4. 启动真实 Tauri 测试构建。
5. 验证 DOM、窗口、Tauri Command 和前后端日志。
6. 收集截图、视频、Console、后端日志和测试报告。
7. 在 Release 构建中扫描并阻止测试插件泄漏。

Windows CDP 只用于补充网络、SSE、Console 和性能诊断。macOS 不依赖 CDP。

## 后端测试策略

Skill 根据用户声明和项目检测结果选择测试框架：

- Python：pytest + Hypothesis。
- Rust：cargo test + proptest。
- Node.js/TypeScript：项目已有测试框架优先，否则推荐 Vitest。

后端测试优先覆盖状态机、权限、审批、checkpoint、事件顺序、幂等性和数据隔离。端到端 UI 测试只覆盖少量关键业务路径，不重复所有规则组合。

## 安装与修改安全

`client-test setup` 必须先生成可审查计划：

```json
{
  "dependencies": [],
  "filesToCreate": [],
  "filesToModify": [],
  "commands": [],
  "productionRisk": "none"
}
```

默认行为：

1. 未传 `--yes` 时不得修改文件。
2. 不覆盖已有测试配置，冲突时生成合并建议。
3. 不自动执行来源不明的项目脚本。
4. 只在项目路径内创建和删除内容。
5. 生产构建发现测试服务、调试端口或测试插件时失败。
6. 日志和证据默认执行 Token、Cookie、Authorization 和常见密钥脱敏。

## 失败诊断

失败分类必须先由确定性规则完成：

```text
environment
build
launch
locator
timeout
assertion
backend
network
crash
security
unknown
```

AI 诊断只能在原始分类、日志和证据之上补充解释，不能修改原始测试状态。

## 测试策略

项目自身需要测试以下内容：

1. Adapter 合同测试。
2. 配置 Schema 和升级测试。
3. `setup --dry-run` 不修改文件。
4. 重复执行 setup 的幂等性。
5. JSON 输出和退出码稳定性。
6. 路径限制与生产构建安全检查。
7. Windows 和 macOS 上的 Tauri Fixture 端到端测试。
8. MCP 与 CLI 对同一 UI Snapshot 返回相同语义结构。
9. 证据包完整性、缺失原因和敏感信息脱敏。

## 发布里程碑

### M1：Tauri 2 核心链路

- Core CLI
- Skill
- Tauri 2 白盒适配器
- pytest/cargo test 适配器
- 证据协议
- 基础 MCP 探索接口
- Windows/macOS CI Fixture

### M2：Electron

- Playwright Electron 适配器
- Electron 多窗口和 Main Process 操作
- Electron 原生窗口补充

### M3：原生桌面

- Windows UI Automation 适配器
- macOS Accessibility 适配器
- 黑盒安装包测试

### M4：高级能力

- 探索录制与测试生成
- Locator 修复建议
- 故障注入
- 远程设备和并行编排

## 风险与控制

1. 上游测试插件快速变化：适配器锁定兼容版本并提供能力探测。
2. 跨平台语义不一致：统一最小协议，平台特性通过 capability 暴露。
3. Agent 生成脆弱定位器：优先 role、label、test id 和稳定属性，禁止默认坐标定位。
4. 测试能力泄漏到生产：条件依赖、Release 扫描和 CI Gate 三重保护。
5. 项目范围过大：每个平台适配器独立发布，不阻塞核心 CLI。

