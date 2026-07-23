# coder｜步非煙｜部署进度

- Agent ID：`coder`
- 当前设计版本：v0.07 `CANDIDATE`
- 当前实际部署版本：v0.06 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 11:06 +08:00

## 已验证

- v0.06 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-1/gpt-5.6-sol`；fallback 配置存在。
- Telegram：未配置；对应 Bot token、account 和 binding 从未建立。
- 工具：workspace 内 read/write/edit/apply_patch/exec/process 与 `sessions_list/send/status` 可用；Gateway、message、Cron、web、spawn 与 `sessions_history` 拒绝。
- Sandbox：`mode=all`；镜像 `openclaw-sandbox:bookworm-slim` 和 hardened Docker/集成 Smoke Test 已通过。
- A2A：八个固定 Agent 可互发，coder 作为发送方已验证；Sandbox session tool visibility 已单独设置。
- 连续性：专属恢复包存在；未部署完整长期记忆。

## 未完成

- v0.07 尚未按无损更新任务部署；
- Telegram Bot 缺 token，不能创建真实 account/binding；
- 专用 Gate 持久化、硬单次消费、跨重启自动续跑和技术子 Agent 未部署。

## 下一步

先无损部署 v0.07 并保持 Sandbox；Bot token 由用户提供后另立最小增量，仅添加 coder account/binding。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/coder/recovery/session-continuity-20260723T095812+0800`
