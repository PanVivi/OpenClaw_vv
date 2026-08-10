# Workflow Governance

当前版本：1.1.0

面向 `housekeeper` 和 `ops` 的 OpenClaw 2026.7.1+ 治理插件。它把正式计划 SHA-256、三次独立完整审查、执行阶段、验收证据和唯一最终通知写入官方 Task Flow。所有入口固定绑定 `agent:housekeeper:task-system`，不再因调用角色或 Telegram 会话不同而分裂所有者。

计划哈希变更会清空全部审查；少于三次或不是 `independent_complete` 的审查不能开启执行。验收、文档和同步结束后，flow 先进入 `notification_pending`；只有记录真实通知 message ID 才终结。

`simple_task`、`governed_change` 和 `research_plan_triple_review` 使用不同闸门；只有最后一种要求三次独立完整审查。Workboard detached run 自动产生的真实 Task 与 `task_mirrored` Flow 通过 `link_work` 关联，不再调用 `runTask` 制造第二条 Task。若存在外部执行，只有真实状态 succeeded 且有完成收据才能进入最终通知；不能先把父项写成完成。

插件同时在副作用前分级处理 `ops` 的通用 `exec/process`：低风险直接通过；中风险先在内部登记范围、备份和回滚，参数完全一致时自动放行，不询问少主；高风险只生成一次自然中文决定，讲清目标、直接影响、最坏情况、回退、替代和准确动作。只读查询中出现 `password/token/credential` 字样不会被误判为高风险；同一会话一次只允许一项待决定高风险动作，重试不会再问。少主的同意或拒绝只从同一 owner Telegram 会话的明确短句中取得，参数变化会产生新的决定。整个过程不调用 OpenClaw 原生审批卡；失败后可重试同一已同意动作，成功即关闭授权。
