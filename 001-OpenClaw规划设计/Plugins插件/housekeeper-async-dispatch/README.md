# Housekeeper Async Dispatch

OpenClaw 2026.7.1 及以上的最小策略插件。它将 `housekeeper` 发起的所有 `sessions_send` 强制改为官方 fire-and-forget 模式（`timeoutSeconds: 0`），防止贾南风在用户会话中同步等待其他 Agent；v1.2.2 另为纯文本或 Markdown 粗体格式的 Task ID 委派建立持久停滞监控，并在目标 Agent 的 A2A 回传进入 housekeeper 前自动更新进度/终态。超期告警只陈述“未在期限前收到回报”，不得把未知执行状态说成任务失败或卡死。

## 行为

- 仅匹配 `agentId=housekeeper` 且工具为 `sessions_send` 的调用。
- 保留目标、任务内容、权限和 A2A 路由，只把等待时间改为 `0`。
- OpenClaw 接受任务后立即返回 `status=accepted`；目标 Agent 在独立 session lane 中执行，完成结果继续走内置 announce/reply-back。
- 不改变 Telegram 队列模式、不并发写入同一 transcript、不开放新工具或权限。
- 不拦截 `sessions_list`、`session_status` 或其他 Agent 的 `sessions_send`。
- 带 `Task ID:` / `任务 ID:` 的 A2A 委派会写入 `0600` 状态文件；默认 10 分钟没有目标 Agent 的确认或进度更新即标记 `blocked`，并通过 housekeeper 的 owner Telegram 会话主动上报。
- `housekeeper_task_watch` 用于记录 `waiting/progress/completed/blocked/cancelled`。目标 Agent 有回告时必须更新；`completed/cancelled` 关闭监控，避免误报。
- 内部 `sessions_send` 回传含同一 Task ID 时，运行时会先自动登记 `progress`；仅当回传明确写出 `Status: completed/failed/blocked/cancelled`、`本任务完成` 或等价终态时才关闭/阻塞监控。少主普通提问不会触发该自动判定。
- 监控只保存 Task ID、目标、时间和状态，不保存用户正文、凭据或其他 Agent transcript。
- 状态写入使用跨插件实例文件锁与唯一临时名；监控写入异常只记录运行日志，不得阻断原始 `sessions_send` 或 housekeeper 接收 A2A 回传。

## 配套规则

housekeeper 的角色卡规定：

1. 用户会话只负责接单、拆分、异步派发和立即回执；
2. 长任务使用独立 Task ID 和独立目标 session key；
3. 不在用户轮次中轮询、睡眠或同步等待；
4. 完成由目标 Agent 通过 OpenClaw 的 push/announce 回传。
5. 下游 Agent 接受具体长任务后由它创建**同角色**子 Agent，立即回传 runId；贾南风不跨角色创建子 Agent。
6. 目标 Agent 报告进度、完成、失败或阻塞后，运行时先更新 `housekeeper_task_watch`，贾南风再核验并主动向少主报告；不得预创建记录，也不得等少主追问。

该插件是运行时保险，角色卡规则是模型行为约束；两者共同生效。
