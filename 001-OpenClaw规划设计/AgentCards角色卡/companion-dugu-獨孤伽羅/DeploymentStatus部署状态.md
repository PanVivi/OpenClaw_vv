# companion-dugu｜獨孤伽羅｜部署进度

## 2026-07-24 Workboard 非工程任务执行

- 当前设计与实际部署版本：v0.06 `CANDIDATE`。
- companion-dugu 仅取得官方 Workboard worker 状态与证据工具，用于领取和完成其职责内非工程卡片。
- 未取得工程执行、建卡改派、文件、凭据、Gateway、任意消息或 Cron 权限；Telegram 探测正常。

## 2026-07-23 v0.05 实际状态

- 五件套已部署；同一 companion-dugu 的非工程子 Agent调用成功，完成证据已落盘。
- 子 Agent没有 shell、文件、凭据、生产写入、history、message 或 cron 权限。Telegram connected/probe 正常。

- Agent ID：`companion-dugu`
- 当时设计版本：v0.05 `CANDIDATE`
- 当时实际部署版本：v0.03 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 18:20 +08:00

## 已验证

- v0.03 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-2/grok-4.20-0309-non-reasoning`；fallback 配置存在。
- Telegram：account `companion-dugu` → Agent `companion-dugu`，Bot 身份为獨孤伽羅，当前 running/connected/probe 正常，restartPending=false；旧热重载超时已恢复。
- 工具：同角色非工程 spawn/yield/subagents 与 A2A 消息投递可用；工程读写、执行、Gateway、message、Cron 与 `sessions_history` 拒绝。
- A2A：作为发送方已验证；不授予其他 Agent 历史、workspace、记忆或现实权限。
- Sandbox：关闭；专属恢复包存在。

## 未完成与下一步

- v0.05 尚未按无损更新任务部署；
- Telegram 需完整 Gateway 重启后复验 polling 与真实收发；
- 独立长期记忆未部署。

先完成一次完整 Gateway 重启并复验现有 Telegram account/binding；角色卡 v0.05 另按无损更新任务部署，同时保留旧 transcript 和恢复包。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/companion-dugu/recovery/session-continuity-20260723T095812+0800`
- Telegram 修复报告：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
