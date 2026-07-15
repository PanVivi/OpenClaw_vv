# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录使用稳定路径保存合欢宗全部常驻 Agent 的角色卡。每位 Agent 使用独立目录，当前角色文件直接显示在 Agent 目录内，历史版本统一移入该 Agent 的 `旧文档/`；当前实际运行状态则固定记录在 Agent 根目录的 `DeploymentStatus部署状态.md`。

## 接手顺序

其他 AI 接手某个 Agent 时，按以下顺序读取：

1. `DeploymentStatus部署状态.md`：先确认当前实际部署、阻塞和下一步。
2. `README.md`：确认角色版本、职责和部署验收要求。
3. 五个当前 workspace 角色文件。
4. `PERMISSIONS.md`：核对目标权限与实际配置差异。
5. `旧文档/`：仅在对比、回滚或复盘时读取。

## 当前 Agent 与部署状态

| Agent ID | 正式角色名 | 当前设计版本 | 部署状态文档 |
| --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.04 | [当前 NAS 为 v1.02，部分完成](housekeeper-賈南風/DeploymentStatus部署状态.md) |
| `ops` | 魚玄機 | 待整理 | [部分事实已确认，其余待核验](ops-魚玄機/DeploymentStatus部署状态.md) |
| `coder` | 步非煙 | 待编写 | [部署状态待核验](coder-步非煙/DeploymentStatus部署状态.md) |
| `reviewer` | 合并审查 | 待编写 | [部署状态待核验](reviewer-合并审查/DeploymentStatus部署状态.md) |
| `life` | 蕭觀音 | v0.02 | [尚未部署](life-蕭觀音/DeploymentStatus部署状态.md) |
| `companion-dugu` | 獨孤伽羅 | 待编写 | [部署状态待核验](companion-dugu-獨孤伽羅/DeploymentStatus部署状态.md) |
| `companion-wu` | 武曌 | 待编写 | [部署状态待核验](companion-wu-武曌/DeploymentStatus部署状态.md) |
| `companion-lv` | 呂雉 | 待编写 | [部署状态待核验](companion-lv-呂雉/DeploymentStatus部署状态.md) |

## 目录

- [`共同协议/`](共同协议/)
- [`housekeeper-賈南風/`](housekeeper-賈南風/)
- [`ops-魚玄機/`](ops-魚玄機/)
- [`coder-步非煙/`](coder-步非煙/)
- [`reviewer-合并审查/`](reviewer-合并审查/)
- [`life-蕭觀音/`](life-蕭觀音/)
- [`companion-dugu-獨孤伽羅/`](companion-dugu-獨孤伽羅/)
- [`companion-wu-武曌/`](companion-wu-武曌/)
- [`companion-lv-呂雉/`](companion-lv-呂雉/)

## Agent 根目录

```text
README.md
DeploymentStatus部署状态.md
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
PERMISSIONS.md
旧文档/
```

- `DeploymentStatus部署状态.md`：唯一的当前实际部署状态入口，不属于某个角色版本，不复制到 workspace。
- 五个 workspace 文件：`IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- `PERMISSIONS.md`：实际权限配置参考，不复制为 OpenClaw 配置。
- `README.md`：当前设计版本、职责和验收要求，不代替部署状态文档。
- `旧文档/`：历史角色版本、废弃草案和版本说明；不保存当前部署状态副本。
- 新版本完成同步后，旧版角色文件移入 `旧文档/<版本>/`，不得覆盖或删除。

## 部署进度维护规则

以下事项发生后必须更新对应 Agent 根目录的状态文档：

- 角色文件写入、升级或回滚；
- 模型、Telegram Bot、account 或 binding 变化；
- 工具 allow/deny、A2A、会话可见性或记忆权限变化；
- 自动化创建、修改、暂停、失败或恢复；
- Bootstrap、人格、权限、消息、记忆或跨 Agent 验收；
- 故障、阻塞、修复或部署状态变化。

不知道的状态写“待核验”。设计要求不得写成实际完成。

## 共同协议加载规则

`共同协议/` 保存全体 Agent 的权威共同协议。由于 OpenClaw 不会自动加载角色目录外的任意文件，每个 Agent 的 `AGENTS.md` 必须内嵌该协议当前版本的完整执行摘要；仅写相对路径不算完成接入。

## 部署原则

1. 先读取目标 Agent 的部署进度文档。
2. 固定 Git 提交和角色目录作为部署源。
3. 写入前备份目标 workspace 五文件和实际配置。
4. 复制五个 workspace 文件。
5. 按 `PERMISSIONS.md` 配置真实工具、会话、消息、记忆和自动化权限。
6. 创建正式普通新会话，检查五文件无缺失、无截断。
7. 独立测试允许能力与禁止能力。
8. 将真实结果写回根目录部署进度文档。
9. 实际权限不足时只能标记 `partially completed`、`blocked` 或 `not verified`，不得声称完整部署。