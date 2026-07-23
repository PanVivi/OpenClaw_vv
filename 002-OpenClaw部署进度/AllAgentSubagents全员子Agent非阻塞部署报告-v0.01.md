# 全员子 Agent 非阻塞部署报告 v0.01

- 日期：2026-07-23
- 目标：八个 Telegram 主会话不因具体长任务阻塞
- 状态：生产部署与实测通过
- 备份：`/Volume3/OpenClaw/backups/all-subagents-20260723T195957`

## 官方机制依据

- OpenClaw `sessions_spawn` 始终非阻塞，立即返回 `runId`，子 Agent在隔离 session 中执行并在完成后回告：[Sub-Agents](https://docs.openclaw.ai/tools/subagents)
- `sessions_yield` 是平台提供的等待/让出机制，不应在主会话写轮询循环：[Session Tool](https://docs.openclaw.ai/session-tool)
- 子 Agent继承父 Agent工具策略并进一步收窄，默认没有 Gateway、Cron、消息发送等能力：[Subagents](https://docs.openclaw.ai/subagents)

## 最小部署设计

- 八个 Agent均开放 `sessions_spawn`、`sessions_yield`、`subagents`。
- 每个 Agent的 `subagents.allowAgents` 只包含自身 ID，禁止借子 Agent切换角色。
- 默认并发 8、每个父 Agent最多 3 个直接子 Agent、深度 1、超时 1800 秒、完成后 60 分钟归档、`delegationMode=prefer`。
- 不开放 `sessions_history`，不改变 Telegram binding、A2A allowlist、workspace 路径、记忆、Sandbox 或原有工程权限。

## 角色边界

- housekeeper：同角色规划/整理；跨角色仍 A2A。
- ops/coder：长工程任务；生产对象单写者，父 Agent复核。
- reviewer：只读材料搜集；父 Agent给最终 Review/Risk/Test。
- life：一次性长任务；周期任务仍用 `life_automation`。
- companions：仅非工程长聊天/创作/整理，没有新增工程工具。

## 验收清单

- [x] 配置 dry-run 与正式 validate 通过；OpenClaw 明确回报热加载，无需重启
- [x] 八角色主会话均实际注入 spawn/yield/subagents
- [x] 八角色均调用 `sessions_spawn` 成功，`toolSummary.failures=0`
- [x] 八类子任务均产生 `CHILD_OK_*` 完成证据
- [x] ops 指定 `agentId=coder` 被拒绝：只允许 `ops`
- [x] `maxSpawnDepth=1`，子 Agent不可递归
- [x] 八个 Telegram account 均 running/connected/probe ok，restartPending=false
- [x] 八条 binding 与部署前 JSON 完全一致
- [x] A2A 配置与部署前完全一致
- [x] 部署前 585 个 session 文件全部仍存在；验收产生新隔离 session 后为 672 个
- [x] Gateway event loop 非 degraded，配置有效

## 实测 runId 摘要

| Agent | 主会话结果 |
| --- | --- |
| ops | `916c7831-8aef-4938-bb6c-f8ed580cc531` |
| housekeeper | `e18e00e3-cd2b-4c3d-9f8e-f18bd872a7f4` |
| coder | `2931e258-26c2-4150-adf6-7d072b082eba` |
| reviewer | `3c403d0d-ca24-4a2e-85ea-7deb81c439b4` |
| life | `6f2ce935-9dd7-41ce-9144-0deca18c9a86` |
| companion-wu | `8e1ef37b-d75e-4b36-b4a0-dbbec0660d18` |
| companion-lv | `3a52c591-bfe4-470e-92a6-f75933b9855f` |
| companion-dugu | 工具调用成功；该模型主回复为 `NO_REPLY`，子任务 `CHILD_OK_DUGU` 已落盘 |

## 现场说明

- OpenClaw：2026.7.1-2。
- 当前交互 shell 显示 Node v22.14.0，OpenClaw 内部部分运行输出显示 v22.22.3；本轮未改 Node，因为当前 Gateway、配置和八账号均健康，更新 Node 不属于本任务范围。
- 唯一配置 warning 是已停用 `ops-telegram-admin` 仍保留历史配置；它没有参与运行。`life-automation` 与 `housekeeper-async-dispatch` 均保持 enabled。

## 回滚

恢复部署前 `openclaw.json` 和八个 workspace 五件套备份；不删除新产生的 transcript，只撤销新增工具 allow、per-agent subagents 配置和默认 subagents 参数，然后 validate 并在必要时一次重启。
