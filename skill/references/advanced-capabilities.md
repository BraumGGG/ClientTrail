# 高级测试能力参考

## 能力状态

每个 adapter 对高级能力返回以下状态之一：

- `available`：可以在当前环境执行；
- `not_configured`：项目可以支持，但缺少配置或入口；
- `capability_not_supported`：当前 adapter 不支持；
- `environment_blocked`：能力存在，但当前环境无法执行；
- `isolation_blocked`：并发预检发现实例资源冲突；
- `not_verified`：执行过，但证据不足以证明结论。

## 契约与统一模型

正式执行前应生成并冻结 `test-contract.json`，记录业务目标、前置条件、必需能力、允许降级、通过/失败/阻塞标准和证据策略。执行器必须校验 `contractHash`，并将哈希写入每个 run 的 `manifest.json` 和 `result.json`。契约缺失时可以生成草案，但不能把草案当作已冻结标准。

运行状态统一使用 `pending/running/paused/waiting_human/recovering/passed/failed/timeout/cancelled/blocked/error`。每次转换写入 `state-timeline.json`，至少包含时间、runId、sessionId 或 eventCursor（如果适用）以及原因。

业务断言的证据闭包支持 `required/recommended/not_applicable`。缺失必需证据时使用 `evidence_incomplete` 或 `blocked`，不能覆盖原始业务断言结论。

## 声明式故障矩阵

故障矩阵使用 `pairwise`、`full` 或 `selected` 策略，故障项通过 adapter capability 映射，不写死 Provider、sidecar 或 Worker。每个组合单独记录 `planned/executed/passed/failed/blocked/not_supported`，前置失败通过 `blocked_by` 传播。

## Provider 与质量维度

Provider 模式必须区分 `live`、`record`、`replay` 和 `not_applicable`；录制数据需带 schema/version、延迟样本和脱敏策略，live 与 replay 不合并统计。质量维度分别记录业务覆盖、证据完整性、故障覆盖、并发隔离和 provenance，状态只能辅助阅读，不能替代“通过/失败/阻塞”结论。

## 测试层级与复现

报告应标记 `smoke`、`functional`、`recovery`、`soak`、`stress` 或 `security` 层级及迭代、持续时间和并发数。失败时优先生成脱敏的最小复现包，包含契约、配置、provenance、资源分配、最小请求序列、状态时间线、关键日志和复现命令。

## 故障注入记录

```json
{
  "action": "external_dependency_restart",
  "target": "instance-a",
  "stage": "recovery",
  "runId": "...",
  "startedAt": "...",
  "completedAt": "...",
  "recovery": "checkpoint-restored",
  "status": "passed",
  "evidence": []
}
```

## 多实例隔离预检

预检必须在启动前完成，至少包含：

```json
{
  "status": "passed",
  "instances": [
    {
      "id": "instance-a",
      "applicationId": "...",
      "binaryPath": "...",
      "binarySha256": "...",
      "resourceDirectory": "...",
      "webdriverPort": 4451,
      "externalDependencyPorts": [],
      "appDataDirectory": "...",
      "launcherControlDirectory": "...",
      "persistentStorePaths": [],
      "cargoTargetDirectory": "..."
    }
  ],
  "conflicts": []
}
```

关键资源冲突时使用 `isolation_blocked`，不要先启动再猜测失败原因。

## 结果分层

最终报告至少分为：

1. 业务断言结果；
2. 环境和适配器结果；
3. 证据完整性结果；
4. 并发隔离结果；
5. Provider 模式和预算结果；
6. 清理和诊断告警。

这些层级不能互相覆盖。例如业务通过但 provenance 缺失，应报告“业务通过、构建独立性未验证”，而不是简单写成全部通过。
