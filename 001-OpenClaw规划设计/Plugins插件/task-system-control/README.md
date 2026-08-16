# task-system-control v2.1

OpenClaw 2026.7.1-2+ 的持久任务入口与直接角色委派插件。

新任务链：

```text
owner 入站 → inbox → 顶层 plan → role packet
→ 目标角色 direct subagent
→ task_work_proof + task_work_complete
→ 依赖推进 → 賈南風账号直接发送白话 Telegram 结果
```

## 关键边界

- 外部 path 插件不调用受 trusted-official 限制的 Gateway runtime，也不依赖 Workboard 建卡才能启动。
- 一个 packet 确定性对应一个 work unit；不再启动 packet controller 做第二次 LLM 拆分。
- direct worker 使用每 unit、每 generation 唯一 session 和 nonce；结果未知时不自动重跑。
- 生产 `plugin_subagent` 路径以 Gateway accepted runId、固定 session、generation/nonce 进入运行态；`subagent_spawned` 若出现只做一致性观察。
- 极短任务允许 ended 先于 run 返回并做 CAS 合并；只有成功 outcome、proof 与 complete 均齐备才算成功。
- 主会话可做现有角色权限允许的只读核对；exec、写入、业务变更仍必须委派。
- `controllerSessions`、`controllerLeaseMs`、`boardId`、`gatewayTimeoutMs`、`maxDispatchPasses` 暂留一版配置兼容，但不驱动新任务。
- 旧 Workboard/controller 状态保留为迁移证据，不在 Gateway 启动时自动重放；只有冻结的 v2 占位指纹可继承 packet 的角色与能力边界，其余异常记录隔离。
- 完成通知不依赖 heartbeat 或额外模型调用。插件只向已核验 owner `senderId` 发送，使用贾南风 Telegram account；唯一 outbox claim 防并发重复，发送结果未知时不自动重发。
- 普通 Agent 消息与完成直发使用不同 outbox kind；旧完成时间不能证明 Telegram 送达，会保守迁移为 unknown/quarantine。

## 工具

- `task_delegate`：计划、检查、显式对账、阻塞和取消；
- `task_intake`：owner 任务入口和最终通知账本；
- `task_handoff`：旧跨角色入口兼容；
- `task_module`：晨间模块预期收据；
- `task_work_proof` / `task_work_complete`：仅当前 direct worker 可写的双收据。

部署时必须把两个收据工具的精确名称加入各目标角色现有 `tools.allow`，不得借此增加其他核心工具权限。
