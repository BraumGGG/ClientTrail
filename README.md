# ClientTrail

面向 AI Agent 的桌面客户端确定性测试编排工具。

ClientTrail 不替代 Playwright、WebdriverIO、pytest 或 cargo test，而是把这些执行器与桌面客户端的 WebView、CDP、Accessibility、API、事件和持久化证据编排成可复现的测试流程。

## 五分钟快速开始

### 1. 安装并检查项目

```powershell
pnpm install
pnpm exec tsx packages/cli/src/main.ts doctor --project <被测项目目录> --json
```

`doctor` 只读检查项目和环境，并输出 capability 矩阵。示例：

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

状态含义：`available` 可执行；`partial` 部分可用；`not_configured` 缺少项目入口；`environment_blocked` 环境阻塞；`isolation_blocked` 资源冲突；`not_verified` 证据不足。

### 2. 只读执行已有测试

```powershell
pnpm exec tsx packages/cli/src/main.ts run --project <被测项目目录> --all --json
```

正式项目默认只读。运行产物只写入被测项目的 `.client-test/artifacts`，不会修改源码、依赖或业务配置。

### 3. 在隔离目录接入测试入口

如果项目没有可连接的 CDP、WebDriver、Accessibility helper 或测试命令，先在隔离副本/worktree 中生成计划：

```powershell
pnpm exec tsx packages/cli/src/main.ts setup --project <隔离目录> --dry-run --json
```

审阅依赖、文件、命令和 `productionRisk`，得到明确确认后才执行：

```powershell
pnpm exec tsx packages/cli/src/main.ts setup --project <隔离目录> --yes
pnpm exec tsx packages/cli/src/main.ts run --project <隔离目录> --all --json
```

不要在正式项目目录执行 `setup --yes`。隔离 setup 的修改不会复制回正式项目。

### 4. 读取证据和生成复现包

```powershell
pnpm exec tsx packages/cli/src/main.ts evidence --project <被测项目目录> --json
pnpm exec tsx packages/cli/src/main.ts evidence --project <被测项目目录> --run <run-id> --file result.json --json
pnpm exec tsx packages/cli/src/main.ts diagnose --project <被测项目目录> --result <run目录>\\result.json --repro --json
```

失败复现包写入对应 evidence 目录的 `repro/`，不会上传到仓库。

## Skill、MCP 和 CLI

在 Codex 中安装 `skill/` 后，可以直接说：

```text
使用 $clienttrail-desktop-testing 测试当前 Tauri 2 项目，验证登录、创建任务、暂停恢复和退出登录。正式项目保持只读；如果缺少测试入口，先给出 setup dry-run 并等待我确认。
```

Skill 负责理解目标、选择策略、读取证据和解释结果；CLI 负责确定性执行；MCP 只用于探索、录制和生成测试草稿，不是回归测试的必经链路。

需要探索时启动 MCP：

```powershell
pnpm exec tsx packages/cli/src/main.ts mcp
```

## 支持范围

- Tauri 2：当前优先验证。
- Electron：已有适配器接口，持续补充真实项目验证。
- Windows 原生：UI Automation 协议适配器。
- macOS 原生：Accessibility 协议适配器，完整 helper 仍需平台验证。
- Python：pytest；Rust：cargo test。

欢迎社区贡献 Electron、macOS、Windows fixture、适配器和兼容性数据。真实项目日志、缓存、凭据和私有测试数据不应提交到仓库。

## 安全模型

- 正式项目默认只读，setup 只能在隔离副本或临时 worktree 中执行。
- setup 必须先 dry-run，再单独确认。
- 测试插件必须通过 `client-test` Cargo feature 或等效 Debug/Test 门控隔离。
- Release 构建不得启用测试 feature、远程调试参数或 reset 接口。
- 证据默认脱敏 Token、Cookie、Authorization、Secret 和 Password。

## 开发

```powershell
pnpm exec tsc -b --pretty false
pnpm test
pnpm test:contract
```

Tauri fixture 位于 `fixtures/tauri-basic`。平台 E2E 测试需要 Rust registry、桌面 SDK 和自动化权限。

## 许可证和贡献

本项目使用 Apache License 2.0。贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [SECURITY.md](SECURITY.md)。分发本项目或其衍生作品时，请一并保留 `LICENSE` 和 `NOTICE`。
