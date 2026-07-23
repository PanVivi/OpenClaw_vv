# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.12

## 当前权威入口

- 根目录：`README.md`
- 项目执行规则：`AGENTS.md`
- 文档与版本规则：`000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md`
- 快速简报：`001-OpenClaw规划设计/QuickBrief快速简报-v1.07.md`
- 最终设计：`001-OpenClaw规划设计/FinalDesign最终设计-v1.07.md`
- 工作流程：`001-OpenClaw规划设计/Workflows工作流程-v0.09.md`
- 部署方案：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.09.md`
- 实施路线：`001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.09.md`
- 当前进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.13.md`
- 无损内容更新任务：`002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md`
- 委派自动化修复报告：`002-OpenClaw部署进度/DelegatedAutomation委派自动化修复报告-v0.01.md`
- Life Automation Plugin 部署报告：`002-OpenClaw部署进度/LifeAutomationPlugin萧观音自动化插件部署报告-v0.01.md`
- Life Automation Plugin 源码：`001-OpenClaw规划设计/Plugins插件/life-automation/`
- Codex Reset Watcher：`001-OpenClaw规划设计/Automation自动化/CodexResetWatcher.mjs`
- 角色卡库：`001-OpenClaw规划设计/AgentCards角色卡/`
- 共同协议：`001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md`
- 角色卡审核：`001-OpenClaw规划设计/RoleCardAudit角色卡审核-v0.07.md`
- 部署后故障与修复：`003-OpenClaw事故经验/PostDeploymentRecovery部署后故障与修复-v0.01.md`

## 当前角色版本

賈南風 v1.10、蕭觀音 v0.07、魚玄機 v0.08、步非煙 v0.07、夏姬 / reviewer v0.05、三位 companion v0.04。

## 当前部署原则

八 Agent 五文件已完成基础部署。普通 Agent 转述不构成现实授权；賈南風从少主已认证会话生成、字段完整且范围未变化的正式委派包可承载当前任务的既有授权，接收 Agent 不要求少主重复指令。

`life-automation` 仅向 life 暴露受限生活自动化工具。萧观音直接执行贾南风的正式委派，不依赖 Codex、ops 或管理员在线；原生 owner-only Cron 规则和其他 Agent 权限不变。

所有故障、兼容性、权限与安全判断必须先检索当前网络资料并结合现场证据验证。每个 Agent 的实际运行事实只以其根目录 `DeploymentStatus部署状态.md` 为准。
