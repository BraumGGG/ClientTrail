# 更新日志

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
