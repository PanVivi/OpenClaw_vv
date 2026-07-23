# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录是八个常驻 Agent 当前角色卡的稳定入口。实际运行状态只以各 `DeploymentStatus部署状态.md` 为准。

| Agent ID | 角色 | 当前设计 | 实际部署 |
| --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.11 `CANDIDATE` | v1.11，非阻塞子 Agent 实测通过 |
| `life` | 蕭觀音 | v0.08 `CANDIDATE` | v0.08，自动化与子 Agent 实测通过 |
| `ops` | 魚玄機 | v0.13 `CANDIDATE` | v0.13，风险分级、任务授权与子 Agent 实测通过 |
| `coder` | 步非煙 | v0.08 `CANDIDATE` | v0.08，子 Agent 实测通过 |
| `reviewer` | 夏姬（合并审查） | v0.06 `CANDIDATE` | v0.06，Risk 与只读子 Agent 实测通过 |
| `companion-dugu` | 獨孤伽羅 | v0.05 `CANDIDATE` | v0.05，非工程子 Agent 实测通过 |
| `companion-wu` | 武曌 | v0.05 `CANDIDATE` | v0.05，Bot 与非工程子 Agent 实测通过 |
| `companion-lv` | 呂雉 | v0.05 `CANDIDATE` | v0.05，非工程子 Agent 实测通过 |

## 最小部署原则

- 八个 Agent 的 workspace、五文件和 Telegram binding 均存在；八条 Telegram account 均 connected/probe 正常，companion-wu Token 故障已修复。
- 简单生活问题由当前对话中的賈南風直接回答；需要设置和持续执行时转 life。
- companion 基础上线不依赖 life 协调、历史代理或记忆。
- 工程流程可先使用当前会话结构化记录；专用持久化后续增强。
- 八 Agent A2A 消息投递可用；`visibility=all` 只解析目标，`sessions_history` 保持拒绝。
- 八 Agent 均启用同角色单层隔离子 Agent；长任务不占用主会话，且不扩大父角色工具权限。
- 增强能力未完成只标记对应能力，不得把整个 Agent 写成未部署。
- 后续五文件更新必须按无损内容更新任务保留 session、transcript、memory 和 Telegram routing。
