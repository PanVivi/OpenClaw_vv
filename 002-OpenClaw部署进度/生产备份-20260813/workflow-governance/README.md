# Workflow Governance 1.2.0

OpenClaw 2026.7.1+ 的正式计划、三次独立完整审查、实施、验收、同步、最终通知与任务级风险治理插件。

计划哈希变化会清空审查；只有同一哈希下三次 `independent_complete`、不同 nonce 和不同证据哈希均通过，才能进入实施。存在外部 Workboard 工作时，所有关联项必须成功且有 proof 才能进入最终通知；真实 Telegram message ID 是通知完成条件。

风险治理已从“绑定魚玄機 Telegram 主会话”改为“绑定正式工作单元”：

- 只有 `ops/coder` 的 Workboard worker 执行 `exec/process` 时进入风险判断；没有 `planId + workUnitId + cardId` 关联的中高风险动作直接拒绝。
- 低风险直接通过；中风险在 worker 内登记精确范围、备份与回滚，参数一致后放行，不询问少主。
- 高风险在副作用前停止，记录动作指纹和 owner route，并只唤醒賈南風原 Telegram 会话一次；worker 不直接联系少主，也不弹原生审批卡。
- 少主在賈南風原会话明确同意后，恢复原 card 并重新 dispatch；拒绝则把原 card 标为 blocked。批准只适用于同一工作单元、相同参数和有限时效。
- Telegram provider 从 `ctx.messageProvider` 识别；数字 `channelId` 不再误当 provider。

旧 `workflow-risk/v1` 状态在读取时增量迁移为 v2，历史记录不会删除。
