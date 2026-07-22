# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录是八个常驻 Agent 当前角色卡的稳定入口。实际运行状态只以各 `DeploymentStatus部署状态.md` 为准。

| Agent ID | 角色 | 当前设计 | 实际部署 |
| --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.07 `CANDIDATE` | 最后已知 v1.02 `STABLE` |
| `life` | 蕭觀音 | v0.04 `CANDIDATE` | 未部署 |
| `ops` | 魚玄機 | v0.05 `CANDIDATE` | 待核验 |
| `coder` | 步非煙 | v0.05 `CANDIDATE` | 待核验 |
| `reviewer` | 合并审查 | v0.03 `CANDIDATE` | 待核验 |
| `companion-dugu` | 獨孤伽羅 | v0.02 `CANDIDATE` | 待核验 |
| `companion-wu` | 武曌 | v0.02 `CANDIDATE` | 待核验 |
| `companion-lv` | 呂雉 | v0.02 `CANDIDATE` | 待核验 |

## 最小部署原则

- 先保证八个 Agent 独立 workspace、Bot、binding、普通会话、角色加载和最小权限。
- 简单生活问题由当前对话中的賈南風直接回答；需要设置和持续执行时转 life。
- companion 基础上线不依赖 life 协调、历史代理或记忆。
- 工程流程可先使用当前会话结构化记录；专用持久化后续增强。
- 无法硬隔离历史时保持历史能力关闭，不开放 `visibility=all`。
- 增强能力未完成只标记对应能力，不得把整个 Agent 写成未部署。
