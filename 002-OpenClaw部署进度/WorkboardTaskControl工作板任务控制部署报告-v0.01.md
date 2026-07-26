# Workboard Task Control 工作板任务控制部署报告 v0.01

- 日期：2026-07-24
- 分支：`agent/lossless-content-update`
- 目标环境：OpenClaw 2026.7.1-2 / Node.js 22.22.3
- 结论：部署与计划内实际验收通过

## 1. 架构结论

正式任务使用四层事实：

1. Workboard：业务卡片、指派、依赖、claim、heartbeat、proof、终态和通知。
2. Tasks / Task Flow：后台执行事实与跨重启状态。
3. Standing Orders / 角色风险协议：一次任务授权、低中风险自动闭环、高风险集中升级。
4. Cron：只负责固定调度和终态送达，不保存业务任务真相。

未引入 n8n、LangGraph、CrewAI 或第三方 Mission Control。长任务运行在责任角色独立 worker，賈南風主会话只做控制面。

## 2. 生产变更

### Workboard 与适配层

- 启用官方 Workboard，建立 `production` 工作板。
- 安装 `housekeeper-workboard-control 1.0.3`。
- `housekeeper_workboard_start`：固定调用 `workboard dispatch --json [--board]`。
- `housekeeper_workboard_show`：固定调用 `workboard show <UUID> --json`。
- 两个工具仅对 `housekeeper` 注册；不暴露任意 shell、文件、环境、消息或配置。

### 权限

- housekeeper：建卡、拆分、依赖、指派、通知、dispatch、只读 show；继续 deny `exec/process/write/edit/apply_patch/gateway/message/sessions_history`。
- 八角色 worker：只获得 Workboard list/read/claim/heartbeat/comment/proof/complete/block/release/worker log/protocol violation。
- 原有角色工具与 deny 边界未扩大。

### 调度与通知

- `WorkboardDispatchPump`
  - jobId：`6c7eb802-d869-4ebc-b40b-b8b4f0c0e639`
  - declarationKey：`workboard-dispatch-pump-v1`
  - 周期：1 分钟
  - 固定执行官方 `workboard dispatch --board production --json`
  - 失败一次即由 housekeeper Telegram 告警，10 分钟冷却
- `WorkboardNotificationPump`
  - jobId：`deac91f2-13b3-4319-9409-fa18c08b328b`
  - declarationKey：`workboard-notification-pump-v1`
  - 周期：2 分钟
  - 订阅：`9fb9d472-1880-4170-ba9e-1aa333d24696`
  - 终态：completed / failed / stale
  - 无事件：`NO_REPLY`
  - 有事件：按 UUID 读取真实标题、状态和摘要后送达 housekeeper Telegram

### 旧看门狗迁移

- `housekeeper-async-dispatch 1.2.2`：disabled。
- `housekeeper_task_watch`：已从 housekeeper allowlist 移除。
- 旧插件目录和 `/Volume3/OpenClaw/home/.openclaw/housekeeper-async-dispatch/tasks.json` 保留。
- 历史卡：
  - `LEGACY-TEST-DELEGATE-004`：`62d2417f-d156-4457-9dbb-764826320fbd`，done。
  - `LEGACY-PURELOVE-STATUS-20260724`：`554cb6cd-e1c0-4586-a1eb-2130fa121fe2`，blocked。

## 3. 无损措施

- 备份：`/Volume3/OpenClaw/home/.openclaw/backups/workboard-task-control-20260724T191932`
- 文件数：1437，SHA256 清单已核对。
- 角色卡包：40 个运行文件，远端安装门禁 PASS。
- 最终一致性核对清除了 housekeeper v1.12 中旧 `housekeeper_task_watch` / `housekeeper-async-dispatch` 的生产执行表述；AGENTS.md 与 TOOLS.md 已重新部署并与仓库 SHA256 一致。
- 未修改 Telegram token/binding、现有 transcript、个人记忆、会话路由或 CodexResetWatcher。

## 4. 实际验收

| 项目 | 证据 | 结果 |
| --- | --- | --- |
| 建卡到执行 | card→Task→run→session→heartbeat→proof→done | PASS |
| 成功链 | `3ec44f63-319d-448d-8507-cbc3c82fffb5` / `WORKBOARD_OPS_OK` | PASS |
| 受控阻塞 | `74d85d4a-382f-47e9-886c-00a39d1c140b` / `CONTROLLED_BLOCK_OK` | PASS |
| 并发 | ops `1606d140-...` 与 life `b7a43b5e-...` 同时运行 | PASS |
| 前台不阻塞 | 并发期间 housekeeper Telegram `deliverySucceeded=true` | PASS |
| 条件续办 | 父 `f41f8ab5-...` 完成后子 `fd979e51-...` 自动提升、启动、done | PASS |
| 超时失联 | `e9569ddb-...` 在 max runtime 后 blocked，原因精确上报 | PASS |
| 重启恢复 | `d543ee85-...` 重启前 ready，重启后保留且只启动一次，`RESTART_PERSIST_OK` | PASS |
| 通知 | `e621cdc8-...` 标题/cardId/status/摘要 Telegram delivered | PASS |
| A2A | housekeeper→ops、housekeeper→life 均返回 ACK | PASS |
| 权限负向 | housekeeper=`EXEC_UNAVAILABLE`；reviewer=`WRITE_UNAVAILABLE`；测试文件不存在 | PASS |
| Telegram | 8 account running/probe ok；housekeeper 主消息 status=sent | PASS |
| 数据无损 | 455+/869+/233 ≥ 381/766/201 | PASS |
| 原生审计 | `tasks audit` 0；config valid；plugin doctor 无问题 | PASS |

计划中“失联只产生 stale/diagnostic、不进入失败终态”的预期与当前官方 2026.7.1 行为不完全一致：超过卡片 max runtime 后，dispatcher 将 execution 和卡片置为 blocked，并产生 failed 通知，原因保留为 `Run exceeded the card max runtime`。生产按官方真实语义记录，不伪装成仍在运行。

## 5. 已知但未扩展处理的风险

`openclaw security audit` 仍报告原系统已有的 Control UI 无认证、危险设备认证开关、默认宽工具面等问题。Gateway 当前 loopback；这些不是本次任务控制变更引入，也不在本轮授权范围内，未擅自修改。

## 6. 回滚

1. 禁用两个 Workboard Cron。
2. 恢复备份中的 OpenClaw 配置和八角色五件套。
3. 如确需临时回退，重新启用 `housekeeper-async-dispatch` 配置并恢复 `housekeeper_task_watch` allow。
4. 不删除 Workboard 数据、旧看门狗状态、session、transcript、记忆和凭据；先保留证据再决定后续迁移。
