# Housekeeper Async Dispatch

OpenClaw 2026.7.1 及以上的最小策略插件。它将 `housekeeper` 发起的所有 `sessions_send` 强制改为官方 fire-and-forget 模式（`timeoutSeconds: 0`），防止贾南风在用户会话中同步等待其他 Agent 120—300 秒。

## 行为

- 仅匹配 `agentId=housekeeper` 且工具为 `sessions_send` 的调用。
- 保留目标、任务内容、权限和 A2A 路由，只把等待时间改为 `0`。
- OpenClaw 接受任务后立即返回 `status=accepted`；目标 Agent 在独立 session lane 中执行，完成结果继续走内置 announce/reply-back。
- 不改变 Telegram 队列模式、不并发写入同一 transcript、不开放新工具或权限。
- 不拦截 `sessions_list`、`session_status` 或其他 Agent 的 `sessions_send`。

## 配套规则

housekeeper 的角色卡规定：

1. 用户会话只负责接单、拆分、异步派发和立即回执；
2. 长任务使用独立 Task ID 和独立目标 session key；
3. 不在用户轮次中轮询、睡眠或同步等待；
4. 完成由目标 Agent 通过 OpenClaw 的 push/announce 回传。

该插件是运行时保险，角色卡规则是模型行为约束；两者共同生效。
