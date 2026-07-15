# OpenClaw_vv 项目文档

本仓库用于保存薇的 OpenClaw 多 Agent 组织架构、部署方案、工作流程、Agent 角色卡、部署进度、纠错记录和经验复盘。当前组织名：合欢宗。

## 给其他 AI 的阅读顺序

1. [快速简报 v1.03](001-OpenClaw规划设计/QuickBrief快速简报-v1.03.md)
2. [最终设计 v1.04](001-OpenClaw规划设计/FinalDesign最终设计-v1.04.md)
3. [角色卡库](001-OpenClaw规划设计/AgentCards角色卡/README.md)
4. [賈南風当前角色卡 v1.04](001-OpenClaw规划设计/AgentCards角色卡/housekeeper-賈南風/README.md)
5. [蕭觀音当前角色卡 v0.02](001-OpenClaw规划设计/AgentCards角色卡/life-蕭觀音/README.md)
6. [全体 Agent 共同协议 v0.02](001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议-v0.02.md)
7. [部署方案 v0.05](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.05.md)
8. [工作流程 v0.06](001-OpenClaw规划设计/Workflows工作流程-v0.06.md)
9. [实施路线图 v0.05](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.05.md)
10. [通信方法 v0.01](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)
11. [当前进度 v0.02](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)
12. [事故与经验](003-OpenClaw事故经验/)

## 当前角色卡结构

角色卡库使用稳定路径：

```text
001-OpenClaw规划设计/AgentCards角色卡/
```

每位常驻 Agent 有独立目录。当前版本文件直接放在 Agent 目录根部，历史版本保存到该目录的 `旧文档/<版本>/`。不再新建带版本号的角色卡库顶层目录。

当前设计版本：

- `housekeeper / 賈南風 v1.04`：当前 NAS 已部署版本仍为 v1.02，v1.04 待部署验收。
- `life / 蕭觀音 v0.02`：待部署验收。
- ops、coder、reviewer 和三位 companion 已建立独立目录，正式角色卡待后续逐个编写。

## 当前設定结论

### 賈南風

- 合欢宗大总管和跨 Agent 决策协调中心，不是逐项请示的传话人。
- 简单、日常、低风险、范围明确且容易回退的事项自主推进。
- 重大系统稳定性、重要数据、核心权限、重大成本、公开影响和难以回退事项事前上报薇。
- 不直接持有 shell、普通项目写入、删除、服务控制或 `sessions_spawn`，但可以调度专业 Agent。
- v1.04 完整保留 v1.02 的工程路由、reviewer 门控、授权真实性、防重复、取消、依赖降级和五次熔断规则。

### 蕭觀音

- 负责少主全部生活、娱乐、一般健康习惯、天气、出行、日历、提醒和三位 companion 日常管理。
- 三位 companion 均为独立常驻 Agent，各有独立会话和 Telegram Bot，可以同时运行。
- 每日当地时间 06:00 发送自然、口语化、有角色辨识度的晨间消息，不写成报告。
- 对明确日期、时间和期限建立真实主动提醒。

## 共同协议与记忆

- Agent 可在职责所需范围共享少主明确表达的偏好、当前状态、近期相关信息、日程和有效决定。
- 共享信息必须注明来源、可信程度、适用范围和失效条件。
- 宫斗、争宠和暗讽只能影响表达，不得影响任务、权限、证据、风险和验收。
- housekeeper 与 life 使用完整但受限的长期记忆方案：专用记忆工具或仅允许写明确角色记忆目录，不开放普通项目文件写权限。

## 部署与运行说明

- 五个 workspace 文件为 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- `PERMISSIONS.md` 仅作为真实权限配置参考。
- 共同协议虽然有仓库权威源，但执行摘要必须内嵌到各 Agent 的 `AGENTS.md`。
- 写入后必须创建普通正式新会话，核对五文件完整性和权限配置。
- A2A、会话可见性、专用记忆、Telegram、天气、日历和 Cron 必须经过真实测试。
- 当前賈南風 v1.02 角色主体已部署，但跨 Agent 发送和历史读取仍受全局策略限制。
- 设计版本、部署版本和历史版本必须分别标记；实际能力不足时不得误报完整部署。

## 文档分类

### 000-OpenClaw文档管理

- [DocumentRules文档编号规则-v1.03.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.03.md)（当前）
- [DocumentRules文档编号规则-v1.02.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.02.md)（历史保留）
- [DocumentRules文档编号规则-v1.01.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.01.md)（历史保留）
- [SourceIndex来源索引-v0.01.md](000-OpenClaw文档管理/SourceIndex来源索引-v0.01.md)

### 001-OpenClaw规划设计

- [QuickBrief快速简报-v1.03.md](001-OpenClaw规划设计/QuickBrief快速简报-v1.03.md)
- [FinalDesign最终设计-v1.04.md](001-OpenClaw规划设计/FinalDesign最终设计-v1.04.md)
- [AgentCards角色卡/](001-OpenClaw规划设计/AgentCards角色卡/README.md)
- [DeploymentPlan部署方案-v0.05.md](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.05.md)
- [Workflows工作流程-v0.06.md](001-OpenClaw规划设计/Workflows工作流程-v0.06.md)
- [ImplementationRoadmap实施路线图-v0.05.md](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.05.md)
- [CodexOpenClawCommunication通信方法-v0.01.md](001-OpenClaw规划设计/CodexOpenClawCommunication通信方法-v0.01.md)

### 002-OpenClaw部署进度

- [CurrentProgress当前进度-v0.02.md](002-OpenClaw部署进度/CurrentProgress当前进度-v0.02.md)

### 003-OpenClaw事故经验

- [CorrectionsIncident纠错事故-v0.01.md](003-OpenClaw事故经验/CorrectionsIncident纠错事故-v0.01.md)
- [LessonsLearned经验教训-v0.01.md](003-OpenClaw事故经验/LessonsLearned经验教训-v0.01.md)
- [TelegramBotPollingConflict轮询冲突观察-v0.01.md](003-OpenClaw事故经验/TelegramBotPollingConflict轮询冲突观察-v0.01.md)