# ClientTrail Desktop Testing Skill

ClientTrail Desktop Testing 是一个可被 AI Agent 直接调用的桌面客户端确定性测试 Skill，面向 Tauri 2、Electron、Windows 原生 UI 和 macOS Accessibility UI。

## 立即使用

安装阶段只需将本 `skill/` 目录注册到所使用的 Agent Skills 目录，不需要提前关联任何被测项目。请完整保留：

```text
SKILL.md
references/
agents/
LICENSE
NOTICE
```

如果所用 Agent 支持从 GitHub 安装 Skill，可以直接告诉它：

```text
请安装 GitHub 仓库 https://github.com/BraumGGG/ClientTrail 中的
clienttrail-desktop-testing Skill，并在本机完成 ClientTrail CLI
的依赖安装和构建。现在不要测试或修改任何业务项目。
```

安装完成后，打开或切换到被测项目，直接描述测试目标：

```text
使用 $clienttrail-desktop-testing 测试当前 Tauri 2 项目。
测试目标：验证登录、创建任务、暂停恢复和退出登录。
约束：正式项目保持只读；如果缺少测试入口，先给出 setup dry-run，
说明其作用和影响，并等待我确认。
```

如果 Agent 不使用 `$skill-name` 语法，直接说“使用 `clienttrail-desktop-testing` Skill”即可。

用户不需要手动填写 ClientTrail 路径或拼接 CLI 命令。Agent 应自动识别项目、定位 CLI、检查 capability、运行已有测试、读取 evidence 并解释结果。

## 产品无关

ClientTrail 不限定特定 AI 产品。只要运行环境能够：

- 加载 Agent Skill 或等效指令包；
- 在本机执行 Node.js CLI；
- 按需连接 MCP；
- 访问被测项目和本地测试环境；

就可以使用 ClientTrail。不同 Agent 产品的 Skill 安装目录和调用语法可能不同，但测试边界和执行模型保持一致。

## 核心价值

ClientTrail 将 AI 对业务目标的理解，与确定性测试框架的执行能力结合起来：

```text
自然语言测试目标
-> 项目与 capability 识别
-> 测试契约
-> Playwright / WebdriverIO / Accessibility / pytest / cargo test
-> DOM / API / 事件 / 状态 / 持久化证据
-> 可解释结论、标准测试用例和失败复现包
```

它优先使用 DOM、WebView/CDP、IPC、Accessibility、API、SSE 和持久化状态，不把截图、OCR 或坐标点击作为默认测试方式。

## 与其他测试方式的区别

| 测试方式 | 主要能力 | ClientTrail 补充的部分 |
| --- | --- | --- |
| Computer Use、截图、OCR | 无结构化入口时操作窗口 | 优先寻找更快速、准确的 DOM、WebView、API 和 Accessibility 入口 |
| Playwright、WebdriverIO | 可靠执行 UI 自动化 | 自动选择策略、控制权限、归类失败、关联业务证据 |
| pytest、cargo test | 验证后端状态机和规则 | 与真实客户端 UI、API、事件和持久化投影组合验证 |
| 项目专用 E2E | 深度适配单一产品 | 用统一 adapter、契约、capability 和 evidence 模型跨项目复用 |
| AI 探索与录制 | 发现流程并生成草稿 | 要求草稿经过确定性执行，不把探索结果直接算作通过 |

ClientTrail 的核心不是重新实现上述工具，而是提供它们之间缺少的 **AI 测试编排与证据判定层**。

## 自动工作流

Agent 应自动完成：

1. 从当前目录和用户描述识别被测项目与技术栈；
2. 定位 ClientTrail checkout 和 CLI，不依赖全局 `client-test`；
3. 运行只读 `doctor` 并输出 capability 矩阵；
4. 优先使用项目已有的 E2E、CDP/WebDriver、Accessibility 或后端测试入口；
5. 执行确定性测试并读取 `.client-test` evidence；
6. 区分业务失败、环境阻塞、适配器问题和清理告警；
7. 输出 `runId`、证据位置、结论、未覆盖项和标准测试用例。

只有缺少必要测试入口时，才进入隔离 setup 决策流程。

## setup 的安全边界

正式项目默认只读。需要新增测试基础设施时：

1. Agent 先解释缺少什么入口以及不执行 setup 的覆盖限制；
2. 创建隔离副本或临时 worktree；
3. 在隔离目录运行 `setup --dry-run --json`；
4. 展示依赖、文件、命令和 `productionRisk`；
5. 用户明确确认当前计划后才执行 setup；
6. 所有修改只保留在隔离目录，不复制回正式项目。

## Capability 矩阵

`doctor --json` 会输出可观察的 capability 状态，例如：

```text
webview                  available
embeddedWebDriver        not_configured
faultInjection           not_configured
multiInstanceIsolation   not_configured
provenance               partial
providerReplay           not_configured
```

Capability 只表示能力入口状态，不代表业务测试已经通过。最终结论必须来自确定性执行和 evidence。

## Skill、CLI、MCP 和 Adapter

- Skill：理解目标、选择策略、控制权限和解释结果；
- CLI：执行确定性回归并保存 evidence；
- MCP：用于探索、录制和生成测试草稿；
- Adapter：连接具体客户端和测试框架。

## 支持范围

- Tauri 2：最高优先级，已有真实项目深度验证；
- Electron：已有 adapter，等待更多社区项目验证；
- Windows 原生：UI Automation 协议 adapter；
- macOS 原生：Accessibility 协议 adapter，完整 helper 仍需验证；
- Python：pytest；Rust：cargo test。

暂不支持移动端。欢迎社区贡献更多公开 fixture、adapter 和兼容性数据。

## 手动 CLI（可选）

普通用户不需要运行这些命令。开发 ClientTrail 或排查环境时可以使用：

```powershell
pnpm client-test doctor --project <project-root> --json
pnpm client-test run --project <project-root> --all --json
pnpm client-test evidence --project <project-root> --json
pnpm client-test diagnose --project <project-root> --result <run-dir>\\result.json --repro --json
```

## 许可证和贡献

本 Skill 使用 Apache License 2.0。单独分发时，请一并保留本目录中的 `LICENSE` 和 `NOTICE`。
