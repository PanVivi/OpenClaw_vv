# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录使用稳定路径保存合欢宗全部常驻 Agent 的角色卡。角色卡库目录本身不再带版本号；每位 Agent 使用独立目录，当前版本文件直接显示在 Agent 目录内，历史版本统一移入该 Agent 的 `旧文档/` 目录。

## 当前 Agent 目录

| Agent ID | 正式角色名 | 当前设计版本 | 当前部署状态 |
| --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.04 | 当前 NAS 仍部署 v1.02；v1.04 待部署验收 |
| `ops` | 魚玄機 | 待编写 | 以现有运行状态为准 |
| `coder` | 步非煙 | 待编写 | 未完成正式角色卡部署 |
| `reviewer` | 合并审查 | 待编写 | 未完成正式角色卡部署 |
| `life` | 蕭觀音 | v0.02 | 待部署验收 |
| `companion-dugu` | 獨孤伽羅 | 待编写 | 独立常驻 Agent 与独立 Telegram Bot |
| `companion-wu` | 武曌 | 待编写 | 独立常驻 Agent 与独立 Telegram Bot |
| `companion-lv` | 呂雉 | 待编写 | 独立常驻 Agent 与独立 Telegram Bot |

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

## 当前文件与历史文件

每个已完成角色卡的 Agent 目录直接保存：

```text
README.md
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
PERMISSIONS.md
旧文档/
```

- 五个 workspace 文件是 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- `PERMISSIONS.md` 是实际权限配置参考，不复制为 OpenClaw 配置。
- `README.md` 记录当前版本、部署状态和验收要求。
- `旧文档/` 保存该 Agent 的历史版本完整副本、旧部署状态和废弃草案。
- 新版本完成同步后，旧版文件移入 `旧文档/<版本>/`，不得覆盖或删除。

## 共同协议加载规则

`共同协议/` 保存全体 Agent 的权威共同协议。由于 OpenClaw 不会自动加载角色目录外的任意文件，每个 Agent 的 `AGENTS.md` 必须内嵌该协议当前版本的完整执行摘要；仅写相对路径不算完成接入。

## 部署原则

1. 固定 Git 提交和角色目录作为部署源。
2. 写入前备份目标 workspace 五文件和实际配置。
3. 复制五个 workspace 文件。
4. 按 `PERMISSIONS.md` 配置真实工具、会话、消息、记忆和自动化权限。
5. 创建正式普通新会话，检查五文件无缺失、无截断。
6. 独立测试允许能力与禁止能力。
7. 实际权限不足时只能标记 `partially completed` 或 `blocked`，不得声称完整部署。
8. 当前设计版本与当前已部署版本必须分别标注。