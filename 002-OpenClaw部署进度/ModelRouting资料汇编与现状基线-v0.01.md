# Model Routing 资料汇编与现状基线｜v0.01

- 核对日期：2026-08-11（Asia/Taipei）
- 目标环境：OpenClaw 2026.7.1-2，Node.js 22.22.3
- 目标：按角色、子 Agent 与后台任务建立可回退、可验证、可回滚的模型调用策略。
- 边界：不改 Agent ID、中文姓名、Telegram 账号、绑定关系、角色卡、工具权限或任务系统架构。

## 1. 资料范围与结论等级

本轮先查官方文档与生产 schema，再查 GitHub 源码/问题，最后参考社群讨论。结论按以下等级记录：

- **已验证**：官方文档、生产 schema、生产 CLI/RPC 或实际模型调用直接证明。
- **有依据的推断**：官方机制与生产结构共同支持，但尚未在本环境做故障注入。
- **社群经验**：只作为风险线索，不作为部署依据。

## 2. OpenClaw 官方说明

### 2.1 主模型与回退链

官方 Models 文档说明：`agents.defaults.model` 与 `agents.list[].model` 可使用 `{ primary, fallbacks }`；每个 Agent 的对象会形成自己的完整调用链。用户通过 `/model` 固定的会话模型是严格选择，不会自动套用配置中的普通回退链；恢复默认选择需使用 `/model default` 或等价的会话补丁。

- 文档：https://docs.openclaw.ai/concepts/models
- GitHub 原文：https://github.com/openclaw/openclaw/blob/main/docs/concepts/models.md

结论：只改 `openclaw.json` 不足以完成迁移；旧会话的固定模型也必须清理，否则恢复旧 Telegram 会话时仍可能绕过新链。

### 2.2 故障转移

官方 Model Failover 文档说明：回退顺序由配置决定；用户固定模型与自动故障转移产生的会话覆盖来源不同；自动回退后系统会按机制恢复探测。Cron 的 payload 若带模型，则优先于 Agent 默认模型，并可带独立 fallbacks。

- 文档：https://docs.openclaw.ai/concepts/model-failover
- GitHub 原文：https://github.com/openclaw/openclaw/blob/main/docs/concepts/model-failover.md

结论：主链、会话覆盖和 Cron payload 必须同时核对；验收还要确认故障转移不会永久改写 Agent 配置。

### 2.3 子 Agent

官方 Subagents 文档说明：子 Agent 默认继承调用者；可以由 `agents.defaults.subagents.model`、每个 Agent 的 `subagents.model` 或显式 spawn 参数覆盖。生产 schema 进一步确认，本环境的全局和逐 Agent `subagents.model` 都支持字符串或 `{ primary, fallbacks }` 对象。

- 文档：https://docs.openclaw.ai/tools/subagents
- GitHub 原文：https://github.com/openclaw/openclaw/blob/main/docs/tools/subagents.md

结论：不需要靠角色记忆文件，也不需要新建内部角色来实现子 Agent 路由；应使用原生配置对象，并用真实 child run 元数据验收。

### 2.4 Cron 与后台任务

官方 Cron 文档说明：Agent Turn 可用 `model` 与 `fallbacks` 覆盖；Command Job 是确定性命令执行，不需要模型。`utilityModel` 用于标题、摘要、进度等短任务，但生产 schema 中它只接受单一字符串，不接受独立回退对象。

- 文档：https://docs.openclaw.ai/automation/cron-jobs
- GitHub 原文：https://github.com/openclaw/openclaw/blob/main/docs/automation/cron-jobs.md

结论：后台规律性简单任务的模型链用于需要 LLM 的 Agent Turn；现有确定性 Command Job 保持无模型。`utilityModel` 设为 LongCat，但其独立回退链受 schema 限制。

## 3. GitHub 问题与源码风险线索

以下问题用于制定验收项，不将旧版本缺陷直接当作当前版本事实：

| 问题 | 风险线索 | 本轮处理 |
|---|---|---|
| [#47705](https://github.com/openclaw/openclaw/issues/47705) | 旧版本自动回退可能污染 Agent 模型配置 | 部署前后保存配置哈希，故障链验收后确认配置未被改写 |
| [#37813](https://github.com/openclaw/openclaw/issues/37813) | 旧版本未知模型 ID 可能静默落到默认模型 | 所有模型必须先在 allowlist 中存在，并核对真实 provider/model 元数据 |
| [#20265](https://github.com/openclaw/openclaw/issues/20265) | 旧 CLI 的 fallback 增量命令可能意外收窄 allowlist | 不使用 `models fallbacks add`；采用完整候选配置、schema 校验和原子切换 |
| [#43768](https://github.com/openclaw/openclaw/issues/43768)、[#51854](https://github.com/openclaw/openclaw/issues/51854) | 旧版本子 Agent 模型覆盖曾被忽略 | 不能只验配置；必须发起工程类和生活类真实子 Agent 调用 |
| [#58496](https://github.com/openclaw/openclaw/issues/58496) | 会话 user override 会干扰预期回退 | 备份后用官方 `sessions.patch` 清理八个正式 Agent 的旧覆盖 |
| [#32983](https://github.com/openclaw/openclaw/issues/32983)、[#19445](https://github.com/openclaw/openclaw/issues/19445) | 旧版本 heartbeat model 行为曾不一致 | 以本机 schema 和真实 heartbeat 运行元数据为准，不把字符串配置误说成完整回退链 |

## 4. 社群讨论

OpenClaw 社群与 Reddit 讨论反复提到三类实际问题：子 Agent 偶尔继承错误模型、会话固定模型让配置变更看似无效、只检查配置而没有检查真实运行元数据。社群也常建议为多供应商设置回退、给子任务设置超时并控制成本。

这些内容只作为测试场景来源。正式设计仍以官方文档、生产 schema 和本机实际调用为准，不采用未经证实的帖子结论。

## 5. 生产现状（变更前）

### 5.1 身份与运行态

- 八个正式 Agent：`housekeeper`、`life`、`ops`、`coder`、`reviewer`、`companion-wu`、`companion-lv`、`companion-dugu`。
- Telegram 账号和绑定均已存在；本轮禁止改名、重绑或合并身份。
- 另有未配置的历史 `main` 会话目录；不属于本次八个正式 Agent，保持不动。

### 5.2 当前模型配置

- 全局默认主模型：`custom-3/LongCat-2.0`，无回退链。
- 八个 Agent 当前也都固定为 `custom-3/LongCat-2.0`，无回退链。
- 用户给出的所有模型引用均已存在于 `agents.defaults.models` allowlist。
- 生产 `config schema` 已确认逐 Agent 主模型、全局子 Agent 模型和逐 Agent 子 Agent 模型都可使用 `{ primary, fallbacks }`。
- Heartbeat 的 `model` 在当前 schema 中只接受字符串；`utilityModel` 同样只接受字符串。

### 5.3 会话覆盖

生产会话索引扫描结果：

- 会话总数：256；存在模型覆盖：211。
- `modelOverrideSource=user`：195；其中 195 条为此前紧急设置的 LongCat 固定模型。
- 当前 Telegram 直接会话中还存在若干角色各自的旧固定模型；例如贾南风仍有 `grok-4.3` 固定值，与本次目标 `grok-4.5` 不一致。

结论：旧会话覆盖是本次必须处理的真实阻塞，不得留给用户逐个输入 `/model default`。

### 5.4 Cron、Heartbeat 与任务系统

- 两个主要生产 Command Job（晨报、CodexResetWatcher）为确定性脚本，不带模型，保持不变。
- Grok 周配额任务是 Agent Turn，当前显式固定 LongCat 且无 fallback；应改为后台简单任务链。
- `ops` heartbeat 当前显式 LongCat；受 schema 限制只能配置单一模型。
- 旧 Workboard 定时任务保持 disabled；不因模型部署恢复。

### 5.5 模型可用性预检

OpenClaw provider probe 已验证 `custom-1`、`custom-2`、`custom-3`、`deepseek`、`qwen-coding-cn` 均可用。最小直连探测已成功验证：

- `grok-4.5`
- `gpt-5.6-sol`
- `gpt-5.6-luna`
- `qwen3.8-max`
- `glm-5.2`
- `qwen3.6-flash`
- `LongCat-2.0`
- `grok-4.20-non-reasoning`
- `composer-2.5`

DeepSeek Flash 已由 OpenClaw provider probe 验证；DeepSeek Pro 在部署闸门前必须再做精确模型调用验证。

## 6. 事实结论

1. 用户设计的八个主 Agent 路由可以由当前 OpenClaw 原生配置直接表达。
2. 两类子 Agent 路由也可以由当前生产 schema 原生表达，不应依赖角色记忆文件。
3. 会话覆盖、Agent Turn Cron、Heartbeat 和 `utilityModel` 是独立层级，必须分别处理。
4. Command Job 不调用模型，保持无模型比强行套用后台链更符合官方架构。
5. Heartbeat 与 `utilityModel` 的独立 fallback 受当前 schema 限制；必须如实记录，不得伪装为已实现。
6. 部署必须热更新、可回滚；若出现必须重启 Gateway 的情况，应停止并单独请求授权。
