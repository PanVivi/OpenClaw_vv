# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录使用稳定路径保存合欢宗全部常驻 Agent 的角色卡。每位 Agent 使用独立目录，当前角色文件直接显示在 Agent 目录内，历史版本统一移入该 Agent 的 `旧文档/`；当前实际运行状态固定记录在 Agent 根目录的 `DeploymentStatus部署状态.md`。

## 版本状态词

- `STABLE`（稳定版）：正式可部署并已通过对应验收。
- `CANDIDATE`（候选版）：设计或发布候选，尚未完成全部部署验收，不得当作稳定版。
- `REJECTED`（已否决／不可采用）：已确认存在缺陷，不得部署，也不得作为后续版本底稿。
- `SUPERSEDED`（已取代）：曾经稳定，但已被更新的稳定版正式取代；仍可按记录用于回滚或历史查询。

文档成熟度与实际部署版本必须分别记录。只有 `STABLE` 可以标记为正式可部署版本。

## 接手顺序

其他 AI 接手某个 Agent 时，按以下顺序读取：

1. `DeploymentStatus部署状态.md`：先确认当前实际部署、阻塞和下一步。
2. `VERSION-STATUS版本状态.md`：确认各版本是否可采用。
3. `README.md`：确认当前设计版本、职责和部署验收要求。
4. 五个当前 workspace 角色文件。
5. `PERMISSIONS.md`：核对目标权限与实际配置差异。
6. `旧文档/`：仅在对比、回滚或复盘时读取；看到 `REJECTED-不可采用.md` 时不得将该目录作为部署源或升级底稿。

## 当前 Agent 与部署状态

| Agent ID | 正式角色名 | 当前设计版本 | 成熟度 | 当前实际部署 |
| --- | --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.04 | `CANDIDATE` | v1.02 `STABLE`，运行状态部分完成 |
| `ops` | 魚玄機 | 待整理 | 待核验 | 以部署状态文档为准 |
| `coder` | 步非煙 | 待编写 | 待核验 | 待核验 |
| `reviewer` | 合并审查 | 待编写 | 待核验 | 待核验 |
| `life` | 蕭觀音 | v0.02 | `CANDIDATE` | 尚未部署，无 `STABLE` 版本 |
| `companion-dugu` | 獨孤伽羅 | 待编写 | 待核验 | 待核验 |
| `companion-wu` | 武曌 | 待编写 | 待核验 | 待核验 |
| `companion-lv` | 呂雉 | 待编写 | 待核验 | 待核验 |

详细运行事实分别见各 Agent 根目录的 `DeploymentStatus部署状态.md`。

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
VERSION-STATUS版本状态.md
DeploymentStatus部署状态.md
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
PERMISSIONS.md
旧文档/
```

- `VERSION-STATUS版本状态.md`：记录各设计版本的成熟度和可采用性。
- `DeploymentStatus部署状态.md`：唯一的当前实际部署状态入口，不属于某个角色版本，不复制到 workspace。
- 五个 workspace 文件：`IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- `PERMISSIONS.md`：实际权限配置参考，不复制为 OpenClaw 配置。
- `README.md`：当前设计版本、职责和验收要求，不代替部署状态文档。
- `旧文档/`：稳定基线、已取代版本、已否决草案和版本说明；不保存当前部署状态副本。

## 共同协议加载规则

`共同协议/` 保存全体 Agent 的权威共同协议。由于 OpenClaw 不会自动加载角色目录外的任意文件，每个 Agent 的 `AGENTS.md` 必须内嵌该协议当前版本的完整执行摘要；仅写相对路径不算完成接入。

## 部署原则

1. 先读取目标 Agent 的部署进度和版本状态文档。
2. 只有标记为 `STABLE` 的版本可以直接作为正式部署源；`CANDIDATE` 必须先完成要求的审查和验收。
3. `REJECTED` 版本只能用于复盘，禁止部署和作为新版本底稿。
4. 固定 Git 提交和角色目录作为部署源。
5. 写入前备份目标 workspace 五文件和实际配置。
6. 复制五个 workspace 文件，按 `PERMISSIONS.md` 转换真实权限。
7. 创建正式普通新会话，检查五文件无缺失、无截断，并独立测试允许能力与禁止能力。
8. 将真实结果写回根目录部署进度文档。