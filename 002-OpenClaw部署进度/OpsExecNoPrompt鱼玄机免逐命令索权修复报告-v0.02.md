# 魚玄機免逐命令索权修复报告 v0.02

- 核验时间：2026-07-23 22:30—22:36 +08:00
- 现场版本：OpenClaw `2026.7.1-2`（`0790d9f`）
- 修复对象：`ops` / 魚玄機的现用 Telegram 长会话
- 结果：已修复并在原生产会话通过免审批回归

## 为什么 v0.01 没有真正解决

v0.01 已将磁盘配置改为：

- `agents.list.ops.tools.exec.mode=full`
- host approvals：`security=full`、`ask=off`、`askFallback=full`

但当时只在新建隔离 session 做了验证，并错误地把配置命令返回视为 Gateway 已热加载。魚玄機随后在原 Telegram 长会话重试头像任务，transcript 明确出现：

- `Exec auto-review allowed once`
- `Exec auto-review deferred to human approval`

这证明仍在服务 Telegram 的旧 Gateway 进程继续使用修改前的 `mode=auto`。问题不是角色卡拒绝执行，也不是聊天记忆损坏，而是运行进程没有加载新策略。

## 本次修复

1. 备份原 `sessions.json` 与現用 transcript：
   `/Volume3/OpenClaw/backups/ops-session-exec-override-20260723T223044+0800`
2. 核实生产 session key 仍为 `agent:ops:telegram:direct:811150402`，session ID 仍为 `9e2bd75a-4712-46b0-b5ba-8756ee1fa2e9`。
3. 核实 session 清单不存在更严格的 `execSecurity` / `execAsk` 会话覆盖。
4. 核实磁盘配置与 host approvals 均为 `full/off`。
5. `openclaw config validate` 通过后受控重启 `openclaw.service`，使 Gateway 载入新策略。
6. 未重建、截断或替换 session/transcript，聊天记录和记忆保持原位。

## 真实生产会话验收

重启后的 Gateway：

- 新 PID：`1851468`
- `openclaw gateway status`：runtime running、connectivity probe ok
- 八个 Telegram account：`running=true`、`probe.ok=true`、`lastError=null`

在原 Telegram session key 和原 session ID 中，通过 Gateway 要求魚玄機调用 `exec` 执行不在历史 allowlist 中的只读 `stat`：

- 返回：`OPS_REAL_TELEGRAM_FULL_OK`
- tool calls：1
- failures：0
- transcript 未出现 `auto-review` 或 approval
- `exec-approvals.json` SHA-256 前后均为
  `1fd3a45174d187b055a28932810a07382445119ea01aaa22b88e19bf5472f01b`

审批文件无新增记录，证明这次是原生产 Telegram 长会话实际免逐命令索权，不是隔离测试替代生产验收。

## 后续验收规则

涉及 Telegram Agent 的运行配置修复，必须同时满足：

1. 磁盘配置正确；
2. Gateway 已确认加载新配置，必要时进行一次受控重载；
3. 原生产 session key 与原 session ID 不变；
4. 在原生产会话执行正向测试；
5. transcript 无目标故障标志，审批/配置文件无意外变化；
6. 所有 Telegram account 探针通过。

仅新建隔离 session 通过，不得再宣称 Telegram 生产问题已修复。

## 官方依据

- OpenClaw Exec Approvals：<https://docs.openclaw.ai/tools/exec-approvals>
- OpenClaw Exec：<https://docs.openclaw.ai/tools/exec>

`mode=full` 只取消宿主逐命令审批。任务授权、角色风险分级、备份、回滚与高风险集中确认仍然有效。
