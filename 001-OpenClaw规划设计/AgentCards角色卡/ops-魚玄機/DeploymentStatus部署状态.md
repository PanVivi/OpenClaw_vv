# ops｜魚玄機｜部署进度

## 2026-07-23 v0.13 实际状态

- 五件套、三档风险和一次任务授权规则已部署。
- 同一 ops 子 Agent实测成功；指定 `agentId=coder` 被运行层拒绝，证明没有跨角色扩大权限。
- 原有 gateway exec、精确白名单、Telegram 原生绑定流程保持；Gateway/cron/history/message 仍拒绝。Telegram connected/probe 正常。

- Agent ID：`ops`
- 当前设计版本：v0.13 `CANDIDATE`
- 当前实际部署版本：v0.13 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 18:37 +08:00

## 已验证

- v0.13 五个 workspace 文件已部署，NAS 与当前仓库 SHA-256 逐项一致。
- 模型：primary `custom-1/gpt-5.6-terra`；fallback 配置存在。
- Telegram：account `default` → Agent `ops`，实际收发已通过。
- 工具：workspace 范围的 `read/write/edit/apply_patch`、NAS Gateway `exec/process`、web、memory 和 `sessions_list/send/status` 可用。`exec` 固定 `host=gateway`、`mode=auto`、`strictInlineEval=true`；host approvals 为 `allowlist/on-miss/deny fallback`。
- 禁止工具：任意 `gateway`、`message`、`cron` 与 `sessions_history` 继续拒绝；同角色 `sessions_spawn`/yield/subagents 已启用，生产配置和服务操作仍只经受审 `exec` 处理。
- 任务级授权正向验收：`OPS-TASK-AUTH-SMOKE-20260723-01` 中，魚玄機连续调用精确 allowlist 的 Telegram 状态查询、workspace 写入和回读，三次工具调用成功且均无 approval 文本，未要求少主重复授权；测试文件已按回滚删除。
- 负向验收：缺少 Risk、固定命令、diff、备份和回滚时，魚玄機拒绝修改配置与重启，未调用副作用工具。
- host approvals 已移除仅按 `openclaw.mjs` 路径匹配的宽条目，增加 16 条带 `argPattern` 的精确规则；`broad_mjs=0`、`precise_v012=16`。
- `ops_telegram_admin` 已停用且未向 ops 暴露；扩展文件保留作历史与回滚证据。
- 八条 Telegram binding 均存在。default、housekeeper、life、coder、reviewer、companion-dugu、companion-lv 七个 account 均 `running=true`、`connected=true`、probe `ok=true`、`restartPending=false`。
- companion-wu 的旧 HTTP 404 已由后续修复解决；当前运行、连接和 probe 均正常，本轮没有改动其 Token 或 binding。
- 后续 Telegram 账号绑定使用 OpenClaw 原生 `channels add` 与 `agents bind`，经现有受审 `exec` 执行。
- A2A：八个固定 Agent 可互发，ops 作为发送方已验证；传输不扩大工程执行权限。
- Sandbox：关闭。
- 连续性：专属恢复包存在；旧 transcript 保留，维护测试已与个人记忆分离。

## 未完成 / 增强项

- 专用 Task/Stage/Gate 持久化和跨重启自动续跑未部署；
- 专用 Gate 持久化、硬单次消费和跨重启任务自动续跑仍未部署；
- 任意 Gateway RPC、Cron、跨会话历史、技术子 Agent 和任意外发消息按基础设计继续关闭。
- companion-wu 需要少主提供经 BotFather 核对的有效 Token 后，由魚玄機按 v0.13 任务级授权自动更新、验证并在必要时一次重载；八 Bot 真实收发未全部完成前不得标记 Telegram 全量上线。

## 下一步

后续真实工程任务按少主直接任务或 housekeeper 正式委派形成一个任务级授权包 → 内部 reviewer.Risk → ops 连续执行/自检 → reviewer.Test 验证；授权包内不要求少主逐步骤批准，只有严重例外暂停上报。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/ops/recovery/session-continuity-20260723T095812+0800`
- 插件部署前备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-telegram-admin-20260723T171408`
- 插件停用备份：`/Volume3/OpenClaw/home/.openclaw/backups/disable-ops-telegram-admin-20260723T175706+0800`
- 权限修复备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-runtime-permissions-20260723T180500+0800`
- 权限修复报告：`002-OpenClaw部署进度/OpsRuntimePermissions鱼玄机运行权限修复报告-v0.01.md`
- 原生绑定修复报告：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
- 任务级自动化修复报告：`002-OpenClaw部署进度/OpsTaskAuthorization鱼玄机任务级授权自动化修复报告-v0.01.md`
- v0.13 角色卡备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.13-rolecard-20260723T183439+0800`
- approvals 备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.13-task-automation-20260723T183509+0800`
