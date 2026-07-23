# OpenClaw_vv 项目文档

本仓库保存薇的 OpenClaw 多 Agent 组织架构、角色卡、工作流程、部署方案、当前进度、纠错与经验。组织名：合欢宗。

## 当前阅读顺序

1. [文档与版本规则 v1.05](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md)
2. [快速简报 v1.09](001-OpenClaw规划设计/QuickBrief快速简报-v1.09.md)
3. [最终设计 v1.08（完整继承版）](001-OpenClaw规划设计/FinalDesign最终设计-v1.08.md)
4. [角色卡库](001-OpenClaw规划设计/AgentCards角色卡/README.md)
5. [角色卡审核 v0.08](001-OpenClaw规划设计/RoleCardAudit角色卡审核-v0.08.md)
6. 对应 Agent 的 DeploymentStatus、VERSION-STATUS 和五个 workspace 文件
7. [共同协议 v0.05](001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md)
8. [工作流程 v0.10（完整继承版）](001-OpenClaw规划设计/Workflows工作流程-v0.10.md)
9. [部署方案 v0.10（完整继承版）](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.10.md)
10. [无损内容更新任务 v0.01](002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md)
11. [实施路线 v0.11（完整继承版）](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.11.md)
12. [当前进度 v0.19](002-OpenClaw部署进度/CurrentProgress当前进度-v0.19.md)
13. [委派自动化修复报告 v0.01](002-OpenClaw部署进度/DelegatedAutomation委派自动化修复报告-v0.01.md)
14. [萧观音自动化插件部署报告 v0.01](002-OpenClaw部署进度/LifeAutomationPlugin萧观音自动化插件部署报告-v0.01.md)
15. [贾南风非阻塞委派报告 v0.01](002-OpenClaw部署进度/HousekeeperAsyncDispatch贾南风非阻塞委派报告-v0.01.md)
16. [鱼玄机 Telegram 运维插件历史报告 v0.01](002-OpenClaw部署进度/OpsTelegramAdmin鱼玄机Telegram运维插件部署报告-v0.01.md)
17. [鱼玄机原生 Telegram 绑定修复报告 v0.01](002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md)
18. [部署后故障与修复 v0.02](003-OpenClaw事故经验/PostDeploymentRecovery部署后故障与修复-v0.02.md)
19. [来源索引 v0.18](000-OpenClaw文档管理/SourceIndex来源索引-v0.18.md)
20. [魚玄機运行权限修复报告 v0.01](002-OpenClaw部署进度/OpsRuntimePermissions鱼玄机运行权限修复报告-v0.01.md)
21. [魚玄機任务级授权自动化修复报告 v0.01](002-OpenClaw部署进度/OpsTaskAuthorization鱼玄机任务级授权自动化修复报告-v0.01.md)
22. [原设计增量恢复与风险分级报告 v0.01](002-OpenClaw部署进度/IncrementalDesignRecovery原设计增量恢复与风险分级报告-v0.01.md)
23. [全员子 Agent 非阻塞部署报告 v0.01](002-OpenClaw部署进度/AllAgentSubagents全员子Agent非阻塞部署报告-v0.01.md)

## 当前角色版本

```text
housekeeper       賈南風 v1.11
life              蕭觀音 v0.08
ops               魚玄機 v0.13
coder             步非煙 v0.08
reviewer          夏姬（合并审查）v0.06
companion-dugu    獨孤伽羅 v0.05
companion-wu      武曌 v0.05
companion-lv      呂雉 v0.05
```

## 当前目标

八 Agent workspace、基础五文件、八个 Telegram account 和八条 account-scoped binding 均存在。八条 Telegram account 已恢复 connected/probe 正常，武曌的旧 Token 故障已经修复。不得改动无关 routing、transcript、session 或个人记忆。

賈南風可直接回答简单生活问题；需要设置、定时、未来投递、持续跟踪、生活工具或 companion 协调时转蕭觀音。字段完整的正式委派包可承载少主既有授权，接收 Agent 不要求少主重复指令；life 仍是生活自动化唯一业务所有者。`life-automation` 已让萧观音直接执行受限自动化，不依赖 Codex、ops 或管理员在线。

賈南風的跨角色生产委派采用非阻塞 fire-and-forget；八个 Agent 的自身具体长任务均使用同角色隔离子 Agent。Telegram 前台完成接单/回执后立即恢复接收消息，父 Agent在完成回告后核验汇总。

魚玄機在少主直接任务或 housekeeper 正式委派形成的任务级授权包内，使用经 `mode=auto` 和精确参数白名单约束的 NAS Gateway `exec/process` 执行工程配置、服务和部署。低风险自动执行，中风险由内部 Risk/备份/回滚/Test 闭环，只有高风险暂停上报；授权包内不逐步骤索权。Telegram account/binding 使用 OpenClaw 原生 `channels add` 与 `agents bind`，`ops-telegram-admin` 已停用。任意 Gateway、Cron、history 和任意外发仍关闭；spawn 仅开放为同角色单层隔离子 Agent。

全员 A2A 消息投递已启用，但 `sessions_history` 保持拒绝。GitHub 设计不等于 NAS 已部署；基础角色状态与增强能力状态分别记录。

故障排查、兼容性、权限和安全判断必须遵守根目录 `AGENTS.md`：先检索当前网络资料，再结合现场证据判断和验证，不得只凭记忆猜测。
