# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.20

## v0.20 增量

- 已核实魚玄機“频繁申请权限”同时来自宿主逐命令审批与角色卡依赖规则冲突，不是单纯口头习惯。
- 仅 ops 的 `exec` 已从 `mode=auto` 改为 `mode=full`；Gateway host approvals 的 `agents.ops` 已改为 `full/off/full`。其他 Agent 未改。
- 魚玄機角色卡已无损升为 v0.14：低/中风险继续自动闭环；任务必需、官方固定版本、可校验、无费用、非系统级且可删除的临时工具自动处理；高风险仍在副作用前集中询问一次。
- 低风险真实 exec 验收通过，未产生新 approval；高风险负向验收未调用工具。
- 原 Telegram session、binding、transcript 和记忆未改；八个 Telegram account 运行、连接与 probe 全部正常。
- 详细证据见《OpsExecNoPrompt 魚玄機免逐命令索权修复报告 v0.01》。

- 现场核验：2026-07-23 21:49 +08:00
- 本轮分支：`agent/lossless-content-update`
- 现场版本：OpenClaw `2026.7.1-2`（`0790d9f`）

## v0.19 历史增量

- 武曌 Telegram Token 故障已修复；八个 account 均运行、连接和 probe 正常。
- 已确认顶层设计文档发生真实缩减，恢复 FinalDesign v1.02 原文并建立完整 v1.08；其他核心文档以完整早期版本为底稿升版。
- 共同协议升 v0.05，统一低/中/高风险：明确任务只授权一次，低中风险内部闭环，高风险才集中询问。
- 八套角色卡已先归档再升版，补入同角色隔离子 Agent和主会话非阻塞规则，不改人格、不开放全局历史。
- 生产配置、角色文件和实测状态以《全员子 Agent 非阻塞部署报告 v0.01》最终勾选为准。
- GitHub 无 `mina` 分支；目标为同步 `agent/lossless-content-update` 并可快进同步 `main`。

- 现场核验：2026-07-23 18:37 +08:00
- 本轮分支：`agent/lossless-content-update`
- 现场版本：OpenClaw `2026.7.1-2`（`0790d9f`），Gateway Node `v22.22.3`

## 当前真实状态

- system-level `openclaw.service` 为 `active/running`，PID `1716722`，本次启动时间 18:16:07，`NRestarts=0`。
- 八个 Agent、独立 workspace 和基础五文件均存在。
- 当前设计版本：賈南風 v1.11、蕭觀音 v0.08、魚玄機 v0.14、步非煙 v0.08、夏姬 v0.06、三位 companion v0.05。
- NAS 实际角色卡：賈南風 v1.11、蕭觀音 v0.08、魚玄機 v0.14、步非煙 v0.08、夏姬 v0.06、三位 companion v0.05。
- 八个 Telegram account 和八条 account-scoped binding 均存在。
- 八个 account 均 `running=true`、`connected=true`、probe `ok=true`、`restartPending=false`。

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
- 魚玄機具有 workspace 写入和 Gateway `exec/process`；标准任务使用任务级授权，仅 ops 免逐命令审批，现实副作用仍由风险分级、备份、回滚和 Test 约束。
- A2A：`enabled=true`，allowlist 包含全部八个 Agent；`tools.sessions.visibility=all`；`sessions_history` 仍拒绝。
- Sandbox：仅 coder 为 `mode=all`；其他七个 Agent 为 `off`。
- CodexResetWatcher：life 所有，每 30 分钟运行。

## 已知项

- 八个 Telegram Bot 当前均已配置并通过 probe。
- 已禁用插件仍保留历史 config，`config validate` 返回一条 warning，但配置有效、插件未加载。
- 魚玄機以外的若干新角色卡版本仍待后续按无损更新任务部署；本轮未扩大范围。
- 专用 Task/Stage/Gate 持久化和跨重启自动续跑仍属于增强项。

## 证据

- 任务级自动化报告：`002-OpenClaw部署进度/OpsTaskAuthorization鱼玄机任务级授权自动化修复报告-v0.01.md`
- v0.12 角色卡备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.12-rolecard-20260723T183439+0800`
- approvals 备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.12-task-automation-20260723T183509+0800`
- 正向验收 session：`agent:ops:task:ops-task-auth-smoke-20260723-01`
