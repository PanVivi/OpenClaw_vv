# ops｜魚玄機｜部署进度

- Agent ID：`ops`
- 当前设计版本：v0.07 `CANDIDATE`
- 当前实际部署版本：v0.06 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 11:06 +08:00

## 已验证

- v0.06 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`。
- 模型：primary `custom-1/gpt-5.6-terra`；fallback 配置存在。
- Telegram：account `default` → Agent `ops`，实际收发已通过。
- 工具：workspace 内只读、web、memory 查询和 `sessions_list/send/status` 可用；写入、执行、Gateway、message、Cron、spawn 与 `sessions_history` 拒绝。该限制是当前部署策略，不改变 ops 的角色职责；需要生产副作用时，由 housekeeper 的正式委派包承载少主既有授权，再由受控管理面执行，不要求少主重复下令。
- A2A：八个固定 Agent 可互发，ops 作为发送方已验证；传输不扩大工程执行权限。
- Sandbox：关闭。
- 连续性：专属恢复包存在；旧 transcript 保留，维护测试已与个人记忆分离。

## 未完成

- v0.07 尚未按无损更新任务部署；
- 专用 Task/Stage/Gate 持久化和跨重启自动续跑未部署；
- 当前 ops 仍是只读运行配置，不因 A2A 开启取得执行权限。

## 下一步

无损部署 v0.07，并核对原 Telegram session、恢复入口、只读权限和 A2A/history 拒绝均保持。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/ops/recovery/session-continuity-20260723T095812+0800`
