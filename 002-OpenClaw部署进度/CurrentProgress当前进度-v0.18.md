# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.18

- 现场核验：2026-07-23 18:37 +08:00
- 本轮分支：`agent/lossless-content-update`
- 现场版本：OpenClaw `2026.7.1-2`（`0790d9f`），Gateway Node `v22.22.3`

## 当前真实状态

- system-level `openclaw.service` 为 `active/running`，PID `1716722`，本次启动时间 18:16:07，`NRestarts=0`。
- 八个 Agent、独立 workspace 和基础五文件均存在。
- 当前设计版本：賈南風 v1.10、蕭觀音 v0.07、魚玄機 v0.12、步非煙 v0.07、夏姬 v0.05、三位 companion v0.04。
- NAS 实际角色卡：賈南風 v1.10、蕭觀音 v0.07、魚玄機 v0.12、步非煙 v0.06、夏姬 v0.04、三位 companion v0.03。
- 八个 Telegram account 和八条 account-scoped binding 均存在。
- default、housekeeper、life、coder、reviewer、companion-dugu、companion-lv 七个 account 均 `running=true`、`connected=true`、probe `ok=true`、`restartPending=false`。
- companion-wu 当前 `running=false`、`connected=false`、`restartPending=true`，probe HTTP 404，`deleteWebhook` 返回 `Not Found`；需新的有效 Token。

## 本轮修复

1. 魚玄機五个 workspace 文件升级并实际部署为 v0.12，NAS 与仓库 SHA-256 逐项一致。
2. 标准、可回退运维采用一个任务一个授权包；包内核对、备份、最小写入、校验、一次必要 reload/restart、验证和同范围修复不再逐步骤向少主索权。
3. 内部 Review/Risk 由工程链处理；只在身份/目标不明、覆盖冲突、不可逆或记忆损失、范围扩大、基线漂移、连续失败可能扩大故障时暂停上报。
4. 删除一个仅按 `openclaw.mjs` 路径匹配的宽 `allow-always` 条目，增加 16 条带 `argPattern` 的精确规则。
5. `openclaw config validate` 通过；Gateway 无需重启，PID 与 `NRestarts` 未变化。

## 验收

- Task `OPS-TASK-AUTH-SMOKE-20260723-01` 中，魚玄機连续完成 Telegram 状态查询、workspace 写入、回读和汇总。
- `exec/write/read` 共三次工具调用、失败数 0、均无 approval 文本，也未向少主重复请求授权。
- 测试文件已精确删除。
- approvals：`broad_mjs=0`、`precise_v012=16`。

## 当前运行能力

- `life-automation` 1.0.0、`housekeeper-async-dispatch` 1.0.0 已加载。
- `ops-telegram-admin` 1.0.0 已停用，扩展文件保留但未激活、未暴露工具。
- 魚玄機具有 workspace 写入和受审 Gateway `exec/process`；标准任务使用任务级授权，OpenClaw CLI 只允许精确参数形状。
- A2A：`enabled=true`，allowlist 包含全部八个 Agent；`tools.sessions.visibility=all`；`sessions_history` 仍拒绝。
- Sandbox：仅 coder 为 `mode=all`；其他七个 Agent 为 `off`。
- CodexResetWatcher：life 所有，每 30 分钟运行。

## 已知项

- companion-wu 缺少有效 Token；在新 Token 到位前不得声明八 Bot 全量上线。
- 已禁用插件仍保留历史 config，`config validate` 返回一条 warning，但配置有效、插件未加载。
- 魚玄機以外的若干新角色卡版本仍待后续按无损更新任务部署；本轮未扩大范围。
- 专用 Task/Stage/Gate 持久化和跨重启自动续跑仍属于增强项。

## 证据

- 任务级自动化报告：`002-OpenClaw部署进度/OpsTaskAuthorization鱼玄机任务级授权自动化修复报告-v0.01.md`
- v0.12 角色卡备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.12-rolecard-20260723T183439+0800`
- approvals 备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.12-task-automation-20260723T183509+0800`
- 正向验收 session：`agent:ops:task:ops-task-auth-smoke-20260723-01`
