# OpenClaw_vv 项目文档

本仓库用于保存薇的 OpenClaw 多 Agent 组织架构、部署方案、工作流程、Agent 角色卡、部署进度、纠错记录和经验复盘。当前组织名设定为：合欢宗。

整理来源：

- 本地完整 MHT 聊天记录：`\\192.168.1.171\Documents\你能帮我搜索对话记录吗？ (1).mht`
- 其中前半段是组织架构与流程设计，后半段是部署事故、修复、进度与复盘。

给其他 AI 的阅读顺序：

1. 先读 [快速简报 v1.01](001-OpenClaw规划设计/QuickBrief快速简报-v1.01.md)
2. 再读 [最终设计 v1.02](001-OpenClaw规划设计/FinalDesign最终设计-v1.02.md)
3. 如果要读取或部署 Agent 人格与工作规则，读 [角色卡 v0.01](001-OpenClaw规划设计/AgentCards角色卡-v0.01.md)
4. 如果要部署，读 [部署方案 v0.02](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.02.md)
5. 如果要执行任务，读 [工作流程 v0.03](001-OpenClaw规划设计/Workflows工作流程-v0.03.md)
6. 如果要让 Codex 与 OpenClaw 通信，读 [通信方法 v0.01](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)
7. 如果要判断当前状态，读 [当前进度 v0.02](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)
8. 如果要继续推进，读 [实施路线图 v0.02](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.02.md)
9. 如果要避免踩坑，读 [纠错事故 v0.01](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)、[经验教训 v0.01](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md) 和 [轮询冲突观察 v0.01](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)

文档分类：

### 000-OpenClaw文档管理

- [DocumentRules文档编号规则-v1.0.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.0.md)：项目文档编号规则。
- [SourceIndex来源索引-v0.01.md](000-OpenClaw文档管理/SourceIndex来源索引-v0.01.md)：来源文件和核对说明。

### 001-OpenClaw规划设计

- [QuickBrief快速简报-v1.01.md](001-OpenClaw规划设计/QuickBrief快速简报-v1.01.md)：AI 快速接手摘要。
- [FinalDesign最终设计-v1.02.md](001-OpenClaw规划设计/FinalDesign最终设计-v1.02.md)：最后确定的组织架构设计、标准受管入口和 Agent 职责边界。
- [AgentCards角色卡-v0.01.md](001-OpenClaw规划设计/AgentCards角色卡-v0.01.md)：集中保存可供其他 AI 直接调用的 Agent 角色卡、workspace 文件内容和权限边界；当前收录 housekeeper / 贾南风。
- [DeploymentPlan部署方案-v0.02.md](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.02.md)：部署方案与分阶段推进方式。
- [Workflows工作流程-v0.03.md](001-OpenClaw规划设计/Workflows工作流程-v0.03.md)：标准受管入口、快速直达、调试、代码、验收和子 Agent 流程。
- [ImplementationRoadmap实施路线图-v0.02.md](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.02.md)：从当前进度继续推进部署的实施路线图。
- [CodexOpenClawCommunication通信方法-v0.01.md](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)：Codex 通过 WebSocket RPC 与 OpenClaw 通信的方法和经验。

### 002-OpenClaw部署进度

- [CurrentProgress当前进度-v0.02.md](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)：当前部署进度和未完成事项。

### 003-OpenClaw事故经验

- [CorrectionsIncident纠错事故-v0.01.md](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)：纠错记录、事故根因、修复结果。
- [LessonsLearned经验教训-v0.01.md](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md)：经验教训和后续变更方法。
- [TelegramBotPollingConflict轮询冲突观察-v0.01.md](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)：Telegram Bot polling 冲突观察记录。
