# companion-lv｜呂雉｜部署进度

## 2026-07-23 v0.05 实际状态

- 五件套已部署；同一 companion-lv 的非工程子 Agent实测成功。
- 子 Agent没有 shell、文件、凭据、生产写入、history、message 或 cron 权限。Telegram connected/probe 正常。

- Agent ID：`companion-lv`
- 当前设计版本：v0.05 `CANDIDATE`
- 当前实际部署版本：v0.03 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 18:20 +08:00

## 已验证

- v0.03 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-2/grok-4.20-0309-non-reasoning`；fallback 配置存在。
- Telegram：account `companion-lv` → Agent `companion-lv`；最终 Bot 身份为呂雉，`running=true`、`connected=true`、probe `ok=true`、`restartPending=false`、无 `lastError`。
- 工具：同角色非工程 spawn/yield/subagents 与 A2A 消息投递可用；工程读写、执行、Gateway、message、Cron 与 `sessions_history` 拒绝。
- A2A：目标 transcript 已确认收到呂雉作为发送方的测试消息；外层 ACK 为空不表示投递失败。
- Sandbox：关闭；专属恢复包存在。

## 未完成与下一步

- v0.05 尚未按无损更新任务部署；
- 独立长期记忆未部署。

补做呂雉 Telegram 真实收发验收；角色卡 v0.05 另按无损更新任务部署，不改现有 binding、其他 Bot 或旧 transcript。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/companion-lv/recovery/session-continuity-20260723T095812+0800`
- Telegram 修复报告：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
