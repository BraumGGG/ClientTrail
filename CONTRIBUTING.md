# 贡献指南

向本仓库提交代码、文档或其他内容，即表示你有权提交该内容，并同意按照 Apache License 2.0 对该贡献进行授权。请勿提交不兼容许可证的代码、未获授权的项目内容、真实测试日志、凭据或私有数据。

## 提交前检查

创建 Pull Request 前请运行：

```powershell
pnpm install --ignore-scripts
pnpm exec tsc -b --pretty false
pnpm test
```

平台相关的修改应包含 fixture 或适配器契约测试。如果存在语义选择器或 Accessibility 属性，不要使用截图或坐标定位。

## 修改适配器

平台行为应封装在对应适配器中。核心契约必须保持平台无关。新增能力应显式报告；不支持时返回结构化的能力错误。
