# coder｜步非煙｜部署进度

## 2026-07-23 职责权限实测

- 正式 housekeeper 委派包承载同范围任务授权；具体长任务使用同角色子 Agent，主会话不长时间占用。
- 生产 Sandbox 内实际 `read AGENTS.md` 与 `exec pwd`：2 calls / 0 failures，`pwd=/workspace`，无重复索权。

## 2026-07-23 v0.08 实际状态

- 五件套已部署；同一 coder 子 Agent实测成功并产生完成证据。
- 子 Agent继承 coder 的 Sandbox 与工具上限，不开放 web、Gateway、history、message 或 cron。Telegram connected/probe 正常。

- Agent ID：`coder`
- 当前设计版本：v0.08 `CANDIDATE`
- 当前实际部署版本：v0.06 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 18:20 +08:00

## 已验证

- v0.06 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-1/gpt-5.6-sol`；fallback 配置存在。
- Telegram：account `coder` → Agent `coder`，当前 `running=true`、`connected=true`、`restartPending=false`、probe ok；旧热重载超时已恢复。
- 工具：workspace 内 read/write/edit/apply_patch/exec/process、`sessions_list/send/status` 与同角色 spawn/yield/subagents 可用；Gateway、message、Cron、web 与 `sessions_history` 拒绝。
- Sandbox：`mode=all`；镜像 `openclaw-sandbox:bookworm-slim` 和 hardened Docker/集成 Smoke Test 已通过。
- A2A：八个固定 Agent 可互发，coder 作为发送方已验证；Sandbox session tool visibility 已单独设置。
- 连续性：专属恢复包存在；未部署完整长期记忆。

## 未完成

- v0.08 尚未按无损更新任务部署；
- Telegram 需完整 Gateway 重启后复验 polling 与真实收发；
- 专用 Gate 持久化、硬单次消费、跨重启自动续跑和技术子 Agent 未部署。

## 下一步

先完成一次完整 Gateway 重启并复验现有 Telegram account/binding；角色卡 v0.08 另按无损更新任务部署，并保持 Sandbox、session、transcript 和 memory。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/coder/recovery/session-continuity-20260723T095812+0800`
- Telegram 修复报告：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
