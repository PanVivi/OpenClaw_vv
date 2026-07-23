# 魚玄機任务级授权自动化修复报告 v0.01

- 日期：2026-07-23
- 现场版本：OpenClaw 2026.7.1-2（0790d9f），Gateway Node v22.22.3
- 范围：仅修复 ops / 魚玄機在一个明确运维任务内反复索要权限的问题；不改变人物属性、其他 Agent 权限、Telegram routing、session、transcript 或 memory

## 结论

已修复并部署。魚玄機 v0.12 采用一个任务一个授权包：少主直接下达目标明确的任务，或 housekeeper 提交字段完整且范围未变化的正式委派包后，授权一次覆盖完成目标所必需、可合理预见且可回退的核对、备份、最小写入、校验、一次必要 reload/restart、Smoke Test 和同范围故障修复。内部 Review/Risk 不再逐步骤转嫁给少主。

只有以下严重例外暂停上报：

- 目标、身份、授权来源或必要输入无法确定；
- 将覆盖不同的既有账号、绑定、配置或数据；
- 需要删除、破坏聊天记忆、执行不可逆操作或无法可靠回滚；
- 需要扩大到未授权的 Agent、服务、外部接收者、凭据或目标范围；
- 基线漂移，或自动修复连续失败且继续操作可能扩大故障。

## 官方依据

- `tools.exec.mode=auto` 对 allowlist 命中直接执行，miss 才进入原生自动审查并可能回退人工；自动审查仍是逐次执行决策，不等于任务级业务授权：<https://docs.openclaw.ai/tools/exec>
- host exec 的有效策略是 OpenClaw 请求策略与宿主 approvals 的交集；`ask=on-miss` 会在 allowlist miss 时请求批准：<https://docs.openclaw.ai/tools/exec-approvals>
- 官方支持对 allowlist 条目增加 `argPattern`，按可执行文件和参数形状共同限制；仅按路径放行会信任该路径下的全部参数：<https://docs.openclaw.ai/tools/exec-approvals#restricting-arguments-with-argpattern>
- OpenClaw 推荐 `auto` 作为需要宿主执行能力的默认平衡模式：<https://docs.openclaw.ai/tools/permission-modes>

## 根因

### 角色卡

v0.11 同时存在两组相互冲突的规则：

1. 少主提供 Token、目标并确认后即构成 Telegram 绑定授权；
2. 每项生产副作用仍要求一次性 Risk、命令哈希和阶段确认。

模型因此可能把同一绑定任务的 account 写入、binding、probe、重启和修复理解为多项独立授权。

### 运行层

ops 使用 `mode=auto + allowlist/on-miss`。本次绑定 transcript 在 18:06—18:24 期间共记录 31 次 `exec` 结果，其中出现一次明确的 `deferred to human approval`。随后 approval 流程留下一个只按 `openclaw.mjs` 路径匹配的 `allow-always` 条目；它减少了询问，却会覆盖所有 OpenClaw CLI 子命令，权限范围过宽。

## 实际变更

1. 魚玄機五个 workspace 文件升级并部署为 v0.12：
   - `AGENTS.md`
   - `SOUL.md`
   - `IDENTITY.md`
   - `USER.md`
   - `TOOLS.md`
2. 将标准、可回退运维改为任务级授权；同一任务包内不逐步骤索权。
3. 保留当前处理权、任务级 Risk、备份、回滚、真实测试、取消和严重例外门控。
4. 删除 ops approvals 中一个仅按 `openclaw.mjs` 路径匹配的宽条目。
5. 增加 16 条带 `argPattern` 的精确规则，只覆盖：
   - OpenClaw 版本查询；
   - Telegram account 状态/probe；
   - 八 Agent binding 查询；
   - 八固定 account 的 Telegram account 新增/同目标凭据更新；
   - 八条固定 agent/account binding；
   - 配置校验；
   - 一次必要 Gateway restart。
6. 未打开任意 `gateway`、`message`、`cron`、`sessions_history` 或 `sessions_spawn`。

## 备份

- 角色卡备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.12-rolecard-20260723T183439+0800`
- approvals 备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-v0.12-task-automation-20260723T183509+0800`

## 验收

### 文件与配置

- NAS 五文件 SHA-256 与仓库逐项一致。
- `openclaw config validate` 通过；只保留已知的“已禁用插件仍有历史配置”warning。
- approvals 核对：`broad_mjs=0`、`precise_v012=16`。
- Gateway 未因本轮角色卡/approval 修改重启，服务保持 `active/running`、PID `1716722`、`NRestarts=0`。

### 任务级正向测试

Task `OPS-TASK-AUTH-SMOKE-20260723-01` 由少主当前维护任务直接授权，魚玄機在同一轮连续完成：

1. `openclaw channels status --channel telegram --probe --json`；
2. workspace 写入固定测试文件；
3. 回读并核对 `OPS_TASK_AUTH_OK`；
4. 汇总真实结果。

结果：

- `toolSummary.calls=3`，工具为 `exec/write/read`，失败数 `0`；
- 三个 tool result 均不含 approval 文本；
- 魚玄機明确报告“未请求额外授权”；
- 测试文件已按回滚计划精确删除。

## 同步发现的现场状态

18:37 的 Telegram probe 显示：

- default、housekeeper、life、coder、reviewer、companion-dugu、companion-lv 七个 account 均 `running=true`、`connected=true`、probe `ok=true`；
- companion-wu 为 `running=false`、`connected=false`、`restartPending=true`，probe HTTP 404，`deleteWebhook` 返回 `Not Found`。

该异常需要新的有效 Bot Token，属于“必要输入缺失”的严重例外。本轮没有猜测 Token、覆盖配置或扩大范围；取得有效 Token 后，魚玄機应按 v0.12 在一个任务授权包内自动完成更新、校验、必要重载和复验，不再逐步骤询问。

## 回滚

只需恢复上述两个备份中的 ops 五文件和 `exec-approvals.json`，然后校验配置与 effective exec policy。不得回滚或覆盖 `sessions/`、transcript、memory、Telegram routing 或其他 Agent workspace。
