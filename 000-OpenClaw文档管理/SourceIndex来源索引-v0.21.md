# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.21

## v0.21 新增来源

### 官方

- OpenClaw Cron：<https://docs.openclaw.ai/cron>
- OpenClaw Cron CLI：<https://docs.openclaw.ai/cli/cron>
- X User Posts API：<https://docs.x.com/x-api/users/get-posts>
- X timelines：<https://docs.x.com/x-api/posts/timelines/introduction>
- X timeline integration：<https://docs.x.com/x-api/posts/timelines/integrate>
- X API rate limits：<https://docs.x.com/x-api/fundamentals/rate-limits>
- X API pricing：<https://docs.x.com/x-api/getting-started/pricing>
- X oEmbed：<https://docs.x.com/x-for-websites/oembed-api>
- X embedded posts：<https://docs.x.com/x-for-websites/embedded-posts/overview>

### GitHub / 社群

- Nitter 项目：<https://github.com/zedeus/nitter>
- Nitter 公开实例列表：<https://github-wiki-see.page/m/zedeus/nitter/wiki/Instances>

### 现场证据

- Tibo Post：<https://x.com/thsottiaux/status/2081096447718723984>
- 生产 Watcher、schema 1/2 状态、Cron SQLite/CLI 运行记录、Gateway 日志、Telegram channel probe。
- 备份：`/Volume3/OpenClaw/home/.openclaw/backups/codex-reset-watcher-dual-source-20260726T094353+0800`
- 计划：`002-OpenClaw部署进度/CodexResetWatcher双源监控修复计划-v0.01.md`
- 报告：`002-OpenClaw部署进度/CodexResetWatcher双源监控部署报告-v0.01.md`
- 事故经验：`003-OpenClaw事故经验/CodexResetWatcher单源延迟事故-v0.01.md`

结论：X User Posts API 是有开发者凭据时的正式发现接口；X oEmbed 只能验证已知 Post，不能独立发现最新动态。当前生产没有 X Developer Token，因此如实使用“RSS 发现 + X 官方 oEmbed 验证 + codexreset.org 独立核查”，任一来源失败可降级，两条发现路径同时失败必须真实失败。

## 当前权威入口

- 根目录：`README.md`
- 项目执行规则：`AGENTS.md`
- 文档与版本规则：`000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md`
- 快速简报：`001-OpenClaw规划设计/QuickBrief快速简报-v1.10.md`
- 最终设计：`001-OpenClaw规划设计/FinalDesign最终设计-v1.09.md`
- 工作流程：`001-OpenClaw规划设计/Workflows工作流程-v0.10.md`
- 部署方案：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.11.md`
- 实施路线：`001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.12.md`
- 当前进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.23.md`
- CodexResetWatcher 脚本：`001-OpenClaw规划设计/Automation自动化/CodexResetWatcher.mjs`
- CodexResetWatcher 双源计划：`002-OpenClaw部署进度/CodexResetWatcher双源监控修复计划-v0.01.md`
- CodexResetWatcher 部署报告：`002-OpenClaw部署进度/CodexResetWatcher双源监控部署报告-v0.01.md`
- 无损内容更新任务：`002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md`
- Workboard 部署报告：`002-OpenClaw部署进度/WorkboardTaskControl工作板任务控制部署报告-v0.01.md`
- 部署后故障与修复：`003-OpenClaw事故经验/PostDeploymentRecovery部署后故障与修复-v0.02.md`
- 角色卡库：`001-OpenClaw规划设计/AgentCards角色卡/`
- 共同协议：`001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md`
- 插件源码：`001-OpenClaw规划设计/Plugins插件/`

## 当前角色版本

賈南風 v1.12、蕭觀音 v0.09、魚玄機 v0.15、步非煙 v0.09、夏姬 / reviewer v0.07、三位 companion v0.06。

## 当前部署原则

賈南風负责接单、拆分、建立 Workboard 卡、指派和结果汇总；Tasks / Task Flow 与独立 worker session 承担后台执行，Cron 只做固定派发和通知唤醒。蕭觀音独立执行生活自动化。魚玄機在少主直接任务或 housekeeper 正式委派形成的任务级授权包内，使用 workspace 文件工具及仅 ops 免逐命令提示的 NAS Gateway `exec/process` 连续完成工程配置、服务、部署和 OpenClaw 原生 Telegram 绑定；低中风险内部闭环，只有高风险暂停上报。任意 Gateway RPC、跨会话历史和任意外发消息仍关闭；技术子 Agent 仅限同角色单层。

所有故障、兼容性、权限与安全判断必须先检索当前网络资料并结合现场证据验证。每个 Agent 的实际运行事实只以其根目录 `DeploymentStatus部署状态.md` 为准。

## v0.20 完整继承

v0.20 的 Workboard、Tasks、Task Flow、Subagents、Standing Orders、Lobster、OpenProse、Agent Teams RFC、后台任务连续性，以及 v0.19 Exec Approvals、v0.18 Subagents/Session Tool/Tasks 等来源全部继续有效，没有被 v0.21 删除或替换。完整历史内容保留在 `SourceIndex来源索引-v0.20.md`，v0.21 只增加 CodexResetWatcher 双源监控来源与新的当前进度入口。

### v0.20 官方来源

- Workboard：<https://docs.openclaw.ai/plugins/workboard>
- Workboard CLI：<https://docs.openclaw.ai/cli/workboard>
- Tasks：<https://docs.openclaw.ai/automation/tasks>
- Task Flow：<https://docs.openclaw.ai/automation/taskflow>
- Subagents：<https://docs.openclaw.ai/tools/subagents>
- Standing Orders：<https://docs.openclaw.ai/automation/standing-orders>
- Cron CLI：<https://docs.openclaw.ai/cli/cron>
- Cron jobs：<https://docs.openclaw.ai/automation/cron-jobs>
- Lobster：<https://docs.openclaw.ai/tools/lobster>
- OpenProse：<https://docs.openclaw.ai/prose>
- Exec：<https://docs.openclaw.ai/tools/exec>
- Exec Approvals：<https://docs.openclaw.ai/tools/exec-approvals>
- Session Tool：<https://docs.openclaw.ai/session-tool>

### v0.20 GitHub / 社群来源

- Agent Teams RFC：<https://github.com/openclaw/openclaw/issues/56482>
- spawn/announce 完成态缺口：<https://github.com/openclaw/openclaw/issues/8995>
- 并发会话锁与证据竞争：<https://github.com/openclaw/openclaw/issues/43367>
- 后台任务连续性讨论：<https://github.com/openclaw/openclaw/issues/43177>
