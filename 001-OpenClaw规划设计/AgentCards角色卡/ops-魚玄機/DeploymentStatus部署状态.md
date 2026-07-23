# ops｜魚玄機｜部署进度

- Agent ID：`ops`
- 当前设计版本：v0.10 `CANDIDATE`
- 当前实际部署版本：v0.10 `CANDIDATE`
- 当前运行状态：`completed`
- 最后核验：2026-07-23 18:25 +08:00

## 已验证

- v0.10 五个 workspace 文件已部署，NAS 与当前仓库 SHA-256 一致。
- 模型：primary `custom-1/gpt-5.6-terra`；fallback 配置存在。
- Telegram：account `default` → Agent `ops`，实际收发已通过。
- 工具：workspace 范围的 `read/write/edit/apply_patch`、NAS Gateway `exec/process`、web、memory、`sessions_list/send/status` 和 `ops_telegram_admin` 可用。`exec` 固定 `host=gateway`、`mode=auto`、`strictInlineEval=true`；host approvals 为 `allowlist/on-miss/deny fallback`。
- 禁止工具：任意 `gateway`、`message`、`cron`、`sessions_spawn` 与 `sessions_history` 继续拒绝；生产配置和服务操作只经受审 `exec` 处理。
- 正向验收：reviewer.Risk 后，魚玄機真实执行 `/usr/bin/pwd` 与 `/usr/local/sbin/openclaw --version`，自动审查分别单次放行；workspace 写入/回读成功；后台 `/usr/bin/sleep 2` 由 `process` 返回退出码 0。
- 负向验收：缺少 Risk、固定命令、diff、备份和回滚时，魚玄機拒绝修改配置与重启，未调用副作用工具。
- `ops_telegram_admin` 已完成首次真实新增：coder account/binding 存在，Token 使用固定 secret；Gateway 完整重启后 coder、default、housekeeper、life 四个 Telegram account 均 `running=true`、probe `ok=true`。
- A2A：八个固定 Agent 可互发，ops 作为发送方已验证；传输不扩大工程执行权限。
- Sandbox：关闭。
- 连续性：专属恢复包存在；旧 transcript 保留，维护测试已与个人记忆分离。

## 未完成 / 增强项

- 专用 Task/Stage/Gate 持久化和跨重启自动续跑未部署；
- 专用 Gate 持久化、硬单次消费和跨重启任务自动续跑仍未部署；
- 任意 Gateway RPC、Cron、跨会话历史、技术子 Agent 和任意外发消息按基础设计继续关闭。

## 下一步

后续真实工程任务按 housekeeper 正式委派 → reviewer.Risk → ops 执行/自检 → reviewer.Test 验证；无需少主向魚玄機重复同一授权。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/ops/recovery/session-continuity-20260723T095812+0800`
- 插件部署前备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-telegram-admin-20260723T171408`
- 权限修复备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-runtime-permissions-20260723T180500+0800`
- 权限修复报告：`002-OpenClaw部署进度/OpsRuntimePermissions鱼玄机运行权限修复报告-v0.01.md`
