# Client Test

面向桌面客户端的 AI 辅助确定性测试工具。

Client Test 将 AI 探索与回归执行分离：

```text
Skill -> MCP exploration -> recorded actions -> generated test
                                      |
                                      v
                          deterministic CLI + evidence
```

## 支持的适配器

- Tauri 2：WebdriverIO Tauri Service、Windows/macOS 测试构建
- Electron：Playwright 测试运行器
- Python：pytest
- Rust：cargo test
- Windows 原生：UI Automation 命令协议
- macOS 原生：Accessibility helper 协议

## 快速开始

```powershell
pnpm install
pnpm exec tsx packages/cli/src/main.ts doctor --json
pnpm exec tsx packages/cli/src/main.ts setup --dry-run --json
```

审阅 setup 计划后执行：

```powershell
pnpm exec tsx packages/cli/src/main.ts setup --yes
pnpm exec tsx packages/cli/src/main.ts run --all --json
```

构建后，如果其他项目或 Agent 需要调用 CLI，可以将它注册为本机全局命令：

```powershell
pnpm build
pnpm link --global
client-test doctor --project <project-root> --json
```

通过 MCP 进行探索：

```powershell
pnpm exec tsx packages/cli/src/main.ts mcp
```

## 安全模型

- `setup` 默认只生成 dry-run 计划。
- setup 路径必须位于项目根目录内。
- 测试插件必须通过 `client-test` Cargo feature 隔离。
- Release 构建不得启用测试 feature 或诊断接口。
- 证据会脱敏常见 Token、Cookie、Authorization header 和 Secret。
- AI 诊断不能修改原始测试状态。

## 开发

```powershell
pnpm exec tsc -b --pretty false
pnpm test
pnpm test:contract
```

Tauri fixture 位于 `fixtures/tauri-basic`。平台 E2E 测试需要可用的 Rust registry 和桌面自动化权限。
