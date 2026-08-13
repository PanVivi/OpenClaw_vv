# Workflow Governance 1.3.0

OpenClaw 2026.7.1+ 的正式计划、三次独立完整审查、三审告知风险治理、实施、验收、同步、最终通知插件。

## 计划审查（不变）

计划哈希变化会清空审查；只有同一哈希下三次 `independent_complete`、不同 nonce 和不同证据哈希均通过，才能进入实施。存在外部 Workboard 工作时，所有关联项必须成功且有 proof 才能进入最终通知；真实 Telegram message ID 是通知完成条件。

## 风险治理（1.3.0 变更）

高风险工程命令不再等待少主人工批准。改为以下固定顺序：

1. 高风险动作初次调用没有副作用，记录为 `preflight_required`。
2. 工程 Agent 提交准确范围、已核验备份和可执行回退办法，调用 `review_high_risk`。
3. 插件原子领取唯一 `reviewRunId`，拒绝并发重复启动。
4. 按顺序启动三个全新独立 reviewer 会话（`deliver:false`，不传递前次输出）；内层 `before_tool_call` 闸门在工具执行前拦截所有注册会话的工具调用。
5. 三次均 `approve` 且无 findings 才继续；任一 `block`、超时、坏 JSON 或工具尝试都终止。
6. 启动 housekeeper 草拟会话（`deliver:false`，零工具），生成符合角色语气的白话告知正文。
7. 通过 Telegram outbound adapter 发送告知；只有返回非空 `messageId` 才记为 `notified`。
8. 工程 Agent 重试参数完全相同的原动作；`before_tool_call` 一次性将 `notified` 改为 `executing` 后放行。
9. `after_tool_call` 成功记 `completed`，报错记 `execution_failed`，不再恢复为可执行状态。

### 状态流转

```text
preflight_required → reviewing → notified → executing → completed
                                    ↘ review_blocked (终态)
                               executing → execution_failed (终态)
```

`review_blocked`、`completed`、`execution_failed` 均为不可逆终态。参数变化产生新 fingerprint，必须重新走完整流程。

### 不变的部分

- 低风险只读或标准动作自动执行。
- 中风险在 worker 内登记精确范围、备份与回滚，参数一致后放行，不询问少主。
- 只有 `ops/coder` 的 Workboard worker 执行 `exec/process` 时进入风险判断；没有 `planId + workUnitId + cardId` 关联的中高风险动作直接拒绝。
- Telegram provider 从 `ctx.messageProvider` 识别；数字 `channelId` 不再误当 provider。
- Task Flow、Workboard、最终验收通知等 1.2.0 既有逻辑不变。

旧 `workflow-risk/v1` 状态在读取时增量迁移为 v2，历史记录不会删除。
