# ops｜魚玄機｜部署进度

- Agent ID：`ops`
- 当前设计版本：v0.09 `CANDIDATE`
- 当前实际部署版本：v0.09 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 17:20 +08:00

## 已验证

- v0.09 五个 workspace 文件已部署，NAS 与当前仓库 SHA-256 一致。
- 模型：primary `custom-1/gpt-5.6-terra`；fallback 配置存在。
- Telegram：account `default` → Agent `ops`，实际收发已通过。
- 工具：workspace 内只读、web、memory 查询、`sessions_list/send/status` 和 `ops_telegram_admin` 可用；通用写入、执行、Gateway、message、Cron、spawn 与 `sessions_history` 拒绝。
- `ops_telegram_admin` 只允许五个固定未绑定 Agent 的 Telegram account/binding。魚玄機已真实调用 `status` 成功；首次真实新增等待少主重新发送被脱敏的 Token。
- A2A：八个固定 Agent 可互发，ops 作为发送方已验证；传输不扩大工程执行权限。
- Sandbox：关闭。
- 连续性：专属恢复包存在；旧 transcript 保留，维护测试已与个人记忆分离。

## 未完成

- 专用 Task/Stage/Gate 持久化和跨重启自动续跑未部署；
- 通用 NAS shell、Gateway 和任意配置权限仍未开放；当前只增加经过固定边界审查的 Telegram 专用工具。
- coder 的旧 Token 已被 OpenClaw 脱敏，当前尚未生成 coder account/binding。

## 下一步

少主向魚玄機重新发送一条同时包含完整 Token、目标 coder/步非煙和立即绑定意图的新消息；完成后记录无凭据 probe 结果。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/ops/recovery/session-continuity-20260723T095812+0800`
- 插件部署前备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-telegram-admin-20260723T171408`
