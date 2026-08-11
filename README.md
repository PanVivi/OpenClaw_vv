# OpenClaw_vv 项目文档

本仓库保存薇的 OpenClaw 多 Agent 组织架构、角色卡、工作流程、部署方案、当前进度、纠错与经验。组织名：合欢宗。

## 当前阅读顺序

1. [文档与版本规则 v1.05](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md)
2. [快速简报 v1.13](001-OpenClaw规划设计/QuickBrief快速简报-v1.13.md)
3. [最终设计 v1.12（全任务系统收口）](001-OpenClaw规划设计/FinalDesign最终设计-v1.12.md)
4. [角色卡库](001-OpenClaw规划设计/AgentCards角色卡/README.md)
5. [角色卡审核 v0.08](001-OpenClaw规划设计/RoleCardAudit角色卡审核-v0.08.md)
6. 对应 Agent 的 DeploymentStatus、VERSION-STATUS 和五个 workspace 文件
7. [共同协议 v0.08](001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md)
8. [工作流程 v0.13（任务系统与治理收口）](001-OpenClaw规划设计/Workflows工作流程-v0.13.md)
9. [部署方案 v0.14（全任务系统修复）](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.14.md)
10. [无损内容更新任务 v0.01](002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md)
11. [实施路线 v0.15](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.15.md)
12. [当前进度 v0.31](002-OpenClaw部署进度/CurrentProgress当前进度-v0.31.md)
13. [委派自动化修复报告 v0.01](002-OpenClaw部署进度/DelegatedAutomation委派自动化修复报告-v0.01.md)
14. [萧观音自动化插件部署报告 v0.01](002-OpenClaw部署进度/LifeAutomationPlugin萧观音自动化插件部署报告-v0.01.md)
15. [贾南风非阻塞委派报告 v0.01](002-OpenClaw部署进度/HousekeeperAsyncDispatch贾南风非阻塞委派报告-v0.01.md)
16. [鱼玄机 Telegram 运维插件历史报告 v0.01](002-OpenClaw部署进度/OpsTelegramAdmin鱼玄机Telegram运维插件部署报告-v0.01.md)
17. [鱼玄机原生 Telegram 绑定修复报告 v0.01](002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md)
18. [部署后故障与修复 v0.02](003-OpenClaw事故经验/PostDeploymentRecovery部署后故障与修复-v0.02.md)
19. [来源索引 v0.29](000-OpenClaw文档管理/SourceIndex来源索引-v0.29.md)
20. [魚玄機运行权限修复报告 v0.01](002-OpenClaw部署进度/OpsRuntimePermissions鱼玄机运行权限修复报告-v0.01.md)
21. [魚玄機任务级授权自动化修复报告 v0.01](002-OpenClaw部署进度/OpsTaskAuthorization鱼玄机任务级授权自动化修复报告-v0.01.md)
22. [原设计增量恢复与风险分级报告 v0.01](002-OpenClaw部署进度/IncrementalDesignRecovery原设计增量恢复与风险分级报告-v0.01.md)
23. [全员子 Agent 非阻塞部署报告 v0.01](002-OpenClaw部署进度/AllAgentSubagents全员子Agent非阻塞部署报告-v0.01.md)
24. [魚玄機免逐命令索权修复报告 v0.02](002-OpenClaw部署进度/OpsExecNoPrompt鱼玄机免逐命令索权修复报告-v0.02.md)
25. [Workboard 任务控制升级计划 v0.01](002-OpenClaw部署进度/WorkboardTaskControl工作板任务控制升级计划-v0.01.md)
26. [Workboard 任务控制部署报告 v0.01](002-OpenClaw部署进度/WorkboardTaskControl工作板任务控制部署报告-v0.01.md)
27. [CodexResetWatcher 双源监控修复计划 v0.01](002-OpenClaw部署进度/CodexResetWatcher双源监控修复计划-v0.01.md)
28. [CodexResetWatcher 双源监控部署报告 v0.01](002-OpenClaw部署进度/CodexResetWatcher双源监控部署报告-v0.01.md)
29. [角色表达与通知修复部署报告 v0.01](002-OpenClaw部署进度/RoleVoice角色表达与通知修复部署报告-v0.01.md)
30. [萧观音少主专属资料区修复与验收报告 v0.01](002-OpenClaw部署进度/LifeOwnerFiles萧观音少主专属资料区修复与验收报告-v0.01.md)
31. [晨报、全模块控制与工作流修复生产验收 v0.01](002-OpenClaw部署进度/MorningBriefAndWorkflowRepair修复与生产验收报告-v0.01.md)
32. [全任务系统修复与生产验收 v0.01](002-OpenClaw部署进度/TaskSystemRepair修复与生产验收报告-v0.01.md)
33. [全任务系统现场复核与文档勘误 v0.01](002-OpenClaw部署进度/TaskSystemRepair现场复核与文档勘误-v0.01.md)
34. [Codex Task Panel 停用与稳定性门禁 v0.01](002-OpenClaw部署进度/CodexTaskPanel停用与稳定性门禁-v0.01.md)
35. [本地未提交文件核验 v0.01](002-OpenClaw部署进度/LocalUncommittedAudit本地未提交文件核验-v0.01.md)
36. [模型路由部署与生产验收 v0.01](002-OpenClaw部署进度/ModelRouting部署与生产验收报告-v0.01.md)

## 当前角色版本

```text
housekeeper       賈南風 v1.17
life              蕭觀音 v0.14
ops               魚玄機 v0.17
coder             步非煙 v0.11
reviewer          夏姬（合并审查）v0.09
companion-dugu    獨孤伽羅 v0.08
companion-wu      武曌 v0.08
companion-lv      呂雉 v0.08
```

## 当前目标

八 Agent workspace、基础五文件、八个 Telegram account 和八条 account-scoped binding 均存在。八条 Telegram account 已恢复 connected/probe 正常，武曌的旧 Token 故障已经修复。不得改动无关 routing、transcript、session 或个人记忆。

八个正式 Agent 已按角色部署独立主模型与回退链；工程类和任务分流/生活类子 Agent 使用各自的 Composer 2.5 链，LLM 型后台简单任务使用 LongCat 低成本链。旧会话模型固定值已清零，八个主 Agent、两类真实子 Agent 和隔离故障转移均已通过；当前 `heartbeat.model` 与 `utilityModel` 受生产 schema 限制，只能配置单一 LongCat 字符串。

賈南風可直接回答简单生活问题；需要设置、定时、未来投递、持续跟踪、生活工具或 companion 协调时转蕭觀音。字段完整的正式委派包可承载少主既有授权，接收 Agent 不要求少主重复指令；life 仍是生活自动化唯一业务所有者。`life-automation` 已让萧观音直接执行受限自动化，不依赖 Codex、ops 或管理员在线。`life_files` 仅允许萧观音在固定 `users/Vivi/` 专属生活资料区管理受限文本资料，不开放通用文件、shell 或工程写入。

賈南風的正式任务以官方 Tasks / Task Flow 为运行事实；`task-system-control` 负责持久 intake、唯一父 Flow、真实 Workboard/Task、跨角色 handoff 与完成 proof，`workflow_governance` 持久门控冻结计划、三次独立完整审查、顺序实施、验收、同步和最终通知。旧 WorkboardDispatchPump 与 WorkboardNotificationRelay 已停用但保留定义和历史，当前链路不再依赖两个一分钟 Cron。

魚玄機优先使用 `ops_controlled_exec` 等固定参数化能力。低风险自动执行，中风险由内部完整复核、备份、回滚和验证闭环；高风险在副作用前由角色自然说明并只询问一次。通用高风险 `exec/process` 被 fail-closed 拦截，不再生成原生工业审批卡；没有专用受控能力的动作保持 blocked。身份仍为 `ops`，Telegram account 仍为 `default`，没有改名。

晨间玉简由蕭觀音统一掌管：少主可以直接交代所有允许人工维护的模块；也可以告诉賈南風，由她建立持久转交，再由蕭觀音应用。只有应用成功回执才算录入。唯一正式发送时间为每天 06:00（Asia/Shanghai），版式以 2026-08-04 11:54 定稿为准。

全员 A2A 消息投递已启用，但 `sessions_history` 保持拒绝。GitHub 设计不等于 NAS 已部署；基础角色状态与增强能力状态分别记录。

故障排查、兼容性、权限和安全判断必须遵守根目录 `AGENTS.md`：先检索当前网络资料，再结合现场证据判断和验证，不得只凭记忆猜测。

Codex Task Panel 的 standalone Scheduled Scanner 已永久停用并从当前 Cron 清单移除。它曾在客户端锁生效前持续创建独立任务与 WebView，不能按旧部署计划恢复；当前只允许人工触发检查。重新启用自动扫描前必须另行完成单任务复用、最大并发 1、积压上限、退避和连续稳定性验收。`CodexResetWatcher` 是独立的额度重置监控，当前仍启用且最近运行成功。
