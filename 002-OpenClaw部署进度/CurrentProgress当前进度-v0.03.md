# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.03

## 当前文档状态

- 角色卡库已重构为稳定入口：`001-OpenClaw规划设计/AgentCards角色卡/`。
- 八个常驻 Agent 均已建立独立目录。
- 每个 Agent 根目录均已建立 `DeploymentStatus部署状态.md`，作为该 Agent 当前实际部署状态的唯一入口。
- 当前角色文件直接位于各 Agent 目录；历史版本进入 `旧文档/<版本>/`。
- 历史角色目录不再保存当前部署状态副本。
- 賈南風当前设计版本为 v1.04，蕭觀音当前设计版本为 v0.02。
- 全体 Agent 共同协议当前版本为 v0.02。
- 快速简报、最终设计、部署方案、工作流程、实施路线图、文档规则和根 README 已同步新路径和状态文档规则。

## 当前 NAS 运行状态

- 当前已部署的 housekeeper 仍为賈南風 v1.02。
- v1.02 五个 workspace 文件已完整加载，角色主体和基础行为验收通过。
- 当前模型为 `custom-1/gpt-5.6-luna`。
- 跨 Agent 发送仍受全局 `tools.agentToAgent.enabled=false` 限制。
- 跨 Agent 历史读取仍受全局 `tools.sessions.visibility=tree` 限制。
- 因此賈南風当前运行状态仍为 `partially completed`。
- ops 已有部分基础部署事实；其余工程 Agent 和 companion 的实际运行状态仍需按各自状态文档中的待核验项检查。

## 尚未部署

- 賈南風 v1.04 尚未写入 NAS，也未进行运行时验收。
- 蕭觀音 v0.02 尚未部署。
- 全体 Agent 共同协议 v0.02 尚未逐个部署到全部 Agent workspace。
- housekeeper 与 life 的专用长期记忆写入尚未配置。
- 蕭觀音的天气、日历、Telegram 主动发送、日程提醒和每日 06:00 Cron 尚未配置。
- ops、coder、reviewer 和三位 companion 的正式角色卡尚未全部完成。

## 后续独立任务

1. 合并角色卡目录重构 PR。
2. 审查并配置受限 A2A 与必要 session visibility。
3. 配置 housekeeper 和 life 的专用长期记忆区域或专用记忆插件。
4. 部署并验收賈南風 v1.04，保留 v1.02 回滚基线。
5. 部署并验收蕭觀音 v0.02。
6. 配置并测试天气、日历、提醒、Telegram 主动投递和每日 06:00 精确 Cron。
7. 依次编写 ops、coder、reviewer 和三位 companion 的正式角色卡。
8. 每次 Agent 部署、回滚、模型、Bot、binding、权限、记忆、自动化或验收变化后，更新对应 Agent 根目录状态文档。

## 状态原则

GitHub 文档中的“当前设计版本”不代表 NAS 已经部署。只有文件、真实权限、Bootstrap、工具调用、消息投递、记忆和自动化全部通过验收后，才能更新当前部署版本。其他 AI 接手某个 Agent 时，应先读取该 Agent 根目录的 `DeploymentStatus部署状态.md`。