# 安全策略

## 仅供测试使用的控制入口

Client Test 可以向测试构建加入 WebDriver、CDP 或原生自动化入口。这些入口必须限制为 localhost，并且绝不能在生产构建中启用。

Tauri 项目使用 `client-test` Cargo feature。生产产物中如果存在该 feature、测试插件、远程调试参数或 reset endpoint，Release 流程应直接失败。

## 证据处理

证据写入 `.client-test/artifacts`。日志默认会脱敏，但截图、数据库快照和应用专用文件仍可能包含敏感数据。未经审核不得将 artifacts 上传到公开 issue。

## 安全问题报告

请通过 GitHub Security Advisories 私下报告安全问题。Issue 中不要包含凭据、生产数据或未发布的二进制文件。
