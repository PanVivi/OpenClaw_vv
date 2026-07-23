# coder｜步非煙｜部署进度

- Agent ID：`coder`
- 当前设计版本：v0.07 `CANDIDATE`
- 当前实际部署版本：v0.06 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 18:20 +08:00

## 已验证

- v0.06 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-1/gpt-5.6-sol`；fallback 配置存在。
- Telegram：account `coder` → Agent `coder`，Token probe `ok=true`；连续配置热重载后出现 `channel stop timed out after 5000ms`，当前 `running=false`、`connected=false`、`restartPending=true`。
- 工具：workspace 内 read/write/edit/apply_patch/exec/process 与 `sessions_list/send/status` 可用；Gateway、message、Cron、web、spawn 与 `sessions_history` 拒绝。
- Sandbox：`mode=all`；镜像 `openclaw-sandbox:bookworm-slim` 和 hardened Docker/集成 Smoke Test 已通过。
- A2A：八个固定 Agent 可互发，coder 作为发送方已验证；Sandbox session tool visibility 已单独设置。
- 连续性：专属恢复包存在；未部署完整长期记忆。

## 未完成

- v0.07 尚未按无损更新任务部署；
- Telegram 需完整 Gateway 重启后复验 polling 与真实收发；
- 专用 Gate 持久化、硬单次消费、跨重启自动续跑和技术子 Agent 未部署。

## 下一步

先完成一次完整 Gateway 重启并复验现有 Telegram account/binding；角色卡 v0.07 另按无损更新任务部署，并保持 Sandbox、session、transcript 和 memory。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/coder/recovery/session-continuity-20260723T095812+0800`
- Telegram 修复报告：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
