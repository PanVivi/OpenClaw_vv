# OpenClaw_vv 项目文档

本仓库用于保存薇的 OpenClaw 多 Agent 组织架构、部署方案、工作流程、部署进度、纠错记录和经验复盘。当前组织名设定为：合欢宗。

整理来源：

- 本地完整 MHT 聊天记录：`\\192.168.1.171\Documents\你能帮我搜索对话记录吗？ (1).mht`
- 其中前半段是组织架构与流程设计，后半段是部署事故、修复、进度与复盘。

给其他 AI 的阅读顺序：

1. 先读 [快速简报 v1.03](001-OpenClaw规划设计/QuickBrief快速简报-v1.03.md)
2. 再读 [最终设计 v1.01](001-OpenClaw规划设计/FinalDesign最终设计-v1.01.md)
3. 如果要部署，读 [部署方案 v0.08](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.08.md)
4. 如果要执行任务，读 [工作流程 v0.02](001-OpenClaw规划设计/Workflows工作流程-v0.02.md)
5. 如果要让 Codex 与 OpenClaw 通信，读 [通信方法 v0.04](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.04.md)
6. 如果要判断当前状态，读 [当前进度 v0.28](002-OpenClaw部署进度/CurrentProgress当前进度-v0.28.md)
7. 如果要进行历史路线图阅读，读 [实施路线图 v0.12](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.12.md)
8. 如果要避免踩坑，读 [纠错事故 v0.01](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)、[经验教训 v0.01](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md)、[轮询冲突观察 v0.01](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md) 和 [任务系统能力名称Bug v0.01](003-OpenClaw事故经验/TaskSystemCapabilityBug任务系统能力名称Bug-v0.01.md)

文档分类：

### 000-OpenClaw文档管理

- [DocumentRules文档编号规则-v1.0.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.0.md)：项目文档编号规则。
- [SourceIndex来源索引-v0.13.md](000-OpenClaw文档管理/SourceIndex来源索引-v0.13.md)：当前任务索引、历史路线标记、有界证据等级和核对说明。

### 001-OpenClaw规划设计

- [QuickBrief快速简报-v1.03.md](001-OpenClaw规划设计/QuickBrief快速简报-v1.03.md)：AI 快速接手摘要。
- [FinalDesign最终设计-v1.01.md](001-OpenClaw规划设计/FinalDesign最终设计-v1.01.md)：最后确定的组织架构设计。
- [DeploymentPlan部署方案-v0.08.md](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.08.md)：当前七个目录骨架任务的部署边界与失败处理；迁移仅作历史受阻目标。
- [Workflows工作流程-v0.02.md](001-OpenClaw规划设计/Workflows工作流程-v0.02.md)：调试任务、代码任务、复杂任务流程。
- [ImplementationRoadmap实施路线图-v0.12.md](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.12.md)：FinalDesign Agent Skeleton 当前路线及历史路线说明；不作为部署执行入口。
- [CodexOpenClawCommunication通信方法-v0.04.md](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.04.md)：历史通信事实、R2A strict envelope、最小 scopes 边界和有界证据层级。

### 002-OpenClaw部署进度

- [CurrentProgress当前进度-v0.28.md](002-OpenClaw部署进度/CurrentProgress当前进度-v0.28.md)：记录 FinalDesign Agent Skeleton Initialization 本次 WebSocket 连接失败及未确认影响。
- [R2A-ConnectOnlyProbe.ps1](R2A-ConnectOnlyProbe.ps1)：历史 connect-only 候选，非当前执行入口；当前唯一任务是 FinalDesign Agent Skeleton Initialization。
- [R2-ReadonlyPrecheck.ps1](R2-ReadonlyPrecheck.ps1)：R2B blocked draft；入口在网络初始化前固定非零退出，不得执行。

### 003-OpenClaw事故经验

- [CorrectionsIncident纠错事故-v0.01.md](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)：纠错记录、事故根因、修复结果。
- [LessonsLearned经验教训-v0.01.md](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md)：经验教训和后续变更方法。
- [TelegramBotPollingConflict轮询冲突观察-v0.01.md](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)：Telegram Bot polling 冲突观察记录。
- [TaskSystemCapabilityBug任务系统能力名称Bug-v0.01.md](003-OpenClaw事故经验/TaskSystemCapabilityBug任务系统能力名称Bug-v0.01.md)：INC-2026-0002，task_delegate 能力名称格式不匹配导致全部 agent 工作流瘫痪的事故记录与修复过程。

## Current authoritative documents

- [QuickBrief v1.03](001-OpenClaw规划设计/QuickBrief快速简报-v1.03.md)
- [FinalDesign v1.01](001-OpenClaw规划设计/FinalDesign最终设计-v1.01.md)
- [DeploymentPlan v0.08](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.08.md)
- [ImplementationRoadmap v0.12](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.12.md)
- [SourceIndex v0.13](000-OpenClaw文档管理/SourceIndex来源索引-v0.13.md)
- [CurrentProgress v0.28](002-OpenClaw部署进度/CurrentProgress当前进度-v0.28.md)
- [EnsureFinalDesignAgentSkeleton.ps1](EnsureFinalDesignAgentSkeleton.ps1) (local script; not executed)
