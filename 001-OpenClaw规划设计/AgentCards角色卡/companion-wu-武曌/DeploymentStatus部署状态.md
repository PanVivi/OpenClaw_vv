# companion-wu｜武曌｜部署进度

- Agent ID：`companion-wu`
- 当前设计版本：v0.04 `CANDIDATE`
- 当前实际部署版本：v0.03 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 18:37 +08:00

## 已验证

- v0.03 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-2/grok-4.20-0309-non-reasoning`；fallback 配置存在。
- Telegram：account `companion-wu` → Agent `companion-wu`，binding 存在；当前 Token probe 为 HTTP 404，`running=false`、`connected=false`、`restartPending=true`，`deleteWebhook` 返回 `Not Found`。现有 Token 不得视为有效。
- 工具：工程读写、执行、Gateway、message、Cron、spawn 与 `sessions_history` 拒绝；A2A 消息投递可用。
- A2A：目标 transcript 已确认收到武曌作为发送方的测试消息；外层 ACK 为空不表示投递失败。
- Sandbox：关闭；专属恢复包存在。

## 未完成与下一步

- v0.04 尚未按无损更新任务部署；
- 独立长期记忆未部署。
- 缺少经 BotFather 核对的新有效 Token。

取得新有效 Token 后，由魚玄機按 v0.12 的一个任务级授权包自动完成同一 account 凭据更新、probe、必要重载和真实收发验收；不得改现有 binding、其他 Bot、session、transcript 或 memory。角色卡 v0.04 另按无损更新任务部署。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/companion-wu/recovery/session-continuity-20260723T095812+0800`
- Telegram 修复报告：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
