# ClientTrail 项目交接文档

更新时间：2026-09-20

## 1. 项目定位

ClientTrail 是一个面向 AI Agent 的桌面客户端确定性测试编排工具，不是新的 UI 自动化底层框架。

它位于 AI Agent 与 Playwright、WebdriverIO、Tauri WebDriver、Accessibility、pytest、cargo test 等执行器之间，负责：

```text
自然语言测试目标
-> 项目识别与能力协商
-> 测试契约
-> 确定性执行器选择
-> DOM/WebView/API/事件/状态/持久化证据采集
-> 失败分类与阻塞传播
-> 可追溯结论、测试用例和失败复现包
```

核心目标是：当 AI Agent 的 Computer Use、截图或 OCR 不可靠时，让 Agent 仍然能够以结构化、快速、可复现的方式测试桌面客户端。

## 2. 当前产品形态

当前项目同时包含三层：

1. **Skill**：`skill/SKILL.md`
   - 给 AI Agent 使用的编排规则；
   - 负责识别项目、选择策略、控制 setup 权限、读取 evidence 和解释结论；
   - 不绑定 Codex、Claude Code、DeepSeek Harness 等具体产品。

2. **CLI**：`client-test`
   - 负责确定性执行和 evidence 输出；
   - 源码入口：`packages/cli/src/main.ts`；
   - 仓库根目录的 `scripts/client-test.cjs` 是启动包装器。

3. **MCP**：`packages/mcp`
   - 用于 AI 探索、录制、WebView 操作和测试草稿生成；
   - 不是确定性回归执行的必经链路。

## 3. 当前支持范围

### 已实现或已有入口

- Tauri 2：当前最高优先级，已在真实项目上进行过深度验证；
- Electron：已有 Playwright 运行适配器和 fixture；
- Windows 原生：Windows UI Automation 协议适配器接口；
- macOS 原生：Accessibility 协议适配器接口，完整系统 helper 仍未充分验证；
- Python：pytest 适配器；
- Rust：cargo test 适配器，支持嵌套 Tauri `src-tauri/Cargo.toml` 发现。

### 明确不支持

- 移动端；
- 纯浏览器网站专用测试；
- 在已有结构化入口时仅依赖 OCR/截图进行回归；
- 未经用户确认直接修改正式被测项目。

## 4. 目录结构

```text
packages/core/             通用契约、上下文、证据、诊断、编排模型
packages/cli/              client-test CLI
packages/adapter-tauri/    Tauri 2 检测、doctor、setup、运行器
packages/adapter-electron/ Electron 检测和 Playwright 运行器
packages/adapter-native/   Windows UIA / macOS AX 协议入口
packages/adapter-webview/  WebView session 抽象
packages/adapter-backend/  pytest / cargo test 运行器
packages/mcp/              MCP server 和探索工具
fixtures/tauri-basic/      Tauri 基础 fixture
fixtures/electron-basic/   Electron 基础 fixture
skill/                     可安装的 Agent Skill
docs/                      设计文档、计划和项目交接文档
tests/                     根级 Skill/协议契约测试
.github/workflows/         CI
```

## 5. 核心能力现状

### 5.1 测试契约

已实现：

- `TestContract` 类型；
- `test-contract.json` schema 校验；
- SHA-256 `contractHash`；
- CLI `run --contract <path>`；
- 契约哈希可写入运行汇总和 evidence。

新会话应优先要求生成/冻结契约，再运行：

```powershell
pnpm client-test run --project <project-root> --contract test-contract.json --json
```

### 5.2 统一状态和证据

支持的运行状态：

```text
pending / running / paused / waiting_human / recovering
passed / failed / timeout / cancelled / blocked / error
```

核心文件：`manifest.json`、`result.json`、`state-timeline.json`，以及 stdout/stderr/build 日志。失败时可生成 `repro/` 最小复现包。

### 5.3 Capability 矩阵

`doctor --json` 当前会返回可观察的 `capabilities`，包括：

```text
webview
tauriCommand
embeddedWebDriver
pytest
cargoTest
electron
windows-uia / macos-ax
faultInjection
multiInstanceIsolation
provenance
providerReplay
```

状态包括：`available`、`partial`、`not_configured`、`capability_not_supported`、`environment_blocked`、`isolation_blocked`、`not_verified`。

注意：`available` 表示入口或环境能力可用，不代表业务测试通过。

### 5.4 失败分类和生命周期

已修复一个真实日志暴露的问题：

- session 尚未建立、`onPrepare`、spawn、driver/CDP 启动失败：可归类为 `launch`/`adapter`/`environment`；
- session 已建立并进入业务 spec 后，stderr 中出现 WebDriver 调用栈不能覆盖真实业务失败；
- 业务断言应保留为 `assertion` 或 `backend`；
- 清理失败记录为 `cleanup_warning`，不能覆盖根因。

核心实现：`packages/core/src/orchestration.ts` 中的 `correctFailureKind` 和 `classifyWdioFailure`。

### 5.5 高级能力模型

已经建立通用模型和规则：实例级故障注入控制句柄、多实例资源冲突检测、二进制/资源 SHA-256 provenance、故障矩阵、Provider `live/record/replay`、测试档位、`blocked_by` 传播和失败最小复现包。

其中部分仍是通用模型和执行规则，真正执行依赖具体项目 adapter 返回实例句柄、故障入口、资源分配和 Provider 配置。不能因为 schema 存在就宣称项目已支持。

## 6. 真实项目验证结论

### 已验证较充分

- Tauri 2 真实客户端 WebView/WebDriver 连接；
- embedded WebDriver 启动和业务 spec 执行；
- API、事件、状态、SQLite/持久化投影组合核对；
- 记忆/经验跨项目隔离；
- 部分长时间/重复稳定性、故障矩阵和双实例并发场景；
- Cargo 后端套件和嵌套 `src-tauri/Cargo.toml` 发现。

### 已知真实日志问题

最近一次用户提供的 audit 日志中：

- WebDriver session 成功建立；
- 4 个业务 spec 中 3 个通过、1 个失败；
- `POST /api/run/14/acceptance` 返回 `409 ACCEPTANCE_LIFECYCLE_BLOCKED`；
- 业务状态保持 `PENDING`，测试期望 `ACCEPTED`；
- 旧执行器曾错误地把该结果标成 `adapter`，已在 `49cdeac` 修复；
- embedded provider 下的 `tauri-driver not found` 是可选告警；
- `Failed to clear mock store: A sessionId is required` 是清理告警。

之前用户给出的真实 evidence 目录没有 2026-09-07 之后的新日志。不要假设其中已经有新运行结果。

## 7. 正确使用方式

### 面向普通用户/AI Agent

```text
使用 clienttrail-desktop-testing 测试当前 Tauri 2 项目。
测试目标：验证登录、创建任务、暂停恢复和退出登录。
约束：正式项目保持只读；如果缺少测试入口，先给出 setup dry-run，
说明作用、修改范围和风险，并等待我确认。
```

Agent 应自动识别项目、定位 CLI、执行 `doctor --json`、读取 capability、优先运行已有测试、读取 evidence，并输出通过、失败、环境阻塞、未执行、证据完整性和下一步。

### 手动开发/排障

```powershell
pnpm install
pnpm typecheck
pnpm test
pnpm client-test doctor --project <project-root> --json
pnpm client-test run --project <project-root> --all --json
pnpm client-test evidence --project <project-root> --json
pnpm client-test diagnose --project <project-root> --result <run-dir>\\result.json --repro --json
```

如果没有测试入口，只能在隔离目录中运行 setup：

```powershell
pnpm client-test setup --project <isolated-root> --dry-run --json
# 用户确认当前 setup 计划后
pnpm client-test setup --project <isolated-root> --yes
```

## 8. 重要安全边界

- 正式被测项目默认只读；
- `doctor`、`run`、`evidence`、`diagnose` 不得修改业务源码、配置、依赖或数据库；
- setup 必须隔离、先 dry-run、再单独确认；
- setup 变更不能复制回正式项目；
- 运行产物只允许进入被测项目 `.client-test` 或测试框架既有输出目录；
- 不得把真实项目日志、缓存、凭据、Cookie、Token、截图或数据库快照提交到 ClientTrail；
- 测试插件必须 Debug/Test feature 门控，Release 构建不能泄漏测试入口。

## 9. 当前分支和 Git 状态

当前分支：`main`

当前 HEAD：

```text
a956c49 docs: add open source introduction and video script
```

当前 `main` 比 `origin/main` 超前 1 个本地提交。新会话开始时先执行：

```powershell
git status --short
git log -5 --oneline --decorate
git fetch origin
git status -sb
```

确认本地提交应该公开后再执行：`git push origin main`。不要覆盖或回滚用户未明确要求的本地改动。

## 10. 最近重要提交

```text
a956c49 docs: add open source introduction and video script
ce17493 docs: simplify product-neutral skill onboarding
9d1f187 chore: adopt Apache License 2.0
8ecc9b1 feat: expose adapter capabilities in doctor
2b56b63 docs: add quick start and capability reporting
49cdeac fix: preserve business failures after WebDriver session
cbb3d4c feat: harden orchestration and failure evidence
8bd898c feat: add contract and evidence quality models
```

## 11. 验证状态

截至本交接文档生成时：

```text
pnpm typecheck                         通过
pnpm vitest run --pool=forks ...       通过
测试文件                              35 个通过
测试用例                              56 个通过
Skill quick_validate                   通过
```

测试过程中仍可能出现 Vitest WebSocket `Port is already in use` 警告；本次单 fork 执行退出码为 0，未影响测试结论。

## 12. 当前未完成和建议优先级

### P0：开源发布前检查

- 确认 `a956c49` 是否推送到 GitHub；
- 检查仓库是否误包含 `.client-test`、日志、缓存、真实项目路径或秘密；
- 检查 GitHub README、Skill README 和许可证显示是否正确；
- 确认 Apache-2.0 的 `LICENSE` 和 `NOTICE` 一起存在。

### P1：真实 capability 闭环

- 让 Electron、Windows 原生、macOS 原生 doctor 输出与 Tauri 一样具体；
- 把资源分配、实例句柄、provenance、故障注入能力接入实际 run manifest；
- 将 `business_blocked`、`blocked_by` 和 evidence closure 从模型进一步接入 runner；
- 完善动态 timeout 和测试档位的 CLI 参数。

### P2：跨平台验证

- 增加 Electron 真实项目案例；
- 增加 macOS Accessibility helper 实测；
- 增加 Windows 原生 helper 实测；
- 维护 Node、Rust、Tauri、Electron、WebDriver、Playwright、操作系统兼容矩阵。

### P3：社区生态

- 接收社区贡献的 fixture 和 adapter；
- 增加贡献模板、问题模板、版本发布流程；
- 将失败复现包接入 CI artifact 或测试管理系统。

## 13. 新会话接管建议

新会话开始时，先阅读本文件和以下文件：

```text
README.md
skill/SKILL.md
skill/README.md
skill/references/advanced-capabilities.md
skill/references/failure-diagnosis.md
packages/core/src/contracts.ts
packages/core/src/orchestration.ts
packages/core/src/evidence.ts
packages/cli/src/main.ts
```

然后按下面顺序工作：

1. 检查 Git 状态和远端差异；
2. 不读取或提交真实项目 evidence，除非用户明确要求只读复盘；
3. 先运行 `pnpm typecheck` 和定向测试；
4. 如果要修改 Skill，保持产品无关和正式项目只读边界；
5. 如果要修改执行器，为失败场景先添加回归测试；
6. 完成后更新本交接文档中的状态、提交号和验证结果。

## 14. 一句话总结

ClientTrail 当前已经是一个可开源、可实际使用的桌面客户端测试 Skill/CLI 原型，Tauri 2 是验证最充分的方向；下一阶段重点不是继续堆概念，而是把 capability、provenance、实例隔离和跨平台 adapter 从通用模型继续接入真实执行闭环。
