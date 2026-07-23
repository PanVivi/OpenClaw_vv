# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.10

## 当前权威入口

- 根目录：`README.md`
- 文档与版本规则：`000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md`
- 快速简报：`001-OpenClaw规划设计/QuickBrief快速简报-v1.07.md`
- 最终设计：`001-OpenClaw规划设计/FinalDesign最终设计-v1.07.md`
- 工作流程：`001-OpenClaw规划设计/Workflows工作流程-v0.09.md`
- 部署方案：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.09.md`
- 实施路线：`001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.09.md`
- 当前进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.11.md`
- 无损内容更新任务：`002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md`
- 角色卡库：`001-OpenClaw规划设计/AgentCards角色卡/`
- 共同协议：`001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md`
- 角色卡审核：`001-OpenClaw规划设计/RoleCardAudit角色卡审核-v0.07.md`
- 部署后故障与修复：`003-OpenClaw事故经验/PostDeploymentRecovery部署后故障与修复-v0.01.md`
- 賈南風 v1.02 继承与批准矩阵：`001-OpenClaw规划设计/RoleCardAudit角色卡审核-v0.03.md`

## 当前角色版本

賈南風 v1.09、蕭觀音 v0.06、魚玄機 v0.07、步非煙 v0.07、夏姬 / reviewer v0.05、三位 companion v0.04。

## 当前部署原则

八 Agent 五文件已完成基础部署。后续角色内容使用无损增量方法；A2A 消息投递已启用，但历史读取保持拒绝。持久化、精细历史授权、自动化可靠性、技术子 Agent 和完整记忆继续分项增强。

工程基础层使用当前正式会话内可核对的一次性 Review/Risk/Stage 记录；Assignment Generation 表示处理权。专用持久化、Gate ID、目标 Generation 硬绑定和硬单次消费属于增强层。

每个 Agent 的实际运行事实只以其根目录 `DeploymentStatus部署状态.md` 为准；设计版本、实际部署版本和增强能力状态分开记录。
