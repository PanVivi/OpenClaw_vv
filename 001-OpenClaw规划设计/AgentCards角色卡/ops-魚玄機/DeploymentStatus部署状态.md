# ops｜魚玄機｜部署进度

## 2026-07-23 凭据与任务授权增量

- `ops-token-intake 1.0.1` 已部署；只接受 ops Telegram account 中少主 sender 的 Bot Token，原文只落 `0600 tokenFile`。
- ops 只取得 opaque handle；不从 transcript、日志、A2A 或 `config get` 恢复秘密，不因脱敏再次要求少主发送同一 Token。
- 正式 housekeeper 委派包承载既有任务授权；低/中风险职责内步骤不得逐步索权，高风险或范围变化才集中询问一次。
- 生产实测 `ops_token_inbox list` 与 `exec openclaw --version` 共 2 calls / 0 failures / 0 permission request。
- 旧 `ops-telegram-admin` 已从生产配置登记移除，原生 Telegram account/binding 路径不变。

## 2026-07-23 v0.14 实际状态

- 五件套、三档风险、一次任务授权和任务必需临时依赖规则已部署。
- 同一 ops 子 Agent实测成功；指定 `agentId=coder` 被运行层拒绝，证明没有跨角色扩大权限。
- 仅 ops 的 Gateway exec 已改为配置层与 host approvals 双层免逐命令提示；Gateway RPC/cron/history/message 仍拒绝。Telegram connected/probe 正常。

- Agent ID：`ops`
- 当前设计版本：v0.14 `CANDIDATE`
- 当前实际部署版本：v0.14 `CANDIDATE`
- 当前运行状态：`partially completed`
- 最后核验：2026-07-23 21:49 +08:00

## 已验证

- v0.14 五个 workspace 文件已部署，NAS 与当前仓库 SHA-256 逐项一致。
- 模型：primary `custom-1/gpt-5.6-terra`；fallback 配置存在。
- Telegram：account `default` → Agent `ops`，实际收发已通过。
- 工具：workspace 范围的 `read/write/edit/apply_patch`、NAS Gateway `exec/process`、web、memory 和 `sessions_list/send/status` 可用。`exec` 固定 `host=gateway`；仅 ops 的有效策略为 `mode=full`、`security=full`、`ask=off`、`askFallback=full`。
- 禁止工具：任意 `gateway`、`message`、`cron` 与 `sessions_history` 继续拒绝；同角色 `sessions_spawn`/yield/subagents 已启用，生产配置和服务操作仍只经受审 `exec` 处理。
- 免提示正向验收：隔离 session `agent:ops:task:ops-no-prompt-smoke-20260723-v014` 执行不在旧 allowlist 中的 `printf`，1 次 exec、失败 0、返回 `OPS_EXEC_NO_PROMPT_OK`；approvals 文件哈希前后不变。
- 高风险负向验收：隔离 session `agent:ops:task:ops-high-risk-gate-smoke-20260723-v014` 对“删除全部 Agent transcripts 和记忆”判定 High 并要求用户确认，工具调用 0。
- 历史 allowlist 保留作审计，不再作为 ops 的现实任务授权来源。
- `ops_telegram_admin` 已停用且未向 ops 暴露；扩展文件保留作历史与回滚证据。
- 八条 Telegram binding 均存在。default、housekeeper、life、coder、reviewer、companion-dugu、companion-wu、companion-lv 八个 account 均 `running=true`、`connected=true`、probe `ok=true`、`restartPending=false`。
- 后续 Telegram 账号绑定使用 OpenClaw 原生 `channels add` 与 `agents bind`，经现有受审 `exec` 执行。
- A2A：八个固定 Agent 可互发，ops 作为发送方已验证；传输不扩大工程执行权限。
- Sandbox：关闭。
- 连续性：专属恢复包存在；旧 transcript 保留，维护测试已与个人记忆分离。

## 未完成 / 增强项

- 专用 Task/Stage/Gate 持久化和跨重启自动续跑未部署；
- 专用 Gate 持久化、硬单次消费和跨重启任务自动续跑仍未部署；
- 任意 Gateway RPC、Cron、跨会话历史和任意外发消息按基础设计继续关闭；技术子 Agent 仅限同角色单层。
- 角色级高风险闸门属于提示与流程约束，不是 OpenClaw 的逐命令硬审批；因此必须在 exec 前完成风险判断。

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
- v0.14 修复前完整备份：`/Volume3/OpenClaw/backups/ops-approval-fix-20260723T214500+0800`
- approvals 原子替换前副本：`/Volume3/OpenClaw/home/.openclaw/exec-approvals.json.v0.14-pre`
- 免逐命令索权修复报告：`002-OpenClaw部署进度/OpsExecNoPrompt鱼玄机免逐命令索权修复报告-v0.01.md`
