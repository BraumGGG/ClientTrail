# 失败诊断

先信任确定性测试结果，再用 manifest、result、build logs、backend logs、frontend console、event journal、network HAR、DOM snapshot 和截图解释原因。AI 不能覆盖原始退出码或断言状态。

## 运行级失败优先级

先定位首个导致执行器无法继续的事件，再解释 objective：

```text
runner timeout / launch / environment / adapter
  -> 有明确业务阶段或证据引用的 assertion 保留
  -> 无业务阶段且无证据引用的首个 assertion 校正为运行级根因
  -> 后续同类 assertion 标记为 blocked
```

报告至少提炼以下事实：

- 首个匹配的致命日志行；
- 受影响实例（日志能明确识别时）；
- `Script execution timed out`、`ECONNREFUSED`、WebDriver channel closed 是否出现；
- runner 是否 `timedOut`，以及终止 signal；
- cleanup warning 是否只是次要告警。

不得根据这些信号自动重试。测试已经启动并因基础设施失败终止时，本轮停止；需要完整回归时，将其作为环境修复后的下一次测试计划。

未配置测试入口或能力时使用 `blocked + capability_not_configured`，不要写成环境崩溃。一次 CLI 请求的最终判断以 `aggregate-result.json` 为准，不能只看某个 suite 的 `result.json`。

Tauri 构建超时与业务测试超时分开诊断：构建阶段检查 `buildCompletedNearTimeout`、`Finished ... profile` 和 `Built application at`；即使二进制已经生成，只要 WDIO 没有闭环，本次也不能判为业务通过。

## 实例事实

多实例测试需要区分 runner 进程和应用实例。只有 `adapter-runner` PID 时，不能推断 appA/appB 已成功启动。最终报告使用以下明确表述：

```text
实例级 provenance 未产生，双实例 PID/端口/session 未验证。
```
