# housekeeper｜賈南風｜部署进度

- Agent ID：`housekeeper`
- 当前设计版本：v1.09 `CANDIDATE`
- 当前实际部署版本：v1.08 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 11:06 +08:00

## 已验证

- v1.08 五个 workspace 文件来自固定提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`，部署报告和 40 文件一致性校验通过。
- 模型：primary `custom-2/grok-4.5`；fallback 配置存在。
- Telegram：account `housekeeper` → Agent `housekeeper`，实际收发已通过。
- 工具：workspace 内 `read`、`sessions_list/send/status` 和 memory 查询可用；写入、执行、Gateway、Cron、message、spawn 与 `sessions_history` 拒绝。
- A2A：八个固定 Agent 可互发，housekeeper 作为发送方已验证；`visibility=all` 只用于目标解析，历史仍关闭。
- Sandbox：关闭。
- 连续性：专属恢复包存在；个人聊天恢复索引由 housekeeper 自己的 9 段 transcript 派生并校验，通用运维摘要与个人记忆已分离。

## 未完成

- v1.09 尚未按无损更新任务部署；
- 自动长期记忆、任务持久化和跨重启自动续跑仍未部署；
- v1.08 仍是当前 NAS 角色文件回滚基线，v1.02 是最近 `STABLE` 角色基线。

## 下一步

按 `LosslessContentUpdate无损内容更新任务-v0.01.md` 备份后，只替换五个 workspace 文件并验证原 Telegram 会话、个人记忆和 A2A 不受影响；通过前不得将 v1.09 标记为已部署或 `STABLE`。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/housekeeper/recovery/session-continuity-20260723T095812+0800`
- 修复备份：`/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-personal-memory-a2a-all-20260723T103858+0800`
