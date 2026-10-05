# 更新日志

## 2026-10-06

### 新增

- 为一次 CLI 测试请求生成 `requestRunId`，并在 `.client-test/artifacts/<requestRunId>/aggregate-result.json` 写入原子化总结果、suite 关联和选择范围。
- 聚合结果区分 `passed`、`failed`、`error` 和 `blocked`；未配置测试能力使用 `capability_not_configured`，不再伪装成环境故障。
- Tauri 增加独立 `--build-timeout`，默认 300 秒；业务测试 `--timeout` 默认仍为 120 秒。
- 证据增加 producer/adapter 版本、Cargo 测试统计和旧版 objective event 兼容读取。

### 修复

- Windows 超时现在请求终止完整子进程树，减少 npm/Tauri/Cargo 父子进程脱离导致的假超时。
- Tauri 构建在超时边界已经输出完成标记时记录 `buildCompletedNearTimeout`，但不会把未执行的业务测试改判为通过。
- 诊断引用 appA/appB 等实例但没有实例事实时生成明确 evidence warning。

### 验证

- TypeScript 类型检查通过。
- 完整测试：38 个测试文件、86 个测试通过。
- 聚合、未配置能力、分阶段预算、进程树终止、旧 objective 事件和 provenance 告警均有回归测试。

本文件记录 ClientTrail 每次实质更新的功能、行为、修复和验证结果。Skill 独立分发内容的变化同时记录在 [`skill/CHANGELOG.md`](skill/CHANGELOG.md)。

## 2026-09-21

### 新增

- 增加唯一 `runId` 传播，CLI、adapter、测试框架、应用实例和 evidence 可以关联到同一次运行。
- 增加结构化 objective 事件与 required objective 最小闭环，支持 `passed`、`failed`、`blocked` 和 `not_executed`。
- 增加 runner/实例实际事实记录，包括可获得的 executable、PID、端口、数据目录和 sessionId。
- 增加选择性回归规则：直接目标、共享边界补测，以及固定 `uncertain` 条件触发的单次完整回归升级。
- Tauri 运行结果增加首个致命信号、受影响实例、脚本超时、`ECONNREFUSED`、channel closed 和终止 signal 摘要。

### 修改

- evidence finalizer 会读取子进程写入的 `objective-events.json`，并检查事件 `runId` 是否与当前运行一致。
- 测试已经因 timeout、launch、environment 或 adapter 失败时停止当前请求，不自动重跑完整回归。
- 历史通过结果只用于测试范围选择，不计入当前运行的通过数。
- 多实例结果会区分 runner provenance 与应用实例 provenance；缺少 appA/appB 事实时明确标记为未验证。

### 修复

- 修复外层 runner timeout 或适配器失效被错误报告为多个业务 `assertion` 的问题。
- 缺少可定位业务证据的 assertion 会被保守校正：首个目标成为运行级根因，后续同类目标标记为 `blocked`。
- 修复项目测试已写入 objective 事件，但父级 evidence 未读取，导致 required objective 被误判为未执行的问题。
- cleanup warning、stderr warning 和预期/实际事实差异不再被最终摘要遗漏。

### 验证

- TypeScript 类型检查通过。
- 完整测试与契约测试均为 37 个测试文件、78 个测试通过。
- 使用真实双实例失败证据验证：正确识别 appA/appB、脚本执行超时、`ECONNREFUSED`、channel closed 和 `SIGTERM`。
- 真实 objective 结果校正为一个 `timeout` 根因和后续阻塞链，不再报告三个独立业务断言失败。

## 2026-09-14

### 新增

- `doctor --json` 增加 adapter capability 状态和原因。
- 增加产品无关的开源介绍、使用说明和视频脚本。

### 修改

- 项目许可证切换为 Apache License 2.0，并补齐 `LICENSE` 与 `NOTICE`。
- 简化 Skill 安装和自然语言调用说明，不再要求安装阶段绑定被测项目。

## 2026-09-05

### 新增

- 发布 ClientTrail 初始版本。
- 支持 Tauri 2、Electron、WebView/CDP、Windows UI Automation、macOS Accessibility、pytest 和 cargo test adapter。
- 建立 CLI、可选 MCP、统一 evidence 和正式项目只读安全边界。
