# ClientTrail 请求级可靠性设计说明

## 背景与目标

真实项目证据暴露出四类问题：一次 `run --all` 会产生多个互不关联的 suite `runId`；能力未配置被写成环境错误；Tauri 冷构建和业务测试共用 120 秒预算；Cargo 与外部观测证据需要打开大日志才能判断统计和 provenance。

目标是在保持 ClientTrail 轻量的前提下，让一次测试请求有唯一、可落盘的总结果，按阶段使用固定预算，并把已有证据中的关键信息直接结构化。

## 现状与约束

- 正式被测项目继续只读，仅写 `.client-test` evidence。
- 不增加自动重试、动态预算、构建缓存或常驻服务。
- 保持 `--timeout` 的业务测试语义和现有 adapter 行为兼容。
- suite 仍有独立 `runId`；新增 `requestRunId` 只用于关联同一 CLI 请求。

## 方案对比

### 方案一：所有 suite 共用一个 EvidenceSession

- 优点：目录最少，天然只有一个编号。
- 缺点：多个 adapter 会争用文件名和 finalization，破坏现有边界，改动较重。

### 方案二：请求级聚合目录关联独立 suite

- 优点：保留 adapter 独立证据，新增一份原子写入的 `aggregate-result.json` 即可形成总闭环。
- 缺点：同时存在 request 和 suite 两层标识，需要在输出中明确含义。

### 方案三：只在终端打印聚合结果

- 优点：改动最少。
- 缺点：结果无法追溯，进程结束后仍只能看到相互矛盾的 suite 目录。

## 推荐方案

采用方案二。它能解决真实误判，同时避免重构 EvidenceSession 或引入新的存储系统。

## 详细设计

### 架构

- CLI 创建一次 `requestRunId`，收集 adapter 检测与选择结果。
- 每个 adapter 创建自己的 EvidenceSession，并把 `requestRunId` 写入 manifest、result 和子进程环境。
- CLI 将聚合结果原子写入 `.client-test/artifacts/<requestRunId>/aggregate-result.json`。
- 聚合状态优先级为 `error > failed/timeout > blocked > passed`；`not_configured` 使用 `blocked + capability_not_configured`。

### 超时与进程

- `--timeout` 继续表示测试预算，默认 120000 ms。
- `--build-timeout` 表示 Tauri 构建预算，默认 300000 ms。
- Windows 超时终止完整进程树；其他平台终止独立进程组。
- 若超时证据中已经出现 Tauri 构建完成标记，记录 `buildCompletedNearTimeout`，但不把未执行的业务测试判为通过。

### 证据增强

- Cargo adapter 汇总 passed、failed、ignored、measured、filteredOut 和编译 warning/error 数量。
- manifest/result 写入 `producerVersion` 和 `adapterVersion`。
- objective event 继续输出规范数组，同时兼容读取旧的 `{ runId, events: [{ status }] }` 结构并产生 warning。
- runtime provenance 区分 `runnerPid`、`appPid` 和 `webviewPid`；诊断引用了实例但未产生实例事实时生成 warning。
- 聚合结果记录 selected/unselected adapter 及原因，作为本次选择性回归范围。

### 测试策略

- Core：聚合优先级、请求标识传播、旧事件兼容、实例缺失告警、进程树终止。
- Tauri：未配置状态、构建/测试预算分离、边界完成标记。
- Backend：Cargo 统计解析及结果落盘。
- CLI：请求级聚合文件、选择范围、退出码和旧参数兼容。
- 最后运行 typecheck、完整测试和契约测试。

## 风险与待确认项

- Windows 进程树终止依赖系统自带 `taskkill`，失败时会回退到直接终止父进程并保留结构化警告。
- `blocked` 表示当前请求存在未配置或未执行能力；CLI 使用配置类退出码 2，避免自动化误认为完整通过。
