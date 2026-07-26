# 002 OpenClaw架设部署｜权限、委派、主动上报与凭据连续性报告｜v0.01

核验时间：2026-07-23 23:42 +08:00  
生产版本：OpenClaw `2026.7.1-2 (0790d9f)`，Gateway Node `v22.22.3`  
工作分支：`agent/lossless-content-update`

## 1. 范围与结论

本轮只处理四个已发生问题：

1. 少主已向賈南風或责任 Agent 下达明确任务后，执行 Agent仍把正常步骤解释成需要再次授权；
2. 具体长任务占用主会话或 A2A 委派阻塞后续消息；
3. 下游停止、超时或 blocked 时，賈南風没有主动上报；
4. Telegram Bot Token 在模型、日志或配置回显脱敏后丢失，导致任务反复。

没有改变八角色身份、人格、职责、Telegram binding、既有 session/transcript、个人记忆或 A2A 历史隔离。生产修复已经部署并通过职责内工具和真实 A2A 验收。

## 2. 资料依据

判断优先级为：本机安装版本源码与生产实测 > OpenClaw 官方文档 > OpenClaw GitHub issue / 社群讨论。

官方资料：

- Subagents：`sessions_spawn` 非阻塞返回 `runId`，完成结果由 announce 回送，不应靠主会话 sleep 或轮询：<https://docs.openclaw.ai/tools/subagents>
- Gateway 工具配置：A2A allowlist 与 sessions visibility 是通信能力，不等于读取全部历史：<https://docs.openclaw.ai/gateway/config-tools>
- Tasks / automation：持久任务应使用调度能力，而不是占住聊天轮次：<https://docs.openclaw.ai/automation/tasks>
- 2026.7.1 发布说明：包含投递失败和 subagent 跟踪修复：<https://docs.openclaw.ai/releases/2026.7.1>
- Workspace 与敏感信息：凭据不应写入角色 workspace：<https://docs.openclaw.ai/agent-workspace>
- Gateway Security：Telegram 支持普通文件形式的 `tokenFile`，文件须为安全权限且不能依赖不安全链接：<https://docs.openclaw.ai/gateway/security>
- Logging：`logging.redactSensitive` 会在日志、transcript 和 UI 工具事件前脱敏；关闭后仍有基础安全脱敏，因此不能从 transcript 或 `config get` 反推 Token：<https://docs.openclaw.ai/logging>
- Plugin hooks：`message_received` 可在模型处理前观察原始入站消息；自定义工具可把受限能力只暴露给指定 Agent：<https://docs.openclaw.ai/plugins/hooks>、<https://docs.openclaw.ai/plugins/tool-plugins>
- Telegram 原生多账号和 `tokenFile`：<https://github.com/openclaw/openclaw/blob/main/docs/channels/telegram.md>

GitHub / 社群交叉核对：

- 多 Bot account/binding 已是原生能力，不需要自制绑定层：<https://github.com/openclaw/openclaw/issues/58243>
- 社群 A2A 故障排查显示 `allowAgents`、工具 profile 和方向性必须分别实测：<https://github.com/openclaw/openclaw/issues/47862>
- 旧版 `allowAgents` 和跨角色 spawn 均有过边界问题，因此当前保持“跨角色 A2A、同角色 spawn”：<https://github.com/openclaw/openclaw/issues/29727>、<https://github.com/openclaw/openclaw/issues/40825>
- 脱敏占位符回写曾导致配置损坏，进一步证明不应把回显值当作真实密钥：<https://github.com/openclaw/openclaw/issues/11268>

## 3. 根因

### 3.1 重复索权

原设计已经规定“一次任务级授权”和低/中/高风险分级，但历史故障发生时存在两层不一致：

- 角色卡把 housekeeper 正式委派误当普通转述；
- 运行层工具或 host approval 没有与 ops 的任务级授权对齐。

当前做法不扩大权限：少主直接指令，或字段完整且不改变范围的 housekeeper 正式委派包，均承载同一份任务授权。低风险自动执行；中风险在 Agent 内部完成 Risk、备份、回滚和 Test；只有高风险、范围变化、授权来源不明或缺少真实必要输入时才询问一次。

### 3.2 主会话阻塞和漏报

`sessions_send` 若等待下游完成，会占住賈南風当前轮次；即使改成异步，如果没有持久 deadline，任务停住后仍只能等少主主动追问。

修复后：

- 賈南風跨角色 `sessions_send` 统一改为立即返回；
- 任务按 Task ID、目标、来源会话、首次回报期限和状态落盘；
- 默认首次回报期限 10 分钟；
- 下游 A2A 回报自动更新 waiting / progress / completed / blocked / cancelled；
- 到期未回报时由同角色 housekeeper 子 Agent主动向原 Telegram 会话报告；
- 状态写入使用跨插件实例文件锁和唯一临时文件；写入异常 fail-open，监控故障不能阻断实际委派。

### 3.3 Token 丢失

这是 OpenClaw 的预期安全脱敏与旧工作流冲突，不是“模型忘记”：

- transcript、日志、工具事件和 `config get` 不是秘密恢复源；
- 把 Token 交给模型后再让模型复制、A2A 转发或写 shell，可能得到省略号或占位符；
- 关闭全局脱敏既不可靠，也扩大泄密风险。

修复后由 `ops-token-intake` 在 Telegram 入站、模型处理前只捕获符合 Bot Token 结构的值：

- 仅接受 `default/ops` Telegram account 和少主 ID `811150402`；
- 原文只写入 `$HOME/.openclaw/secrets/telegram-inbox/<uuid>.token`；
- 目录 `0700`，Token 文件 `0600`；
- 索引不保存 Token，只保存 opaque handle、时间和非秘密元数据；
- 魚玄機只能 `list / claim / discard`，`claim` 只返回 `tokenFile` 路径；
- 实际 account/binding 继续使用 OpenClaw 原生命令，不恢复旧的自制管理插件；
- 相同 Token 去重；状态写入有文件锁和唯一临时文件。

## 4. 生产权限矩阵

| Agent | 当前职责内直接能力 | 明确不授予 |
| --- | --- | --- |
| housekeeper / 賈南風 | read、memory、A2A sessions、同角色规划子 Agent、任务监控 | shell、项目写入、删除、服务控制、凭据读取 |
| ops / 魚玄機 | read/write/edit/apply_patch、exec/process、web、memory、A2A、同角色技术子 Agent、Token opaque inbox | 任意聊天历史、任意外发、无范围高危变更 |
| coder / 步非煙 | sandbox 内 read/write/edit/apply_patch、exec/process、A2A、同角色技术子 Agent | Gateway 管理、任意外发、其他 Agent历史 |
| reviewer / 夏姬 | read、A2A、同角色只读子 Agent | 写入、shell、生产执行 |
| life / 蕭觀音 | web、message、A2A、同角色子 Agent、`life_automation` | shell、工程写入、Gateway 管理 |
| companions | 对话、创作、整理、同角色非工程子 Agent | shell、工程文件、凭据、生产写入 |

八个 Agent 之间主动双向 A2A 已启用；每个 Agent 的 `subagents.allowAgents` 仍只允许自身 ID。这样既能调度，也不会用跨角色 spawn 绕过角色边界。

## 5. 已部署内容

- `housekeeper-async-dispatch`：`1.2.2`
- `ops-token-intake`：`1.0.1`
- `life-automation`：`1.0.0`
- 旧 `ops-telegram-admin`：保持未启用，已从 `plugins.entries` 与 `plugins.allow` 移除；源文件只作为历史保留
- `openclaw config validate`：通过，零 warning
- Gateway：最终 PID `1897236`，active/running，connectivity probe `ok`

生产备份：

- `/Volume3/OpenClaw/home/.openclaw/backups/task-permission-token-watch-20260723T232000`
- `/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-async-dispatch-1.1.0-20260723T232700`
- `/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-async-dispatch-1.1.1-20260723T233000`
- `/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-async-dispatch-1.2.0-20260723T233500`
- `/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-async-dispatch-1.2.1-20260723T235320`
- `/Volume3/OpenClaw/home/.openclaw/backups/ops-token-intake-1.0.0-20260723T233635`

## 6. 严格验收

### 6.1 插件测试

- `housekeeper-async-dispatch 1.2.2`：构建与集成测试 `HOUSEKEEPER_WATCH_TEST_OK`
- `ops-token-intake 1.0.1`：构建与集成测试 `OPS_TOKEN_INTAKE_TEST_OK`
- 两个测试均包含并发状态写入；固定临时文件造成的碰撞在 1.2.0 阶段被真实测试发现，1.2.1 改为 UUID 临时文件、文件锁和 fail-open；1.2.2 又修正“未按期回报”被误说成“卡死”的事实等级错误

### 6.2 真实委派

Task `TEST-DELEGATE-004`：

- 賈南風只调用一次 `sessions_send`；
- 运行时强制异步，立即返回 accepted / `runId=d413...`；
- 魚玄機目标会话实际执行命令并通过 A2A 回报 `completed`；
- 持久状态从 `waiting` 自动变为 `completed`；
- 正常闭环时 `alertCount=0`，无重复授权请求，无阻塞主会话。
- 生产超期测试随后真实触发两次 Telegram 看门狗消息：1.2.1 的首次文案误称“卡死”，因此判定失败；1.2.2 重测文案为“到点没交进度回报、执行未必失败、自动报备”，事实等级准确，随后测试状态恢复为 completed。

### 6.3 角色职责内工具

| Agent | 实测 | 结果 |
| --- | --- | --- |
| ops | `ops_token_inbox list` + `exec openclaw --version` | 2 calls，0 failures，未询问权限 |
| housekeeper | `housekeeper_task_watch list` | 1 call，0 failures，读到 TEST-DELEGATE-004 completed |
| coder | sandbox 内 `read AGENTS.md` + `exec pwd` | 2 calls，0 failures，`pwd=/workspace` |
| reviewer | `read AGENTS.md` | 1 call，0 failures |
| life | `life_automation list` | 1 call，0 failures |

### 6.4 通道与配置

- 8 个 Telegram account 均为 enabled / configured / running，逐账号 probe 返回 `works`、`audit ok`
- Gateway CLI 与服务版本一致，connectivity probe `ok`
- 插件加载：housekeeper 1.2.2、ops token intake 1.0.1、life automation 1.0.0
- 现有 Telegram binding、session/transcript、memory 未删除、未重建、未重绑

## 7. 已知观察与验收边界

- `custom-1` 和 `custom-2` 在本轮多次返回上游 `503 Service temporarily unavailable`；OpenClaw 自动回退到 DeepSeek 并完成所有验收。这是模型供应端可用性观察，不是权限、A2A 或插件故障，本轮不扩大范围修改模型路由。
- 真实“少主新发一个未使用 Token → hook 捕获 → 魚玄機 claim → 原生命令绑定”的端到端测试需要一个可用的新 Bot Token。当前已完成 hook 集成测试、并发/去重测试、生产插件加载和生产 `list` 工具测试；在没有真实新 Token 时，不伪称完成真实秘密投递测试。下次正常绑定任务即作为生产正向验收，少主无需重复发送同一 Token。

## 8. 回滚

若插件异常：

1. 停止新的相关任务；
2. 从对应时间戳备份恢复插件目录和 `openclaw.json`；
3. `openclaw config validate`；
4. 必要时只重启一次 Gateway；
5. 复测 8 个 Telegram probe、A2A、角色工具和 transcript/session 清单。

禁止通过删除 session/transcript、重新绑定旧账号、关闭全局脱敏或把其他 Agent摘要写入个人记忆来“恢复”。
