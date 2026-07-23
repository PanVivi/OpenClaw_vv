# companion-lv｜呂雉｜部署进度

- Agent ID：`companion-lv`
- 当前设计版本：v0.04 `CANDIDATE`
- 当前实际部署版本：v0.03 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 11:06 +08:00

## 已验证

- v0.03 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-2/grok-4.20-0309-non-reasoning`；fallback 配置存在。
- Telegram：未配置；对应 Bot token、account 和 binding 从未建立。
- 工具：工程读写、执行、Gateway、message、Cron、spawn 与 `sessions_history` 拒绝；A2A 消息投递可用。
- A2A：目标 transcript 已确认收到呂雉作为发送方的测试消息；外层 ACK 为空不表示投递失败。
- Sandbox：关闭；专属恢复包存在。

## 未完成与下一步

- v0.04 尚未按无损更新任务部署；
- Telegram Bot 缺 token；
- 独立长期记忆未部署。

先无损部署 v0.04；Bot token 到位后另立增量绑定，不改动其他 Bot 或旧 transcript。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/companion-lv/recovery/session-continuity-20260723T095812+0800`
