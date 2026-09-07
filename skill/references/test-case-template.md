# ClientTrail 标准测试用例模板

## Markdown 模板

```markdown
## TC-<suite>-<number> <标题>

- **目的**：
- **优先级**：P0 / P1 / P2 / P3
- **类型**：业务 / 恢复 / 审计 / 隔离 / 冒烟 / 后端
- **平台与环境**：
- **关联运行**：`runId=<...>`
- **前置条件**：
- **测试数据**：

### 测试步骤

| 步骤 | 操作 | 观察点 | 预期结果 | 实际结果 |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |

- **状态**：通过 / 失败 / 阻塞 / 跳过 / 未验证
- **证据**：
  - `artifactDirectory/.../result.json`
  - `artifactDirectory/.../stdout.log#Lx-Ly`
- **风险与备注**：
```

## 生成约束

1. `状态=通过` 只能来自真实断言和完整证据；不能根据标题、测试代码存在或截图推断。
2. 前置条件失败导致的后续步骤写为“阻塞/未执行”，不要复制成多个失败用例。
3. 预期的拒绝响应（例如 `409`）应写入预期结果和实际结果，并标记为通过或 `expected_business_response`，不能只写“接口报错”。
4. Provider、网络、driver、session cleanup 和并发隔离风险放在“风险与备注”，除非它们实际阻断了用例。
5. 恢复或污染复验用例必须列出 baseline、目标项目、对照项目、`run_id`/任务 ID，以及正向和负向观察结果。

## JSON 最小结构

```json
{
  "schemaVersion": 1,
  "generatedFrom": ["run-id"],
  "cases": [
    {
      "id": "TC-business-001",
      "title": "",
      "type": "business",
      "priority": "P1",
      "preconditions": [],
      "testData": [],
      "steps": [
        {
          "index": 1,
          "action": "",
          "observation": "",
          "expected": "",
          "actual": ""
        }
      ],
      "status": "passed",
      "evidence": [],
      "risks": []
    }
  ]
}
```
