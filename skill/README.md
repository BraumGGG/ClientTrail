# ClientTrail Desktop Testing Skill

ClientTrail Desktop Testing 是一个可被 AI 直接调用的桌面客户端测试 Skill，面向 Tauri 2、Electron、Windows 原生 UI 和 macOS Accessibility UI。

## 解决的问题

它把 AI 探索与确定性回归分开：AI 可以探索、录制、生成测试和诊断失败；真正的回归由 WebdriverIO、Playwright、pytest、cargo test 或 Accessibility 适配器执行，不依赖 OCR 和截图猜测。

## 适用范围

- Tauri 2 桌面项目，优先支持。
- Electron 桌面项目。
- Windows UI Automation 和 macOS Accessibility 项目。
- 可选的 Python/Rust 后端规则测试。

不支持移动端，也不把 MCP 作为回归测试的必经链路。

## 安装

### Codex

将本目录复制或链接到 Codex Skill 目录：

```powershell
Copy-Item -Recurse skill "$env:USERPROFILE\\.codex\\skills\\clienttrail-desktop-testing"
```

也可以在 ClientTrail 仓库根目录直接显式调用：

```text
$clienttrail-desktop-testing
```

### Claude Code 或其他 Agent

将 `skill/SKILL.md` 所在目录注册为 Agent Skills 目录，并保留 `references/` 和 `agents/` 子目录。

## 使用方式

最简单的用法是直接告诉 AI 使用 Skill，并说明项目和测试目标，不需要手动运行 CLI：

```text
使用 $clienttrail-desktop-testing 测试我当前打开的 Tauri 2 项目，验证登录、创建记录和退出登录流程。自动完成环境检查和测试配置；修改项目之前先把计划告诉我。
```

Agent 会自动完成：识别项目根目录或实际子项目 → 定位 ClientTrail checkout → 检查环境 → 输出 capability 矩阵 → 优先运行已有测试 → 只有缺少入口时才提出隔离 setup 计划 → 读取日志并给出结论。ClientTrail 不要求安装成全局命令，Agent 应从 checkout 目录通过 `pnpm client-test` 调用。

向 AI 提供被测项目路径和技术栈，例如：

```text
使用 $clienttrail-desktop-testing 测试 D:\\Projects\\MyTauriApp，这是一个 Tauri 2 项目。先检查环境，再生成 setup 计划；我确认后再安装依赖并运行回归测试。
```

Skill 会调用 ClientTrail CLI：

```powershell
pnpm client-test doctor --project <project-root> --json
pnpm client-test setup --project <project-root> --dry-run --json
pnpm client-test run --project <project-root> --json
pnpm client-test evidence --project <project-root> --json
```

测试完成后可以让 AI 读取临时日志：

```powershell
pnpm client-test evidence --project <project-root> --json
pnpm client-test evidence --project <project-root> --run <run-id> --file result.json --json
pnpm client-test evidence --project <project-root> --run <run-id> --file stderr.log --tail 200
```

evidence 命令只读 `.client-test/artifacts`，不会上传或修改用户项目。

### 能力矩阵

`doctor --json` 会返回 `capabilities` 字段，让 AI 和人都能看到当前项目到底能测什么：

```text
webview                  available
embeddedWebDriver        not_configured
faultInjection           not_configured
multiInstanceIsolation   not_configured
provenance               partial
providerReplay           not_configured
```

能力矩阵不是测试通过结论。`available` 只表示入口已发现；真正执行后仍需检查 run evidence、业务断言和证据完整性。

### setup 的安全边界

正式项目默认只读。缺少测试入口时，Skill 先解释原因并生成 `setup --dry-run`；只有用户明确确认且目标是隔离副本/worktree，才执行 setup。setup 可能增加测试依赖、配置、测试草稿和 Debug/Test 接线，但不会把这些修改复制回正式项目。

## 高级测试能力

在真实项目中使用故障矩阵、长时间稳定性或多实例并发测试时，Skill 会先检查：

- 故障注入能力是否由当前 adapter 或项目测试入口提供；
- 每个实例的端口、数据目录、数据库、二进制和资源是否隔离；
- 客户端、外部依赖、资源目录和配置的 provenance 是否完整；
- Provider 使用的是 `live`、`record` 还是 `replay` 模式；
- 前置失败是否会阻塞后续用例，以及当前测试预算是否足够。

不支持的能力会标记为未配置或未验证，不会被自动伪造成通过。详细字段见 `references/advanced-capabilities.md`。

## 依赖和权限

- Node.js 20+、pnpm 11+。
- Tauri 项目需要 Rust stable、Windows/macOS 桌面构建工具。
- Electron 项目需要可用的 Electron runtime 和 Playwright。
- Windows 原生需要 UI Automation helper；macOS 原生需要 Accessibility 权限和 helper。
- setup 和运行测试可能修改被测项目测试文件、配置和本地构建产物；执行前必须确认。
- 默认不上传用户项目、原始日志或凭据；evidence 会脱敏常见 Token、Cookie、Authorization、Secret 和 Password。

## 已知限制

- macOS AX helper 目前是协议层，尚未提供完整系统 helper。
- Windows `winapp` helper 需要用户自行安装。
- AI 探索得到的测试必须经过生成和验证，不能直接视为回归通过。
- 真实桌面构建受本机 SDK、Rust、WebView2、权限和网络环境影响。

## 常见工作流

| 场景 | 入口 | 是否修改正式项目 |
| --- | --- | --- |
| 检查环境和能力 | `doctor --json` | 否 |
| 执行已有回归 | `run --all --json` | 否 |
| 查看最近证据 | `evidence --json` | 否 |
| 失败诊断和复现包 | `diagnose --repro --json` | 否 |
| 新增测试入口 | 隔离目录 `setup --dry-run` → 确认 → `setup --yes` | 否 |
| AI 探索和录制 | `mcp` | 仅写入允许的探索/证据目录 |

## 测试

在仓库根目录运行：

```powershell
pnpm typecheck
pnpm test
pnpm --dir fixtures/electron-basic test:e2e
pnpm --dir fixtures/tauri-basic exec wdio run wdio.conf.ts --logLevel silent
```

## 许可证和贡献

本 Skill 使用 Apache License 2.0。单独分发 Skill 时，请一并保留本目录中的 `LICENSE` 和 `NOTICE`。
