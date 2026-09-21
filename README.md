# ClientTrail

面向 AI Agent 的桌面客户端确定性测试编排工具。

ClientTrail 让 AI 不只会“操作桌面客户端”，还能够理解测试目标、选择结构化测试入口、运行确定性测试、核对业务证据，并给出可复现的测试结论。

## 一分钟开始

### 1. 安装一次

安装阶段只安装 ClientTrail，不需要选择或关联被测项目。可以直接告诉支持 Agent Skills 的 AI Agent：

```text
请安装 GitHub 仓库 https://github.com/BraumGGG/ClientTrail 中的
clienttrail-desktop-testing Skill，并在本机完成 ClientTrail CLI
的依赖安装和构建。现在不要测试或修改任何业务项目。
```

也可以手动克隆仓库，并将 `skill/` 目录注册到所使用的 Agent Skills 目录。不同 Agent 产品的目录和注册方式可能不同，但应完整保留 `SKILL.md`、`references/`、`agents/`、`LICENSE` 和 `NOTICE`。

### 2. 直接描述测试要求

安装后，不需要手动填写路径配置或拼接 CLI 命令。打开或切换到被测项目，然后告诉 Agent：

```text
使用 $clienttrail-desktop-testing 测试当前 Tauri 2 项目。
测试目标：验证登录、创建任务、暂停恢复和退出登录。
约束：正式项目保持只读；如果缺少测试入口，先给出 setup dry-run，
说明其作用和影响，并等待我确认。
```

如果所用 Agent 不使用 `$skill-name` 语法，直接说“使用 `clienttrail-desktop-testing` Skill”即可。

Agent 应自动完成：

```text
识别当前项目和技术栈
-> 定位 ClientTrail CLI
-> 只读检查环境与 capability
-> 选择已有的结构化测试入口
-> 执行确定性测试
-> 读取 evidence
-> 区分业务失败、环境阻塞和适配器错误
-> 输出结论与标准测试用例
```

只有项目确实缺少自动化入口时，Agent 才会提出 setup。setup 必须先在隔离副本或临时 worktree 中生成 dry-run，并在你确认后执行；正式项目不会被修改。

## 为什么需要 ClientTrail

桌面客户端测试通常分散在多套工具中：WebView 使用 WebDriver/CDP，Electron 使用 Playwright，原生窗口依赖 Accessibility，后端规则又需要 pytest 或 cargo test。AI Agent 虽然能调用这些工具，但经常缺少统一的项目识别、权限边界、失败分类和证据判定。

ClientTrail 位于这些确定性执行器之上，负责把自然语言测试要求转换成一条可审计的测试流程：

```text
自然语言目标
-> 测试契约
-> 技术栈与 capability 识别
-> Playwright / WebdriverIO / Accessibility / pytest / cargo test
-> DOM / API / 事件 / 状态 / 持久化证据
-> 可解释结论
-> 可读测试用例与失败复现包
```

## 与其他方案的区别

| 方案 | 擅长的事情 | 常见限制 | ClientTrail 的作用 |
| --- | --- | --- | --- |
| Computer Use、截图和 OCR | 不需要测试入口也能操作几乎任何窗口 | 定位易受布局影响，速度较慢，难以可靠读取内部状态 | 只在安装流程、原生窗口或最终视觉抽查时降级使用 |
| Playwright、WebdriverIO、Tauri Driver | DOM、WebView 和 Electron 自动化准确且可重复 | 通常需要项目自行选择框架、配置入口并解释结果 | 自动选择和编排这些执行器，不重新实现它们 |
| pytest、cargo test | 后端规则、状态机和数据逻辑验证稳定 | 无法独立证明真实客户端 UI 和业务投影一致 | 与客户端、API、事件和持久化证据组合验证 |
| 项目专用 E2E 脚本 | 对单个产品非常贴合 | 难以跨项目复用，AI 需要重新理解运行方式 | 通过 adapter、测试契约和统一 evidence 模型复用流程 |
| 单纯的 AI GUI 探索或录制 | 适合发现页面和生成操作草稿 | 一次探索不能等同于确定性回归通过 | AI 负责探索和诊断，测试框架负责最终执行和判定 |

ClientTrail 不与这些工具竞争。它补齐的是它们之间缺少的 **AI 测试编排与证据判定层**。

## 最大优势

ClientTrail 最大的优势是：

> 将 AI 对业务目标的理解，与确定性测试框架的可重复执行结合起来，同时保留可审计、可解释、可复现的测试证据。

它优先读取结构化信息，而不是只观察屏幕：

- DOM、WebView、CDP 和 WebDriver session；
- Accessibility Tree、role、label 和 AutomationId；
- API 响应、SSE、事件游标和状态转换；
- SQLite、数据库投影、缓存或其他持久化状态；
- 进程、PID、监听端口、二进制与资源 provenance；
- `runId`、测试契约、manifest 和失败时间线。

因此它不只回答“按钮有没有被点击”，还可以回答“这次操作是否真正改变了正确的业务状态，而且 UI、API、事件和持久化结果是否一致”。

## 能提供的价值

### 对开发者

- 用自然语言调用已有测试能力，不必反复向 Agent 解释项目结构和命令；
- 明确区分产品缺陷、构建问题、测试入口问题和清理告警；
- 正式项目默认只读，避免 AI 为了跑通测试擅自修改业务代码；
- 失败后生成脱敏的证据和最小复现包。

### 对测试人员

- 将测试目标冻结为契约，避免执行过程中临时改变通过标准；
- 自动整理业务步骤、实际结果、证据引用和标准测试用例；
- 支持恢复、故障注入、多实例隔离、长时测试和负向断言的统一表达；
- 前置失败会传播为 `blocked/blocked_by`，减少无意义的级联失败。

### 对 AI Agent

- 在 Computer Use 不可用或不可靠时，仍可通过结构化入口测试桌面客户端；
- 自动发现项目根目录、Tauri 子目录、Cargo manifest 和已有 E2E 配置；
- 不把截图推断或 AI 判断伪装成测试框架结果；
- 能读取历史 evidence 继续诊断和优化测试策略。

### 对团队和 CI

- 获得统一的 capability、状态、证据和失败分类模型；
- 可以按 `runId` 追踪测试命令、构建来源和业务证据；
- live、record、replay 和不同测试档位分别统计；
- 后续可以接入质量门禁、测试管理系统和持续集成。

## Capability 矩阵

`doctor --json` 会只读检查当前项目，并明确告诉 Agent 哪些能力真实可用：

```json
{
  "capabilities": {
    "webview": { "status": "available", "source": "tauri-2 adapter" },
    "embeddedWebDriver": { "status": "not_configured", "source": "Cargo feature/client-test" },
    "faultInjection": { "status": "not_configured", "source": "adapter capability negotiation" },
    "multiInstanceIsolation": { "status": "not_configured", "source": "isolation preflight" },
    "provenance": { "status": "partial", "source": "run manifest" }
  }
}
```

- `available`：当前项目和环境可以执行；
- `partial`：部分证据或子能力可用；
- `not_configured`：工具支持，但项目尚未提供入口；
- `capability_not_supported`：当前 adapter 不支持；
- `environment_blocked`：能力存在，但环境无法执行；
- `isolation_blocked`：多实例资源存在冲突；
- `not_verified`：执行过，但证据不足以证明结论。

Capability 可用不等于业务测试通过，最终结论仍以真实执行和 evidence 为准。

## Skill、MCP 和 CLI

- **Skill**：理解目标、选择策略、控制权限、读取证据和解释结论；
- **CLI**：运行确定性回归、输出状态和保存 evidence；
- **MCP**：用于探索、录制和生成测试草稿，不是回归测试的必经链路；
- **Adapter**：连接 Tauri、Electron、WebView、Accessibility 和后端测试框架。

ClientTrail 不绑定某个 AI 产品。只要 Agent 能加载 Skill，并能在本机调用 CLI 或 MCP，就可以接入。

## 手动安装与 CLI（可选）

只有开发 ClientTrail、排查安装问题或不使用 Agent Skill 时，才需要手动运行：

```powershell
git clone https://github.com/BraumGGG/ClientTrail.git
cd ClientTrail
pnpm install
pnpm build
```

常用命令：

```powershell
pnpm client-test doctor --project <被测项目目录> --json
pnpm client-test run --project <被测项目目录> --all --json
pnpm client-test evidence --project <被测项目目录> --json
pnpm client-test diagnose --project <被测项目目录> --result <run目录>\\result.json --repro --json
```

每次 `client-test run` 只生成一个 `runId`。当提供测试契约时，required objective 必须全部获得终态；执行器退出码为 0 但目标或必需 evidence 缺失时，结果会标记为 `evidence_incomplete`，不会报告为无条件通过。

最终报告会把业务结论与运行告警分开列出，包括 required objective 计数、`cleanupWarning`、stderr warning，以及多实例预期事实与实际 provenance 的不一致。

如果项目缺少测试入口，只能在隔离目录中执行：

```powershell
pnpm client-test setup --project <隔离目录> --dry-run --json
# 用户确认当前计划后
pnpm client-test setup --project <隔离目录> --yes
```

## 支持范围

- Tauri 2：当前最高优先级，已有真实项目深度验证；
- Electron：已有 adapter 和确定性运行入口，等待更多社区项目验证；
- Windows 原生：UI Automation 协议 adapter；
- macOS 原生：Accessibility 协议 adapter，完整 helper 仍需平台验证；
- Python：pytest；Rust：cargo test。

暂不支持移动端。欢迎社区贡献 Electron、Windows 原生、macOS 原生 fixture、adapter 和兼容性数据。

## 安全模型

- 正式项目默认只读；
- setup 只能在隔离副本或临时 worktree 中执行；
- setup 必须先 dry-run，再对当前计划单独确认；
- 测试插件必须通过 `client-test` feature 或等效 Debug/Test 门控隔离；
- Release 构建不得启用测试 feature、远程调试参数或重置接口；
- evidence 默认脱敏 Token、Cookie、Authorization、Secret 和 Password；
- 真实项目日志、缓存、凭据和私有测试数据不得提交到 ClientTrail 仓库。

## 开发 ClientTrail

```powershell
pnpm typecheck
pnpm test
pnpm test:contract
```

## 更新日志

每次实质更新都会在 [CHANGELOG.md](CHANGELOG.md) 中说明新增、修改、修复和验证结果。Skill 独立分发内容另见 [skill/CHANGELOG.md](skill/CHANGELOG.md)。

## 许可证和贡献

本项目使用 Apache License 2.0。贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [SECURITY.md](SECURITY.md)。分发本项目或其衍生作品时，请一并保留 `LICENSE` 和 `NOTICE`。
