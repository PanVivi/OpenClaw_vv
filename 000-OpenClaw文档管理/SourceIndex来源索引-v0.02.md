# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.02

## 当前权威入口

- 角色卡库：`001-OpenClaw规划设计/AgentCards角色卡/`
- 賈南風：`AgentCards角色卡/housekeeper-賈南風/`
- 魚玄機：`AgentCards角色卡/ops-魚玄機/`
- 步非煙：`AgentCards角色卡/coder-步非煙/`
- 合并审查：`AgentCards角色卡/reviewer-合并审查/`
- 蕭觀音：`AgentCards角色卡/life-蕭觀音/`
- 獨孤伽羅：`AgentCards角色卡/companion-dugu-獨孤伽羅/`
- 武曌：`AgentCards角色卡/companion-wu-武曌/`
- 呂雉：`AgentCards角色卡/companion-lv-呂雉/`
- 全体 Agent 共同协议：`AgentCards角色卡/共同协议/SharedProtocol共同协议.md`
- 当前部署进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.03.md`

## 历史来源

- 賈南風 v1.02 原路径：`AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/`
- 賈南風 v1.03 原路径：`AgentCards角色卡-v0.05/housekeeper-賈南風-v1.03/`
- 蕭觀音 v0.01 原路径：`AgentCards角色卡-v0.05/life-蕭觀音-v0.01/`
- 共同协议 v0.01 原路径：`AgentCards角色卡-v0.05/SharedProtocol共同协议-v0.01.md`

历史版本位于对应 Agent 的 `旧文档/<版本>/`；精确原文也可从 Git 历史按原路径恢复。

## 关键设计来源

- v2.1 固定为八个常驻 Agent。
- 薛濤、夏姬、文薑职责合并到 reviewer 的 Review、Risk、Test。
- 三位 companion 独立常驻、独立会话和 Bot、可同时运行、无工程权限。
- 賈南風负责自主决策和跨 Agent 协调；蕭觀音负责生活事务和 companion 日常管理。

## 版本状态

- 賈南風 v1.04、蕭觀音 v0.02 为 `CANDIDATE`。
- 魚玄機、步非煙、合并审查及三位 companion 当前均为 v0.01 `CANDIDATE`。
- 当前实际部署的稳定角色仍只有賈南風 v1.02；其他运行事实以各 Agent 部署状态文档为准。
- 共同协议当前版本 v0.02；是否真实加载必须通过对应 Agent 新会话验收。
