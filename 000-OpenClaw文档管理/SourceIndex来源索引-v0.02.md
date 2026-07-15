# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.02

## 当前权威入口

- 角色卡库：`001-OpenClaw规划设计/AgentCards角色卡/`
- 賈南風当前设计：`AgentCards角色卡/housekeeper-賈南風/`
- 蕭觀音当前设计：`AgentCards角色卡/life-蕭觀音/`
- 全体 Agent 共同协议：`AgentCards角色卡/共同协议/SharedProtocol共同协议.md`
- 当前部署进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.03.md`

## 历史来源

- 賈南風 v1.02 原路径：`AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/`
- 賈南風 v1.03 原路径：`AgentCards角色卡-v0.05/housekeeper-賈南風-v1.03/`
- 蕭觀音 v0.01 原路径：`AgentCards角色卡-v0.05/life-蕭觀音-v0.01/`
- 共同协议 v0.01 原路径：`AgentCards角色卡-v0.05/SharedProtocol共同协议-v0.01.md`

上述旧入口已迁移或删除。历史版本位于对应 Agent 的 `旧文档/<版本>/`；精确原文也可从 Git 历史按原路径恢复。

## 关键设计来源

- v2.1 常驻 Agent：housekeeper、ops、coder、reviewer、life、companion-dugu、companion-wu、companion-lv。
- 薛濤、文薑、夏姬职责合并到 reviewer，不再作为独立常驻 Agent。
- 三位 companion 都是独立常驻 Agent，拥有独立会话和 Telegram Bot，可同时运行，只负责聊天、陪伴和情绪价值。
- 賈南風是自主决策与跨 Agent 协调中心。
- 蕭觀音负责全部生活事务、三位 companion 日常管理、主动提醒和每日 06:00 消息。

## 版本状态

- 賈南風当前设计 v1.04；NAS 当前仍部署 v1.02。
- 蕭觀音当前设计 v0.02；尚未部署。
- 共同协议当前版本 v0.02；尚未逐个部署到全部 Agent。
- A2A、session visibility、专用记忆、天气、日历、Telegram 和 Cron 的真实配置以部署验收证据为准。