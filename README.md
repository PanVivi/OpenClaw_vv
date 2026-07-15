# OpenClaw_vv 项目文档

本仓库用于保存薇的 OpenClaw 多 Agent 组织架构、部署方案、工作流程、版本化 Agent 角色卡、部署进度、纠错记录和经验复盘。当前组织名：合欢宗。

## 给其他 AI 的阅读顺序

1. [快速简报 v1.02](001-OpenClaw规划设计/QuickBrief快速简报-v1.02.md)
2. [最终设计 v1.03](001-OpenClaw规划设计/FinalDesign最终设计-v1.03.md)
3. [角色卡库 v0.04](001-OpenClaw规划设计/AgentCards角色卡-v0.04/README.md)
4. [賈南風角色包 v1.02](001-OpenClaw规划设计/AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/README.md)
5. [賈南風部署状态 v0.01](001-OpenClaw规划设计/AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/DeploymentStatus部署状态-v0.01.md)
6. [部署方案 v0.04](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.04.md)
7. [工作流程 v0.05](001-OpenClaw规划设计/Workflows工作流程-v0.05.md)
8. [通信方法 v0.01](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)
9. [当前进度 v0.02](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)
10. [实施路线图 v0.04](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.04.md)
11. [纠错事故 v0.01](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)、[经验教训 v0.01](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md)和[轮询冲突观察 v0.01](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)

## 当前賈南風设定结论

- 当前角色包：`AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/`。
- 賈南風是合欢宗大总管和跨 Agent 决策协调中心，不是逐项请示的传话人。
- 简单、日常、低风险、范围明确且容易回退的事项，由她自主判断和推进，完成后简要汇报。
- 只有可能显著影响整体系统稳定性、持续运行、重要数据、核心权限、重大成本、公开影响或难以回退的重大高风险事项，才在执行前上报薇。
- 她不直接持有 shell、项目写入、删除、服务控制或临时 Agent 创建能力，但可以决定并调度具备相应权限的专业 Agent 执行。
- 默认使用日常管家模式；严肃现实任务自动进入事实优先的工作模式。
- 强烈羞辱性或占有性语言可在任何模式下作为表达修饰使用，但不得改变事实、风险判断、权限边界和实际操作。
- 正常陪伴流程为 `housekeeper → life → companion`；薇直接要求时，賈南風可以读取、联系并向指定 companion 下令。
- companion 只负责陪伴、对话和情绪价值，不具有工程执行权限。
- 当前主要模型计划使用 GPT Luna，后续可替换为其他经过验证的高能力、稳定、平价模型。

## 部署与运行说明

- 五个 workspace 文件为 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- `PERMISSIONS.md` 仅作为真实权限配置参考，不能直接当作 OpenClaw 配置复制。
- 角色文件写入后必须创建新会话，核对 bootstrap 完整性和权限配置。
- 局部依赖不可用时，只阻塞受影响任务分支，不冻结其他可继续的工作。
- 角色包描述行为、职责和决策边界；实际工具权限必须由 OpenClaw 配置落实。
- 当前賈南風角色主体已部署；跨 Agent 发送、跨 Agent 历史读取和分级外部消息仍受全局策略限制，详见部署状态文档。
- 版本化角色包和规则文档默认保留旧版本，仅由薇明确决定何时清理。

## 文档分类

### 000-OpenClaw文档管理

- [DocumentRules文档编号规则-v1.02.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.02.md)（当前）
- [DocumentRules文档编号规则-v1.01.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.01.md)（历史保留）
- [SourceIndex来源索引-v0.01.md](000-OpenClaw文档管理/SourceIndex来源索引-v0.01.md)

### 001-OpenClaw规划设计

- [QuickBrief快速简报-v1.02.md](001-OpenClaw规划设计/QuickBrief快速简报-v1.02.md)
- [FinalDesign最终设计-v1.03.md](001-OpenClaw规划设计/FinalDesign最终设计-v1.03.md)
- [AgentCards角色卡-v0.04/](001-OpenClaw规划设计/AgentCards角色卡-v0.04/README.md)
- [DeploymentPlan部署方案-v0.04.md](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.04.md)
- [Workflows工作流程-v0.05.md](001-OpenClaw规划设计/Workflows工作流程-v0.05.md)
- [ImplementationRoadmap实施路线图-v0.04.md](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.04.md)
- [CodexOpenClawCommunication通信方法-v0.01.md](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)

### 002-OpenClaw部署进度

- [CurrentProgress当前进度-v0.02.md](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)

### 003-OpenClaw事故经验

- [CorrectionsIncident纠错事故-v0.01.md](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)
- [LessonsLearned经验教训-v0.01.md](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md)
- [TelegramBotPollingConflict轮询冲突观察-v0.01.md](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)
