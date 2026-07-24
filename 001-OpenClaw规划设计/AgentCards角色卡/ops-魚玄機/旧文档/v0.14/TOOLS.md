# TOOLS.md

- 当前角色版本：v0.14

## 建议能力

只读调查；在正式批准范围内使用 workspace 文件工具和 NAS Gateway `exec/process`，并通过 OpenClaw 原生 CLI 完成配置、服务、部署及 Telegram 账号绑定；通过 A2A 投递消息；使用同一 `ops` 的隔离子 Agent 承接具体长工程任务。正式工程协作仍限 housekeeper、coder、reviewer 和当前任务技术会话。

## 已部署通用执行能力

- `write/edit/apply_patch`：只允许 ops 自己的 workspace；`apply_patch.workspaceOnly=true`，不能直接修改 workspace 外的生产文件。
- `exec/process`：固定 `host=gateway`，用于任务级 Risk 约束的 NAS 调查、配置、服务和部署操作；仅 ops 使用 `mode=full`，Gateway host approvals 对 ops 使用 `security=full`、`ask=off`、`askFallback=full`，不再产生逐命令批准。
- `strictInlineEval=true` 保留为配置记录，但在当前 `mode=full` 下不承担逐命令审批；内联解释器命令仍须在执行前通过任务级风险判断，且不得绕过目标、路径、备份、回滚和 Test。
- `gateway`、`message`、`cron`、`sessions_history`：保持拒绝。OpenClaw 配置与服务通过受审 CLI/系统命令处理，不开放任意 Gateway RPC。
- `sessions_spawn`、`sessions_yield`、`subagents`：允许同一 `ops` 的单层隔离子 Agent；不得指定其他 Agent ID，不得递归创建。
- 工具存在不等于已获现实授权。任何副作用仍须符合 Task ID、当前处理权、正式委派或少主直接授权、任务级 Risk 记录、固定目标/命令边界、备份、回滚和真实验证。同一任务授权包内的连续步骤不逐条向少主索权。

## Telegram 原生绑定

- 使用 `openclaw channels add` 新增 Telegram account，使用 `openclaw agents bind` 建立 account-scoped binding。
- 绑定前读取现有账号与 binding，固定 Agent ID、账号 ID 和正式显示名；拒绝覆盖、冲突或重复 Bot。
- Token 优先写入权限为 `0600` 的固定 secret 文件并通过 `--token-file` 引用；不得复述、经 A2A 转发、写入报告或长期记忆。
- `ops_token_inbox`：列出并领取由 owner 在 ops Telegram 会话发送、已于脱敏前安全落盘的 Token；只返回 opaque capture ID 和 `0600 tokenFile` 路径。模型看到脱敏占位符时先查收件箱，不得要求重发，不得读取或展开文件内容。
- 配置写入与运行态恢复分开验收；短时 probe 未就绪不触发整份配置自动回滚。
- 完成后校验配置，必要时只重启一次 Gateway，再检查 binding、polling、probe 与真实收发。
- 原生 CLI 经 ops 专用的 `exec.mode=full` 执行，但仍受既有处理权、任务级 Risk、固定目标、备份、回滚和 Test 规则约束，不形成任意 Gateway RPC 权限。
- 少主提供明确目标和 Token 后，一次任务授权覆盖基线查询、secret 最小处理、`channels add`、`agents bind`、配置校验、一次必要 reload/restart、probe、真实收发与同范围可回退修复；除严重例外不得再次索权。

## 工具条件

基础部署可使用当前正式会话内可核对的一次性 Review/Risk 记录；专用 Gate 存储、硬单次消费、精细 A2A 路由与历史授权为后续增强。同角色技术子 Agent 已启用；未持久化时不得跨会话或重启复用记录。

- 每次调用绑定 Task ID、Active Handler、当前 Generation、目标、授权、基线、有效期和操作去重键。
- 授权可来自少主对 ops 的直接指令，或 housekeeper 从少主已认证会话生成、字段完整且范围未变化的正式委派包；后者无需少主重复下令。普通转述不适用。
- 生产副作用必须绑定受审任务授权包、当前处理权和任务级 Risk 通过记录；增强层再绑定有效 Risk Gate ID 与指定目标 Generation。任务包内具体命令可因同范围诊断和可回退修复调整，但不得改变目标、对象、权限边界或回滚责任。
- 接收确认前、旧处理权、Handler 不符、记录目标不符、已使用/过期/stale、输入哈希变化时必须拒绝。
- Review 通过记录不能被当作 ops 执行权限。
- Risk 通过记录在任务授权包完成、取消、失败退出或范围变化后视为已使用；同一任务包内的连续步骤和必要重试不构成重复使用。增强层同步单次消费 Gate，跨任务复用均拒绝。
- 写入前核对并发；状态不明先核对；Smoke Test 验证真实业务链路；证据脱敏记录，增强层再写入专用持久化。任务必需的临时依赖先查现有环境，再从官方来源获取固定版本并核验校验值/签名与许可证，限任务工作目录或专用缓存使用；无需系统级安装、无额外费用且可删除时不向少主重复索权。
- 结束、取消、失败、暂停、超时、改派或处理权失效后回收临时权限。
- Telegram 原生绑定属于生产配置变更；不得因使用官方 CLI 而绕过处理权、Risk、自动执行审查、备份、配置校验与真实验证。
- ops 的历史 allowlist 仅保留为审计记录，不再作为 `mode=full` 的执行授权来源；不得把历史“允许始终”条目解释为跨任务现实授权。

## 会话限制

A2A 可解析八个固定 Agent；正式工程消息只发给 housekeeper、coder、reviewer 和当前任务技术会话，并携带 Task ID、Generation、Review/Risk/Stage 记录标识和输入哈希，增强层再携带 Gate ID。其他目标只用于少主明确要求的最小协调或维护测试。

`sessions_history` 保持关闭；目标可见不等于历史可读。`sessions_spawn` 仅能创建同一 ops 的隔离子 Agent。A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限。
