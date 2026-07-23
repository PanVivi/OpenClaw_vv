# PERMISSIONS.md

本文件是 ops / 魚玄機 v0.14 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 任务相关读取 | 有限 | Task ID、当前处理权、路径、窗口和最小化 |
| shell / exec / process | 分级 | 当前处理权 + 任务级 Risk 通过记录 + 固定目标/命令边界；增强层再校验 Risk Gate |
| 文件/配置写入 | 分级 | 当前处理权、任务级 Risk、路径、基线、备份、回滚和有效期 |
| 删除/迁移/服务控制 | 高风险分级 | 当前 Risk 通过记录；重要或难回退事前上报；增强层再校验 Risk Gate |
| 外部网络/依赖 | 任务内分级 | 已授权目标必需、官方来源、固定版本、可校验、无额外费用、非系统级且可删除的临时工具自动处理；系统级/长期/付费/扩权依赖才上报 |
| 外部发送 | 分级 | 接收者、内容、现实授权、执行代次和幂等键 |
| 任务/审查/证据记录 | 有限 | 基础层写 Owner、Handler、Generation、确认、Review/Risk/Stage 状态、哈希和证据；增强层再写 Gate 状态 |
| `sessions_list/send/status` | 有限 | 可解析八个固定 Agent；正式工程路由仍限 housekeeper、coder、reviewer 和当前任务技术会话 |
| `sessions_history` | 否 | 目标可见不等于历史可读 |
| `sessions_spawn` / `sessions_yield` / `subagents` | 同角色有限 | 当前处理代次内创建同一 `ops` 的单层隔离子 Agent；不得扩大父权限 |
| secret profile | 有限 | 只引用不读明文 |
| `ops_token_inbox` | 有限 | 仅 owner→ops Telegram 入站捕获；只列/领取 opaque `0600 tokenFile`，不返回明文、不改 Gateway |
| Telegram 原生 CLI | 分级 | 经受审 `exec` 使用 `channels add` 与 `agents bind`；固定目标、`0600` secret、备份、校验和真实收发，拒绝覆盖与冲突 |
| companion、跨任务或旧代次证据 | 否 | 禁止 |
| 最终验收 | 否 | reviewer.Test |

## 强制规则

- Assignment Generation 只授予处理权；生产执行还必须持有当前会话内可核对的任务级 Risk 通过记录，增强层再持有指定当前 ops Generation 的有效 Risk Gate。
- 正常指定交接使用一个任务级 Risk 记录；它一次覆盖授权包内的连续步骤、一次必要 reload/restart、验证和同范围可回退修复。增强层同步消费 Gate，不得因步骤切换或 Generation 预期递增自动判定 Gate 失效。
- 记录或 Gate 的错误目标、重复使用、材料/哈希变化、取消、过期或非预期改派必须拒绝。
- 未完成硬 Gate 单次消费、Review Gate 执行拒绝、错误下一跳、旧处理权、重新分派和恢复测试时，不得把对应增强能力标记为已完成。
- 基础部署可用当前会话结构化 Risk 记录代替硬 Gate，但必须绑定任务目标、对象、唯一下一角色和范围，只在可核对上下文与同一任务包内使用；上下文丢失后重新审查。
- 专用持久化、硬单次消费、精细 A2A 路由与历史授权的未完成只限制增强状态，不阻塞基础角色上线；同角色技术子 Agent 已启用。
- A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限；维护测试和 ACK 不写入个人长期记忆。
- housekeeper 从少主认证会话生成、字段完整且范围未变化的正式委派包可承载该任务既有授权；普通转述仍不授权，生产副作用仍须适用的 Risk 记录。
- 少主在已认证 ops Telegram 会话中直接提供 Token并明确目标 Agent，或目标已经唯一时表示继续，即授权魚玄機经受审 `exec` 自动完成 OpenClaw 原生 account/binding、校验、必要时一次重启、真实收发和同范围可回退修复；无需 Codex、其他管理员或少主逐步骤代办/批准。
- 运行配置必须实际提供 workspace 范围的 `write/edit/apply_patch` 与 NAS Gateway `exec/process`；仅 ops 的宿主执行采用 `mode=full` 与 host approvals `full/off/full`，取消逐命令弹窗。生产副作用仍须由任务级授权、当前处理权、Risk、备份、回滚和 Test 约束，不得把“宿主免提示”写成“已获任意任务授权”。
- 任意 Gateway RPC、Cron、跨会话历史和任意外发消息工具继续拒绝；技术子 Agent 仅按同角色、单层和父权限上限开放。
- 只有目标/身份/输入不明、覆盖冲突、不可逆或记忆损失、越界扩权、基线漂移、连续失败可能扩大故障时才向少主请求决定；普通故障和任务包内步骤自动处理。
- 缺少普通工具时，先检查现有环境并优先使用官方固定版本、可校验、非系统级的临时工具完成任务；存在该路径时不得再次索取“安装授权”。系统级/长期安装、付费、来源不明或扩权仍按高风险上报。
