# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录使用稳定路径保存合欢宗全部常驻 Agent 的角色卡。每位 Agent 使用独立目录，当前角色文件直接显示在 Agent 目录内，历史版本统一移入该 Agent 的 `旧文档/`；当前实际运行状态固定记录在 Agent 根目录的 `DeploymentStatus部署状态.md`。

## 版本状态词

- `STABLE`（稳定版）：正式可部署并已通过对应验收。
- `CANDIDATE`（候选版）：设计或发布候选，尚未完成全部部署验收，不得当作稳定版。
- `REJECTED`（已否决／不可采用）：已确认存在缺陷，不得部署，也不得作为后续版本底稿。
- `SUPERSEDED`（已取代）：曾经稳定，但已被更新的稳定版正式取代；仍可按记录用于回滚或历史查询。

文档成熟度与实际部署版本必须分别记录。只有 `STABLE` 可以标记为正式可部署版本。

## 接手顺序

1. `DeploymentStatus部署状态.md`：确认实际部署、阻塞和下一步。
2. `VERSION-STATUS版本状态.md`：确认版本可采用性。
3. `README.md`：确认当前设计、职责和验收要求。
4. 五个 workspace 文件。
5. `PERMISSIONS.md`：核对目标权限。
6. `旧文档/`：仅用于对比、回滚和复盘。

## 当前 Agent 与部署状态

| Agent ID | 正式角色名 | 当前设计版本 | 成熟度 | 当前实际部署 |
| --- | --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.04 | `CANDIDATE` | v1.02 `STABLE`，运行状态部分完成 |
| `ops` | 魚玄機 | v0.03 | `CANDIDATE` | `partially verified`，实际版本待核验 |
| `coder` | 步非煙 | v0.03 | `CANDIDATE` | `not verified` |
| `reviewer` | 合并审查 | v0.01 | `CANDIDATE` | `not verified` |
| `life` | 蕭觀音 | v0.02 | `CANDIDATE` | 尚未部署，无 `STABLE` 版本 |
| `companion-dugu` | 獨孤伽羅 | v0.01 | `CANDIDATE` | `not verified` |
| `companion-wu` | 武曌 | v0.01 | `CANDIDATE` | `not verified` |
| `companion-lv` | 呂雉 | v0.01 | `CANDIDATE` | `not verified` |

魚玄機与步非煙 v0.01、v0.02 均为 `REJECTED`。当前 v0.03 已达到固定提交下的部署与验收候选程度，但仍需 NAS 正向、拒绝、恢复和跨 Agent 流程测试后才能升级为 `STABLE`。

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

五个 workspace 文件为 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。`PERMISSIONS.md` 是实际权限配置参考；`DeploymentStatus部署状态.md` 是当前运行状态唯一入口。

## 共同协议加载规则

共同协议权威源位于 `共同协议/`。每个 Agent 的 `AGENTS.md` 必须内嵌当前协议执行摘要；仅引用路径不算完成接入。

## 部署原则

1. 只有 `STABLE` 可直接作为正式部署源；`CANDIDATE` 必须先审查和验收。
2. 固定 Git 提交和角色目录，写入前备份实际 workspace 与配置。
3. 复制五个 workspace 文件，按 `PERMISSIONS.md` 转换真实权限。
4. 创建正式普通新会话，检查文件完整性并测试允许与禁止能力。
5. 将真实结果写回对应 `DeploymentStatus部署状态.md`。