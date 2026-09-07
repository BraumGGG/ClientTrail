# 高级测试能力参考

## 能力状态

每个 adapter 对高级能力返回以下状态之一：

- `available`：可以在当前环境执行；
- `not_configured`：项目可以支持，但缺少配置或入口；
- `capability_not_supported`：当前 adapter 不支持；
- `environment_blocked`：能力存在，但当前环境无法执行；
- `isolation_blocked`：并发预检发现实例资源冲突；
- `not_verified`：执行过，但证据不足以证明结论。

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
