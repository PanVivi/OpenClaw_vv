# OpenClaw_vv 项目文档

本仓库保存薇的 OpenClaw 多 Agent 组织架构、角色卡、工作流程、部署方案、当前进度、纠错与经验。组织名：合欢宗。

## 当前阅读顺序

1. [文档与版本规则 v1.05](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md)
2. [快速简报 v1.07](001-OpenClaw规划设计/QuickBrief快速简报-v1.07.md)
3. [最终设计 v1.07](001-OpenClaw规划设计/FinalDesign最终设计-v1.07.md)
4. [角色卡库](001-OpenClaw规划设计/AgentCards角色卡/README.md)
5. [角色卡审核 v0.07](001-OpenClaw规划设计/RoleCardAudit角色卡审核-v0.07.md)
6. 对应 Agent 的 DeploymentStatus、VERSION-STATUS 和五个 workspace 文件
7. [共同协议 v0.04](001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md)
8. [工作流程 v0.09](001-OpenClaw规划设计/Workflows工作流程-v0.09.md)
9. [部署方案 v0.09](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.09.md)
10. [无损内容更新任务 v0.01](002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md)
11. [实施路线 v0.09](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.09.md)
12. [当前进度 v0.15](002-OpenClaw部署进度/CurrentProgress当前进度-v0.15.md)
13. [委派自动化修复报告 v0.01](002-OpenClaw部署进度/DelegatedAutomation委派自动化修复报告-v0.01.md)
14. [萧观音自动化插件部署报告 v0.01](002-OpenClaw部署进度/LifeAutomationPlugin萧观音自动化插件部署报告-v0.01.md)
15. [贾南风非阻塞委派报告 v0.01](002-OpenClaw部署进度/HousekeeperAsyncDispatch贾南风非阻塞委派报告-v0.01.md)
16. [鱼玄机 Telegram 运维插件报告 v0.01](002-OpenClaw部署进度/OpsTelegramAdmin鱼玄机Telegram运维插件部署报告-v0.01.md)
17. [部署后故障与修复 v0.01](003-OpenClaw事故经验/PostDeploymentRecovery部署后故障与修复-v0.01.md)
18. [来源索引 v0.14](000-OpenClaw文档管理/SourceIndex来源索引-v0.14.md)

## 当前角色版本

```text
housekeeper       賈南風 v1.10
life              蕭觀音 v0.07
ops               魚玄機 v0.09
coder             步非煙 v0.07
reviewer          夏姬（合并审查）v0.05
companion-dugu    獨孤伽羅 v0.04
companion-wu      武曌 v0.04
companion-lv      呂雉 v0.04
```

## 当前目标

八 Agent 五文件已完成基础部署。当前目标是按无损内容更新任务升级角色卡，同时保留 transcript、session、个人记忆和三条既有 Telegram routing。其余五个 Bot 等待真实 token 后逐个增量绑定。

賈南風可直接回答简单生活问题；需要设置、定时、未来投递、持续跟踪、生活工具或 companion 协调时转蕭觀音。字段完整的正式委派包可承载少主既有授权，接收 Agent 不要求少主重复指令；life 仍是生活自动化唯一业务所有者。`life-automation` 已让萧观音直接执行受限自动化，不依赖 Codex、ops 或管理员在线。

賈南風的生产委派采用非阻塞 fire-and-forget：Telegram 前台完成拆单和派发后立即恢复接收消息，执行 Agent 在独立 session 中工作，完成结果通过事件回推。

魚玄機通过 `ops_telegram_admin` 直接处理五个固定未绑定 Agent 的 Telegram account 与 binding；Token 进入固定 secret、输出脱敏，且不开放通用宿主执行。

全员 A2A 消息投递已启用，但 `sessions_history` 保持拒绝。GitHub 设计不等于 NAS 已部署；基础角色状态与增强能力状态分别记录。

故障排查、兼容性、权限和安全判断必须遵守根目录 `AGENTS.md`：先检索当前网络资料，再结合现场证据判断和验证，不得只凭记忆猜测。
