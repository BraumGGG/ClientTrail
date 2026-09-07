# Tauri 策略

Tauri 2 白盒模式优先使用 WebdriverIO Tauri Service。测试插件通过 `client-test` Cargo feature 注入，Release 构建不得启用该 feature。Windows WebView2 CDP 只用于诊断网络、SSE、Console 和性能，不作为 macOS 或跨平台主驱动。
