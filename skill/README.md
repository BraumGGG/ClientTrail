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

Agent 会自动完成：识别项目根目录或实际子项目 → 定位 ClientTrail checkout → 检查环境 → 生成 setup 计划 → 请求一次确认 → 安装依赖和生成配置 → 运行测试 → 读取日志并给出优化建议。ClientTrail 不要求安装成全局命令，Agent 应从 checkout 目录通过 `pnpm client-test` 调用。

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

## 高级测试能力

在真实项目中使用故障矩阵、长时间稳定性或多实例并发测试时，Skill 会先检查：

- 故障注入能力是否由当前 adapter 或项目测试入口提供；
- 每个实例的端口、数据目录、数据库、二进制和资源是否隔离；
- 客户端、sidecar、资源目录和配置的 provenance 是否完整；
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

## 测试

在仓库根目录运行：

```powershell
pnpm typecheck
pnpm test
pnpm --dir fixtures/electron-basic test:e2e
pnpm --dir fixtures/tauri-basic exec wdio run wdio.conf.ts --logLevel silent
```

## 许可证和贡献

本 Skill 使用 MIT 许可证。贡献前请阅读仓库根目录的 `CONTRIBUTING.md` 和 `SECURITY.md`。
