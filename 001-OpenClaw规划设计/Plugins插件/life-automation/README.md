# Life Automation Tool Plugin

OpenClaw 2026.5.17 及以上的原生 Tool Plugin。它只向 `life` Agent 暴露 `life_automation`，由插件内置的最小持久调度器让萧观音直接管理生活自动化。

## 权限边界

- 只在运行时 `agentId=life` 时注册工具。
- 新任务强制由 `life` 执行；插件每 15 秒检查一次原子持久化状态，到期时调用 OpenClaw 的 Agent runtime。
- 不接受 shell command、触发脚本、Webhook 或任意 Agent ID。
- 插件只在自己的私有状态文件中登记任务，使用原子替换和 `0600` 权限；不会读写其他 Agent 数据。
- `notify_owner=true` 时只向插件配置中的固定 `life` Telegram 会话投递最终结果。
- 支持 `list/get/create/update/pause/resume/remove/run_now`。
- 使用 `cron-parser` 计算 IANA 时区和 DST 下的下一次运行时间；Gateway 重启后从状态文件恢复。

## 配置

```json
{
  "agentId": "life",
  "timezone": "Asia/Taipei",
  "ownerChatId": "<固定 Telegram chat ID>",
  "telegramAccountId": "life"
}
```

该插件解决的是 OpenClaw 内置 `cron` 在非 owner/A2A 接收轮次被移除后，`life` 无法按既定职责直接落地自动化的问题。OpenClaw 2026.7.1-2 的第三方插件不能调用 Cron RPC，公开的 `scheduleSessionTurn` 也仅对 bundled origin 生效，因此本插件不调用受限 Gateway RPC、不修改 Cron 数据库、不依赖 `ops` 或 Codex 在线。
