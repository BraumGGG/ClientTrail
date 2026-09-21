# 更新日志

## 未发布 - 2026-09-21

- 默认采用选择性回归：直接目标、共享边界补测，以及固定条件触发的单次完整回归升级。
- 明确每个测试请求最多升级一次完整回归；基础设施失败和完整回归失败后不自动重跑。
- runner timeout、launch/environment/adapter 失败时，校正缺少可定位业务证据的 objective assertion，并保留明确业务断言。
- Tauri 结果增加首个致命信号、受影响实例、脚本超时、连接拒绝、channel closed 和终止 signal 摘要。
- 多实例证据缺少应用实例 provenance 时，要求明确报告 PID、端口和 session 未验证。

## 未发布 - 2026-09-14

- 项目许可证由 MIT 切换为 Apache License 2.0。
- 增加仓库级和独立 Skill 分发所需的 `LICENSE` 与 `NOTICE`。
- 重构快速开始说明，安装阶段不再要求关联被测项目，并以自然语言调用 Skill 作为默认入口。
- 使用说明改为产品无关表述，并增加 ClientTrail 的核心价值、方案差异和社区使用场景。

## 0.1.0 - 2026-09-05

- 发布 ClientTrail Desktop Testing Skill 初始版本。
- 支持 Tauri 2、Electron、WebView/CDP、pytest、cargo test 及原生 UI 协议。
- 明确 AI 探索与确定性回归的边界、输入、输出和失败处理。
