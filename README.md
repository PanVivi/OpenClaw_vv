# OpenClaw_vv 项目文档

本仓库用于保存薇的 OpenClaw 多 Agent 组织架构、部署方案、工作流程、版本化 Agent 角色卡、部署进度、纠错记录和经验复盘。当前组织名设定为：合欢宗。

整理来源：

- 本地完整 MHT 聊天记录：`\\192.168.1.171\Documents\你能帮我搜索对话记录吗？ (1).mht`
- 其中前半段是组织架构与流程设计，后半段是部署事故、修复、进度与复盘。

给其他 AI 的阅读顺序：

1. 先读 [快速简报 v1.02](001-OpenClaw规划设计/QuickBrief快速简报-v1.02.md)
2. 再读 [最终设计 v1.03](001-OpenClaw规划设计/FinalDesign最终设计-v1.03.md)
3. 如果要读取或部署 Agent 人格与工作规则，进入 [角色卡库 v0.04](001-OpenClaw规划设计/AgentCards角色卡-v0.04/README.md)
4. 如果要使用賈南風角色包，直接读取 [housekeeper-賈南風 v1.02](001-OpenClaw规划设计/AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/README.md)
5. 如果要部署，读 [部署方案 v0.04](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.04.md)
6. 如果要执行任务，读 [工作流程 v0.05](001-OpenClaw规划设计/Workflows工作流程-v0.05.md)
7. 如果要让 Codex 与 OpenClaw 通信，读 [通信方法 v0.01](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)
8. 如果要判断当前状态，读 [当前进度 v0.02](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)
9. 如果要继续推进，读 [实施路线图 v0.04](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.04.md)
10. 如果要避免踩坑，读 [纠错事故 v0.01](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)、[经验教训 v0.01](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md) 和 [轮询冲突观察 v0.01](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)

## 当前賈南風部署结论

- 角色文件已定稿，可进入受管部署。
- 当前角色包：`AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/`。
- 部署分为“角色文件受限试运行”和“正式协调启用”两阶段。
- ops、coder、reviewer、life 等依赖未完成时，正式任务必须进入 `blocked`，賈南風不得越权代替。
- 首期陪伴请求经 `life` 路由，housekeeper 不直接访问 companion 会话。
- 部署批准必须绑定具体角色包版本、完整 diff、目标路径、运行环境和不可变 Git commit SHA。
- 文件写入后必须检查 bootstrap 注入完整性；存在截断时不得正式启用。

文档分类：

### 000-OpenClaw文档管理

- [DocumentRules文档编号规则-v1.01.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.01.md)：项目文档、版本化功能目录和角色包命名规则。
- [SourceIndex来源索引-v0.01.md](000-OpenClaw文档管理/SourceIndex来源索引-v0.01.md)：来源文件和核对说明。

### 001-OpenClaw规划设计

- [QuickBrief快速简报-v1.02.md](001-OpenClaw规划设计/QuickBrief快速简报-v1.02.md)：AI 快速接手摘要和賈南風分阶段部署结论。
- [FinalDesign最终设计-v1.03.md](001-OpenClaw规划设计/FinalDesign最终设计-v1.03.md)：最终组织架构、职责边界、依赖降级和分阶段启用。
- [AgentCards角色卡-v0.04/](001-OpenClaw规划设计/AgentCards角色卡-v0.04/README.md)：版本化角色卡库；当前收录 `housekeeper / 賈南風 v1.02`。
- [DeploymentPlan部署方案-v0.04.md](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.04.md)：受管部署、真实权限、commit 绑定和 bootstrap 验收。
- [Workflows工作流程-v0.05.md](001-OpenClaw规划设计/Workflows工作流程-v0.05.md)：标准入口、授权、依赖降级、任务信封、取消、验收和分阶段启用。
- [ImplementationRoadmap实施路线图-v0.04.md](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.04.md)：从当前进度推进到賈南風正式启用的路线图。
- [CodexOpenClawCommunication通信方法-v0.01.md](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)：Codex 通过 WebSocket RPC 与 OpenClaw 通信的方法和经验。

### 002-OpenClaw部署进度

- [CurrentProgress当前进度-v0.02.md](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)：当前部署进度和未完成事项。

### 003-OpenClaw事故经验

- [CorrectionsIncident纠错事故-v0.01.md](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)：纠错记录、事故根因、修复结果。
- [LessonsLearned经验教训-v0.01.md](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md)：经验教训和后续变更方法。
- [TelegramBotPollingConflict轮询冲突观察-v0.01.md](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)：Telegram Bot polling 冲突观察记录。
