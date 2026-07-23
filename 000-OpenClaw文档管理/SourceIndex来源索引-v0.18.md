# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.18

## v0.18 新增来源

- OpenClaw 官方 Subagents：<https://docs.openclaw.ai/subagents>
- OpenClaw 官方 Sub-Agent Tools：<https://docs.openclaw.ai/tools/subagents>
- OpenClaw 官方 Session Tool：<https://docs.openclaw.ai/session-tool>
- OpenClaw 官方 Tasks：<https://docs.openclaw.ai/automation/tasks>
- OpenClaw 官方 Exec：<https://docs.openclaw.ai/tools/exec>
- OpenClaw 官方 Exec Approvals：<https://docs.openclaw.ai/tools/exec-approvals>
- Git 固定来源：`376bc1f^:001-OpenClaw规划设计/FinalDesign最终设计-v1.02.md`，用于精确恢复被删的 209 行定稿基线。
- 现场来源：NAS `openclaw config get`、`channels status --probe`、`agents bindings`、Gateway 日志和八角色真实 Smoke Test。

结论：`sessions_spawn` 是非阻塞隔离执行机制；子 Agent继承并收窄父工具，不能替代不同常驻角色。任务授权、内部 Risk 和命令执行审批分层，低中风险无需少主重复授权。

## 当前权威入口

- 根目录：`README.md`
- 项目执行规则：`AGENTS.md`
- 文档与版本规则：`000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md`
- 快速简报：`001-OpenClaw规划设计/QuickBrief快速简报-v1.08.md`
- 最终设计：`001-OpenClaw规划设计/FinalDesign最终设计-v1.07.md`
- 工作流程：`001-OpenClaw规划设计/Workflows工作流程-v0.09.md`
- 部署方案：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.09.md`
- 实施路线：`001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.10.md`
- 当前进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.18.md`
- 无损内容更新任务：`002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md`
- 魚玄機运行权限修复：`002-OpenClaw部署进度/OpsRuntimePermissions鱼玄机运行权限修复报告-v0.01.md`
- 魚玄機任务级授权自动化：`002-OpenClaw部署进度/OpsTaskAuthorization鱼玄机任务级授权自动化修复报告-v0.01.md`
- 委派自动化修复：`002-OpenClaw部署进度/DelegatedAutomation委派自动化修复报告-v0.01.md`
- Life Automation Plugin：`002-OpenClaw部署进度/LifeAutomationPlugin萧观音自动化插件部署报告-v0.01.md`
- Housekeeper Async Dispatch：`002-OpenClaw部署进度/HousekeeperAsyncDispatch贾南风非阻塞委派报告-v0.01.md`
- Ops Telegram Admin 历史部署：`002-OpenClaw部署进度/OpsTelegramAdmin鱼玄机Telegram运维插件部署报告-v0.01.md`
- 魚玄機原生 Telegram 绑定修复：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
- 插件源码：`001-OpenClaw规划设计/Plugins插件/`
- 角色卡库：`001-OpenClaw规划设计/AgentCards角色卡/`
- 共同协议：`001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md`
- 部署后故障与修复：`003-OpenClaw事故经验/PostDeploymentRecovery部署后故障与修复-v0.02.md`

## 当前角色版本

賈南風 v1.10、蕭觀音 v0.07、魚玄機 v0.12、步非煙 v0.07、夏姬 / reviewer v0.05、三位 companion v0.04。

## 当前部署原则

賈南風负责接单、拆分、异步委派和结果汇总。蕭觀音独立执行生活自动化。魚玄機在少主直接任务或 housekeeper 正式委派形成的任务级授权包内，使用 workspace 文件工具及 `mode=auto` 的 NAS Gateway `exec/process` 连续完成工程配置、服务、部署和 OpenClaw 原生 Telegram 绑定；包内不逐步骤索权，只有严重例外暂停上报。任意 Gateway、Cron、跨会话历史、技术子 Agent 和任意外发消息仍关闭。

所有故障、兼容性、权限与安全判断必须先检索当前网络资料并结合现场证据验证。每个 Agent 的实际运行事实只以其根目录 `DeploymentStatus部署状态.md` 为准。
