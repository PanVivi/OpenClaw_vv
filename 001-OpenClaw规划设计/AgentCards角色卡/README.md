# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录是八个常驻 Agent 当前角色卡的稳定入口。实际运行状态只以各 `DeploymentStatus部署状态.md` 为准。

| Agent ID | 角色 | 当前设计 | 实际部署 |
| --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.10 `CANDIDATE` | v1.10 `CANDIDATE` |
| `life` | 蕭觀音 | v0.07 `CANDIDATE` | v0.07 `CANDIDATE`，AGENTS/TOOLS 待同步插件后文本 |
| `ops` | 魚玄機 | v0.10 `CANDIDATE` | v0.10 `CANDIDATE` |
| `coder` | 步非煙 | v0.07 `CANDIDATE` | v0.06 `CANDIDATE` |
| `reviewer` | 夏姬（合并审查） | v0.05 `CANDIDATE` | v0.04 `CANDIDATE` |
| `companion-dugu` | 獨孤伽羅 | v0.04 `CANDIDATE` | v0.03 `CANDIDATE` |
| `companion-wu` | 武曌 | v0.04 `CANDIDATE` | v0.03 `CANDIDATE` |
| `companion-lv` | 呂雉 | v0.04 `CANDIDATE` | v0.03 `CANDIDATE` |

## 最小部署原则

- 八个 Agent 的 workspace 和五文件已部署；Bot/binding 只有 ops、housekeeper、life 三条，其他五条等待真实 token。
- 简单生活问题由当前对话中的賈南風直接回答；需要设置和持续执行时转 life。
- companion 基础上线不依赖 life 协调、历史代理或记忆。
- 工程流程可先使用当前会话结构化记录；专用持久化后续增强。
- 八 Agent A2A 消息投递可用；`visibility=all` 只解析目标，`sessions_history` 保持拒绝。
- 增强能力未完成只标记对应能力，不得把整个 Agent 写成未部署。
- 后续五文件更新必须按无损内容更新任务保留 session、transcript、memory 和 Telegram routing。
