# ClientTrail 开源介绍与抖音视频素材

> 本文用于介绍 ClientTrail，也可直接作为抖音视频的策划、口播和字幕底稿。

## 一句话介绍

ClientTrail 是一个面向 AI Agent 的桌面客户端确定性测试编排工具。它把自然语言测试目标，连接到 WebView/CDP、WebDriver、Accessibility、API、事件流和后端测试框架，最终给出可追溯、可复现的测试结论。

## 它解决什么问题

让 AI 测桌面客户端时，常见做法是截图、OCR、鼠标坐标和键盘模拟。这些方式在没有结构化入口时有价值，但通常存在几个问题：

- 窗口布局或分辨率变化就可能导致点击失效；
- 只能证明“看起来点到了”，很难证明业务状态真的正确；
- API、事件、状态机、数据库和持久化结果经常没有被核对；
- 每个项目都要重新选择工具、拼接启动命令和解释失败原因。

ClientTrail 的目标不是再造一个 UI 自动化框架，而是把 AI 的理解能力与已有的确定性测试工具连接起来。

## 工作方式

```text
自然语言测试目标
        ↓
识别项目技术栈和可用入口
        ↓
选择 pytest / cargo test / WebDriver / WebView CDP / Accessibility 等执行器
        ↓
执行客户端、API、事件和持久化验证
        ↓
收集 run_id、manifest、状态时间线和多源证据
        ↓
输出通过、失败、阻塞、超时或环境错误
        ↓
生成可读测试用例和失败最小复现包
```

AI 负责理解目标、探索路径、生成测试草稿和诊断；真正的回归执行由确定性测试框架完成。这样既保留了 AI 的灵活性，也避免把一次探索误当成稳定回归。

## 典型使用方式

```text
使用 $clienttrail-desktop-testing 测试当前 Tauri 2 项目。
测试目标：验证登录、创建任务、暂停恢复和退出登录。
约束：正式项目保持只读；如果缺少测试入口，先给出 setup dry-run，
说明它会做什么、影响哪些文件，并等待我确认。
```

首次使用不要求先绑定某个被测项目。Skill 会先识别当前项目和技术栈，再决定是否需要安装测试依赖或创建测试入口。正式项目默认只读；需要 setup 时，应优先在隔离 worktree 或副本中执行，并把影响交给用户确认。

## 目前能验证的证据

- WebView DOM、按钮状态和页面投影；
- API 响应、SSE/事件流和状态转换；
- Python `pytest`、Rust `cargo test` 等后端规则；
- SQLite 或其他持久化结果；
- Provider、sidecar、Worker、会话恢复和故障矩阵；
- 多实例端口、数据目录、控制目录和构建 provenance 隔离；
- `run_id`、测试契约、manifest、证据质量和失败诊断。

## 和其他方案的区别

| 方案 | 擅长 | 常见限制 | ClientTrail 的位置 |
| --- | --- | --- | --- |
| Computer Use / OCR | 没有结构化入口时操作窗口 | 受布局影响，慢，难验证内部状态 | 作为降级手段，优先结构化入口 |
| Playwright / WebdriverIO / Tauri Driver | 执行 UI 自动化 | 需要项目自行配环境、选工具和解释结果 | 统一识别、编排和报告 |
| pytest / cargo test | 后端规则和状态机 | 不能单独证明真实客户端闭环 | 与客户端、API、事件、持久化结合 |
| 项目专用 E2E 脚本 | 深度贴合单个产品 | 难以跨项目复用 | 用 adapter、contract、evidence 抽象复用 |
| AI 录制工具 | 快速探索和生成草稿 | 探索结果不等于回归通过 | 草稿必须进入确定性验证 |

核心差异可以概括为：**ClientTrail 不替代底层测试框架，而是连接 AI、桌面客户端和确定性测试框架。**

## 最大价值

把“AI 理解业务目标”和“测试框架稳定执行”放在同一条可审计链路里。开发者得到的不是一句“看起来通过”，而是能够回答：执行了哪一次 run、验证了哪些实体、依据是什么、哪里失败、是否只是环境阻塞、如何复现。

## 当前状态与边界

ClientTrail 当前应被视为公开 Alpha / Early Preview。Tauri 2 是最高优先级，并已有真实项目的业务链路、恢复、故障矩阵、持久化和多实例验证经验。Electron、Windows 原生 UI 和 macOS Accessibility 方向已纳入架构与适配层，但仍需要更多社区项目验证。

它不会自动解决所有客户端测试问题：项目可能没有可观测接口，Provider 可能不可用，原生窗口可能只能通过 Accessibility 或 Computer Use 降级。此时工具应明确报告 `blocked`、`environment`、`adapter` 或 `evidence_incomplete`，而不是把环境问题伪装成业务通过。

## 适合谁

- 使用 Tauri 或 Electron 构建桌面客户端的开发者；
- 希望让 AI 参与测试设计、执行和诊断的团队；
- 需要验证状态机、恢复、事件流和持久化的复杂客户端；
- 正在把一次性 E2E 脚本沉淀成可复用测试基础设施的项目。

## 社区可以贡献什么

- 新的 Tauri/Electron fixture；
- Windows 原生或 macOS Accessibility adapter；
- Provider 录制/回放适配器；
- 故障注入适配器和声明式故障矩阵；
- 不同技术栈的项目命令探测器；
- 真实项目中的阻塞案例、日志和改进建议。

## 抖音视频定位

### 推荐标题

1. 让 AI 真正测试桌面客户端，而不是只会看截图
2. 我做了一个给 AI 用的桌面自动化测试工具
3. Tauri 客户端怎么让 AI 测得更准？试试 ClientTrail
4. 截图和 OCR 之外，桌面客户端还能这样测

### 封面文案

```text
AI 测桌面客户端
别再只看截图
```

### 60—90 秒口播稿

**0—8 秒**

现在让 AI 测桌面客户端，很多时候还停留在看截图、找按钮、点坐标。但真正难测的，往往不是按钮有没有被点，而是这次操作有没有改变正确的业务状态。

**8—22 秒**

所以我做了 ClientTrail。它不是重新造一个 Playwright，也不是另一个 OCR 工具，而是一个面向 AI Agent 的桌面客户端测试编排层。

**22—45 秒**

你只需要告诉 AI：测试当前这个 Tauri 2 项目的登录、创建任务、暂停恢复和退出登录。ClientTrail 会先识别项目和技术栈，再选择 WebView/CDP、WebDriver、pytest、cargo test 或 Accessibility 等真正适合的测试入口。

**45—65 秒**

测试时不只看界面，还会核对 DOM、API 响应、SSE 和事件、状态机，以及 SQLite 或其他持久化结果。每次运行都有 run_id、状态时间线和证据，最后能区分业务失败、环境阻塞、启动错误和证据不完整。

**65—78 秒**

更重要的是，正式项目默认只读。缺少测试入口时，先给出 setup dry-run，说明会增加什么、影响哪些文件，确认后才在隔离环境里执行。

**78—90 秒**

现在 ClientTrail 优先支持 Tauri 2，也在继续完善 Electron、Windows 原生和 macOS 原生。项目已经开源，欢迎提交 adapter、fixture 和真实项目反馈。链接放在简介里。

## 分镜与录屏建议

| 时间 | 画面 | 屏幕字幕 |
| --- | --- | --- |
| 0—8 秒 | 截图/OCR 点击失败的快速演示，再切到真实客户端 | AI 测桌面客户端，别只看截图 |
| 8—22 秒 | ClientTrail README、Skill 名称和目录结构 | 面向 AI Agent 的桌面测试编排层 |
| 22—45 秒 | 终端输入自然语言测试要求，展示 doctor 和测试计划 | 自动识别技术栈，选择合适入口 |
| 45—65 秒 | WebView DOM、API、事件和结果文件并排展示 | 不只验证按钮，还验证业务证据 |
| 65—78 秒 | setup dry-run 输出和隔离 worktree 路径 | 正式项目默认只读 |
| 78—90 秒 | GitHub 仓库、测试报告和社区贡献入口 | 开源，欢迎一起完善 |

## 评论区 FAQ

**它是不是又一个 Playwright？**

不是。Playwright、WebdriverIO、pytest 和 cargo test 仍然负责执行，ClientTrail 负责理解目标、选择入口、编排运行、统一证据和解释结论。

**没有 CDP 还能测吗？**

可以尝试 WebDriver、Accessibility 或 Computer Use 降级，但可验证的内部状态会减少，报告会明确标注能力边界。

**会不会改我的项目？**

默认不改。缺少测试入口时先生成 setup dry-run；真正 setup 应在隔离副本或 worktree 中执行，并等待用户确认。

**现在最适合什么项目？**

首选 Tauri 2，并且项目最好提供 API、事件、状态或持久化等结构化观测入口。

## 开源说明

ClientTrail 使用 Apache License 2.0 发布。欢迎使用、修改、集成和提交改进，也欢迎通过真实项目反馈帮助完善 Electron、Windows 原生和 macOS 原生支持。

