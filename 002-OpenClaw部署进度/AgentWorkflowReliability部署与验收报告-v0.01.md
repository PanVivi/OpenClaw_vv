# Agent 工作流可靠性部署与验收报告 v0.01

日期：2026-07-26  
分支：`agent/lossless-content-update`  
生产：OpenClaw `2026.7.1-2` / Node.js `22.22.3`

## 结论

正式修复计划已完成三轮独立审核、生产部署和真实验收，结果通过。

- 用户主动禁用的旧 `WorkboardNotificationPump` 保持 `disabled`；它是止损措施，不是故障，也未被擅自恢复。
- 新 `WorkboardNotificationRelay` 使用 command Cron，不调用模型；无事件静默，有事件只在 Telegram 确认发送成功后推进 Workboard cursor。
- 贾南风创建正式 Workboard 卡、派发给夏姬子 Agent、完成、主动通知的完整链路通过。
- 萧观音的通用 `message` 已关闭；`life-automation 1.1.0` 固定校验 `agentId=life`、`telegramAccountId=life`，真实回复由萧观音 Bot 发出。
- 八角色已统一加入答案优先、能力预检、有限重试、硬失败熔断和长任务不占用主 Agent 的规则。
- 八个 Agent、八条 Telegram binding、历史会话和记忆均保留。

## 资料核对

部署决策以官方资料、GitHub 已知问题和本机实测为主，社群讨论只作交叉印证。

### 官方

- Subagents：子 Agent 不获得 `message`，结果回到 requester；`sessions_yield` 只负责等待。  
  https://docs.openclaw.ai/tools/subagents
- Cron：`agentTurn` 使用模型，`command` 不使用模型。  
  https://docs.openclaw.ai/automation/cron-jobs
- Workboard：通知游标可重放，并提供 heartbeat、runtime、retry、reclaim。  
  https://docs.openclaw.ai/plugins/workboard
- Model failover：配额、计费和限流失败具有 cooldown/backoff 语义。  
  https://docs.openclaw.ai/concepts/model-failover
- Backup：生产备份使用 OpenClaw backup CLI。  
  https://docs.openclaw.ai/cli/backup

### GitHub

- 多 Telegram 账号未显式指定 `accountId` 时可能落到 default：  
  https://github.com/openclaw/openclaw/issues/17889  
  https://github.com/openclaw/openclaw/issues/26975
- announce/送达状态与真实外部投递之间的缺口：  
  https://github.com/openclaw/openclaw/issues/26867  
  https://github.com/openclaw/openclaw/issues/43177
- quota/rate-limit fallback 和 cooldown 讨论：  
  https://github.com/openclaw/openclaw/issues/24102  
  https://github.com/openclaw/openclaw/issues/19249

### 社群交叉印证

- 空 Agent Cron 的 Token 消耗：  
  https://www.reddit.com/r/openclaw/comments/1s39az3/cron_job_token_use/
- 多 Agent Telegram 的账号路由：  
  https://www.reddit.com/r/openclaw/comments/1s00ybd/i_built_a_plugin_that_fixes_interagent_messaging/
- 把轮询判断移出模型：  
  https://www.reddit.com/r/openclaw/comments/1to8fgp/your_openclaw_agent_probably_shouldnt_be_polling/

## 三轮计划审核

三轮审核分别独立完成，均为通过：

1. `AgentWorkflowReliability计划审核一-官方一致性-v0.01.md`
2. `AgentWorkflowReliability计划审核二-数据安全与回滚-v0.01.md`
3. `AgentWorkflowReliability计划审核三-可部署性与真实验收-v0.01.md`

审核后补入了 requester route 边界、在线 SQLite 备份、停止门、真实失败注入和重启恢复验收，部署未偏离正式计划。

## 备份

备份根目录：

`/Volume3/OpenClaw/backups/agent-workflow-reliability-20260726T104522+0800`

包含官方 `openclaw backup create --verify` 归档、OpenClaw 全局 SQLite 在线备份、Workboard SQLite 在线备份、八角色卡哈希、2135 个部署前 session 文件索引，以及旧非法编码文件名的单独归档与哈希。

四个活动/备份 SQLite `integrity_check=ok`，备份三项 SHA-256 复核全部 `OK`。当前版本未提供较新文档中的 `backup sqlite` 子命令，因此 SQLite 使用在线 `.backup`，没有复制活动 WAL/SHM。

## 实际变更

### 八角色共同协议 v0.07

已部署到 ops v0.16、housekeeper v1.13、coder v0.10、reviewer/夏姬 v0.08、life v0.10 和三位 companion v0.07。

新增内容只涉及工作方式，不改变姓名、人格、身份或核心职责：逐项直接回答；不知道或缺权限时直说；能力范围内穷尽安全路径后再报告不能；启动子 Agent 前先做 effective tools 预检；长任务使用同角色子 Agent 或 Workboard worker；硬失败不重复撞击；blocked/failed/stale 主动回报。

### life-automation 1.1.0

- 新增 `inspect`。
- 启动时强制 `agentId=life`、`telegramAccountId=life`。
- 输出插件版本、owner、固定会话、tick、timeout、状态文件与 job 状态，不输出 Token。
- life 的普通 `message` 已从 allow 移除并加入 deny；自动化结果由固定 requester route 返回。

### WorkboardNotificationRelay

- Cron ID：`73146ddf-8366-4b9c-9b81-0a8ae860f842`
- declaration：`workboard-notification-relay-v2`
- 周期：每分钟
- payload：`command`
- delivery：`none`
- Telegram：显式 `account=housekeeper`
- 语义：at-least-once；发送成功并取得 message ID 后才 advance。

### 模型熔断

- `WorkboardDispatchPump` 与新 Relay 均为无模型 command。
- Grok 恢复探针显式 `custom-2/grok-4.5` 且 `fallbacks=[]`，失败不尝试其他模型。
- OpenAI 一次性额度提醒改为显式 housekeeper message command，不再启动 Agent。
- 共同协议禁止自动化无意继承默认模型链；已知硬失败不得在同一状态反复尝试。

## 验收证据

### 服务、账号和数据

| 项目 | 结果 |
| --- | --- |
| Gateway | `running` |
| RPC | `ok=true` |
| 配置 | `valid=true` |
| Telegram | 8/8 `running=true`、`connected=true`、`probe.ok=true` |
| Agent | 8 |
| binding | 8 |
| session 文件 | 部署前 2135，部署后 2141，未减少 |
| 角色卡 | 8/8 本地与生产 SHA-256 一致 |
| life 状态 | 重启前后 SHA-256 `df7106...54b71` 一致 |

### Relay fixture 与空跑

- 本地/生产 self-test：7 个 fixture 全通过。
- 连续 10 次有效空事件 Cron：10/10 `status=ok`、`empty=true`，无 model/provider/usage 字段。
- 最终重启后连续空跑仍为 `ok`，无 Telegram 消息。

### 真实 completed / blocked 通知

- completed event：`7398ffa8-d7c1-42f4-a55c-dd80941fab3b`
- blocked event：`b6b599dc-f9c8-4d60-921c-afee1856c488`
- Telegram message ID：`389`
- sent event IDs 与 advanced event IDs 完全相同。

### 真实发送失败注入

验收卡：`b830e02d-e3d8-44c2-ae2d-cfc8f92ea0ed`

1. 贾南风通过 `workboard_create` 创建并委派 reviewer。
2. 夏姬子 Agent 完成 claim、heartbeat、proof `RELAY_FAIL_CURSOR_OK`、complete。
3. Relay 临时使用不存在的 Telegram account，真实返回“bot token missing”，退出码 1。
4. 失败时没有 `sent`/`advanced` 审计记录，事件保持未消费。
5. 恢复固定 housekeeper account 后，同一 event `b714785c-ce05-462f-9ed4-f742fe9e0dea` 成功发送，Telegram message ID `390`，随后才 advance。

这证明发送失败不会静默丢任务终态。

### 萧观音路由

通过 life Telegram requester session 实际调用 `life_automation inspect`，并显式由 `reply-account=life` 交付：

`LIFE_ROUTE_OK version=1.1.0 account=life session=agent:life:telegram:direct:<owner> jobs=0`

执行结果 `deliverySucceeded=true`，没有 `message` 工具调用；未由鱼玄机 Bot 代答。

### 重启恢复

最终 Gateway 重启后 service/RPC/config 全通过；8 Bot 全部恢复连接；life-automation 仍为 `loaded/activated` 1.1.0；life 状态哈希不变；Relay、DispatchPump、CodexResetWatcher 继续运行；新 Relay 继续空跑成功；旧通知泵仍 disabled。

## 当前生产自动化

| declaration | 类型 | 状态 | 说明 |
| --- | --- | --- | --- |
| `workboard-dispatch-pump-v1` | command | enabled/ok | 无模型派发 |
| `workboard-notification-relay-v2` | command | enabled/ok | 无模型终态通知 |
| `life.codex-reset-watcher.v1` | command | enabled/ok | 萧观音双源监控 |
| `grok-quota-weekly-reset-check-v1` | agentTurn | enabled/idle | 单模型，无 fallback |
| `openai-quota-reset-reminder-20260730` | command | enabled/idle | 固定 housekeeper Bot |
| `workboard-notification-pump-v1` | agentTurn | disabled | 用户止损停用，保留历史 |

## 已知但不在本轮扩大处理

- Control UI 的既有局域网安全开关没有在本轮修改。
- `plugins info` 的历史 install provenance 仍记录最初安装包 1.0.0；实际加载 manifest、源码和运行态均为 1.1.0，运行态验收以 `plugin.version=1.1.0` 为准。
- npm 构建报告的第三方依赖审计项不属于本轮工作流故障，未执行可能破坏兼容性的自动大版本修复。

## 回滚

若新 Relay 后续异常：只停用新 Relay；旧通知泵继续 disabled；不推进未确认发送的 cursor；从上述备份恢复对应脚本、插件或角色卡；不触碰 session、transcript、memory、Bot 和 binding。
