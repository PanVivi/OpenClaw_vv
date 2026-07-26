# Agent 工作流可靠性正式修复计划 v0.01

日期：2026-07-26  
目标环境：OpenClaw 2026.7.1-2 / Node.js 22.22.3 / Telegram 多账号 / Workboard production  
目标：修复跨 Bot 回答、无效隔离查询、回复不直达、轻易放弃、任务终态回报、空轮询 Token 消耗和额度不足模型重复尝试；保留八个角色、既有会话、聊天记忆、Bot binding 与既有自动化。

执行状态：`COMPLETED / ACCEPTED`（2026-07-26 11:24 +08:00）  
实际结果与证据：`AgentWorkflowReliability部署与验收报告-v0.01.md`

## 一、范围和事实基线

### 1.1 本轮范围

1. 八个 Agent 的统一“答案优先、能力内穷尽、硬失败不盲目重试”协议。
2. `life` 的通用消息出口和子 Agent 完成回告边界。
3. `life-automation` 的可检查性和账号边界。
4. Workboard 终态通知的无模型可靠转发。
5. 正式任务的运行时限、heartbeat、自动恢复和主动上报规则。
6. 已知额度不足模型在自动化工作流中的熔断。
7. 生产、设计、事故和部署文档同步。

### 1.2 明确不做

- 不修改角色姓名、人格、身份、核心职责和 companion 关系。
- 不删除或重建 Agent、Telegram Bot、binding、session、transcript 或个人记忆。
- 不恢复原 `WorkboardNotificationPump` 的 `agentTurn` 设计。
- 不把本轮扩大为 Docker、Sandbox、NAS 系统或其他无关自动化改造。
- 不用尚未验证的 OpenClaw beta 版本替代当前最新稳定版。

### 1.3 已验证事实

- `WorkboardNotificationPump` 是少主为止损主动要求停用；停用行为本身不是故障。
- 原通知泵每两分钟启动一次 `agentTurn`；即使无事件并回复 `NO_REPLY`，成功轮次仍约消耗 6,500 tokens，历史共 420 次运行。
- `WorkboardDispatchPump` 当前正常；终态通知泵当前 disabled。
- `life` 是八个 Agent 中唯一允许通用 `message` 的角色。
- 萧观音子 Agent 完成链曾以 `accountId=default` 发送 Telegram，实际由鱼玄机 Bot 发出。
- `sessions_yield` 产生的状态文字是内部等待信息，不是 Telegram 用户回复。
- life 及其同角色子 Agent 都拒绝普通 `read`；此前启动子 Agent 读取脚本从能力上不可能成功。
- Workboard 调研卡 `03cc322d-839b-469b-a180-ea834cbc8059` 的 `maxRuntimeSeconds=600`，10 分钟后被平台按真实状态阻塞。
- `life-automation` 的配置文档包含 `telegramAccountId=life`，但 1.0.0 实现没有读取或使用该字段。
- NAS 已运行当前最新稳定 OpenClaw 2026.7.1；本轮不以升级核心版本作为前置。

## 二、资料依据

### 2.1 官方

- Sub-agents：子 Agent 不应获得 `message`；结果返回父 Agent，由父 Agent 正常投递；`sessions_yield` 只用于等待完成事件。  
  https://docs.openclaw.ai/tools/subagents
- Cron：`agentTurn` 调用模型；`command` 不调用模型；条件检查可在 `fire=false` 时不创建模型运行。  
  https://docs.openclaw.ai/automation/cron-jobs
- Workboard：终态通知可重放，cursor 持久化；支持 runtime limit、retry budget、heartbeat、reclaim 和 diagnostics。  
  https://docs.openclaw.ai/plugins/workboard
- Model failover：明确 billing 错误进入持久 backoff；Cron 可设置独立模型和 fallback。  
  https://docs.openclaw.ai/concepts/model-failover
- Gateway RPC：脚本可通过 `openclaw gateway call <method>` 使用正式 RPC。  
  https://docs.openclaw.ai/cli/gateway

### 2.2 官方 GitHub 议题和源码讨论

- 多账号隔离会话的 `message` 缺少 `accountId` 会回落 default：  
  https://github.com/openclaw/openclaw/issues/17889  
  https://github.com/openclaw/openclaw/issues/26975
- 子 Agent / Cron announce 送达状态与真实 Telegram 投递可能不一致：  
  https://github.com/openclaw/openclaw/issues/26867  
  https://github.com/openclaw/openclaw/issues/43177
- quota / rate-limit fallback 和 cooldown 的历史缺口：  
  https://github.com/openclaw/openclaw/issues/24102  
  https://github.com/openclaw/openclaw/issues/19249

### 2.3 社群讨论

- OpenClaw Cron 空 Agent turn 会持续产生 Token：  
  https://www.reddit.com/r/openclaw/comments/1s39az3/cron_job_token_use/
- 多 Agent Telegram 中遗漏 `accountId` 会使用默认 Bot：  
  https://www.reddit.com/r/openclaw/comments/1s00ybd/i_built_a_plugin_that_fixes_interagent_messaging/
- 把等待和状态过滤移到模型外，可显著降低轮询 Token：  
  https://www.reddit.com/r/openclaw/comments/1to8fgp/your_openclaw_agent_probably_shouldnt_be_polling/

社群资料只用于交叉印证；部署决策以官方契约、当前版本源码和本机实测为准。

## 三、正式变更

### 3.1 八角色统一回答与努力协议

在八个当前 `AGENTS.md` 靠前位置增量加入同一短协议：

1. 先逐项直接回答，再补必要说明。
2. 确定知道时直接回答；不知道时明确说“不知道”；缺工具或权限时准确写出缺项。
3. 默认不向少主展示内部任务包、思考过程、尝试顺序和无关流程。
4. 在报告不能完成前依次执行：核对已有事实、使用现有安全工具、尝试同权限替代路径、对瞬时错误有限重试。
5. 额度耗尽、认证永久失败、明确权限拒绝、目标不明和不可逆风险属于硬失败，不重复撞击。
6. 不得用猜测代替日志、工具结果或来源。
7. 长任务交同角色子 Agent 或 Workboard worker；简单查询不创建子 Agent。
8. 启动子 Agent 前核对所需能力是否包含在子 Agent effective tools；缺少必需能力时不得创建无效任务。

### 3.2 life 消息和查询边界

1. 从 life 的通用工具 allow 中移除 `message`，并明确加入 deny。
2. life 的当前 Telegram 回复继续使用正常 channel-final；跨 Agent 只使用 `sessions_send`；自动化通知由固定账号的自动化/命令投递。
3. `life_automation get/list` 作为 life 自有自动化的权威查询入口。
4. 对 OpenClaw Cron 任务，life 先用已有 `cron list/get/runs` 回答配置和运行事实。
5. 若问题要求读取受限源码，必须直接说明缺少固定源码读取能力，不得创建同样无权读取的隔离子 Agent。
6. `sessions_yield` 只用于等待子 Agent 完成事件，不得把其附带状态文字当作已发送回复。

### 3.3 life-automation 1.1.0

1. 增加只读 `inspect` 动作，返回：
   - 插件版本和固定 owner agent；
   - 固定 owner chat；
   - 固定 Telegram account；
   - scheduler tick、run timeout、状态文件位置；
   - 指定 job 的 schedule、next/last run、last status、run id、错误和通知策略。
2. 配置中的 `telegramAccountId` 必须实际读取、校验为 `life` 并显示在 inspect 输出。
3. 插件继续不接受任意 Agent ID、shell、Webhook 或普通文件路径。
4. 插件运行产生的用户可见结果不得使用通用 `message`；保留固定 life session 路由并通过真实 life Bot 验收。
5. 添加集成测试：其他 agent 不可见；错误 account 配置拒绝启动；inspect 不泄露 Token。
6. 不把 `telegramAccountId` 伪装成 `subagent.run` 的参数：当前 OpenClaw 2026.7.1 的该接口没有 account 参数。插件继续把结果交回固定的 life requester session，由 OpenClaw 的 requester route 完成正常投递；`telegramAccountId=life` 用于启动时校验和验收约束。
7. 关闭 life 的通用 `message` 后，父 Agent 不得再手工二次发送子任务结果；这避免父 Agent 在未指定 account 时落到 default Bot。
8. 若实测 requester route 仍不能稳定保持 `lastAccountId=life`，本轮停止启用该插件的新通知任务，不用未公开接口或 shell 绕过；保留既有 job 数据，转由第 3.4 节的显式账户 command 通知路径承担持久通知。

### 3.4 Workboard 无模型通知转发器

新建 `WorkboardNotificationRelay.mjs`，通过正式接口完成：

1. `workboard.notifications.events` 只读获取 canonical subscription 的未消费事件。
2. 无事件：退出 0，不启动模型，不发送消息，不推进 cursor。
3. 有事件：从 cardId/runId/sessionKey/message 提取卡片 UUID；使用 `openclaw workboard show --json` 核对真实标题和状态。
4. 以固定中文模板生成简短报告，不调用模型。
5. 使用：
   - `openclaw message send`
   - `--channel telegram`
   - `--account housekeeper`
   - `--target 811150402`
   发送。
6. 只有 Telegram CLI 返回成功和 message ID 后，才调用 `workboard.notifications.advance`。
7. 发送失败或状态不明时不推进 cursor；下轮重放。采用 at-least-once，宁可极低概率重复，不允许静默丢失。
8. 每条报告包含 Workboard event ID，便于人工和日志去重。
9. 新建 command Cron，每分钟执行，delivery=none；failureAlert 固定 housekeeper account。
10. 原 `WorkboardNotificationPump` 保持 disabled，作为历史回滚对象，不删除。

### 3.5 Workboard 任务生命周期

1. 卡片运行时限按任务类别设置：
   - 简单只读：20 分钟；
   - 单源研究：30 分钟；
   - 官方 + GitHub + 社群多源研究：90 分钟；
   - 部署/工程：按计划分段，默认 120 分钟。
2. 长任务 worker 每 5 分钟内至少 heartbeat 或阶段更新。
3. 卡片必须设置合理 `maxRetries`；低风险瞬时失败在原授权内自动恢复一次。
4. blocked/failed/stale 由通知转发器主动报告；不得等待少主追问。
5. 原调研卡保留事故证据，不自动重跑；新任务使用正确时限。

### 3.6 模型额度熔断

1. Workboard 派发和终态通知均为 command，不依赖模型。
2. 所有自动化任务必须显式设置模型/fallback，或明确为无模型 command；禁止无意继承 Agent 主模型链。
3. 已知额度不足期间：
   - 普通自动化不尝试已知不可用模型；
   - 只有专用、低频、严格单模型探针可以检查恢复；
   - 探针失败不再 fallback，避免把探针误当成功；
   - 同一状态只通知一次。
4. 对当前上游把额度不足包装成普通 503 的情况，以运维已知状态覆盖错误分类；不依赖新隔离会话自行识别。
5. 不在本轮自动改回所有 Agent 的人格模型；先消除自动化重复尝试。若交互会话仍重复撞不可用模型，再依据实测单独切换当前主模型并保留恢复记录。

## 四、部署顺序

1. 再次确认生产版本、Gateway、八 Bot、Cron、Workboard、模型链和 Git 状态。
2. 创建带时间戳备份：
   - 先用官方 `openclaw backup create --verify` 备份状态、配置、凭据和 workspace；
   - 再用 `openclaw backup sqlite create --global` 对 OpenClaw 全局 SQLite 做在线一致性快照并执行 `verify`；
   - Workboard 自有 SQLite 不直接复制活动中的 `.sqlite/-wal/-shm`，使用 SQLite online backup API 生成私有快照后执行 `integrity_check`；
   - 另存插件目录、八角色卡、会话索引清单和关键 transcript 哈希；
   - 备份目录权限仅限当前 NAS 用户。
3. 本地修改并验证统一回答协议、life-automation 1.1.0 和 Relay。
4. 本地运行 TypeScript build、插件集成测试、Relay dry-run/fixture 测试。
5. 部署角色卡和插件；校验 diff 和哈希。
6. 原子修改 life 工具策略，执行 config validate；仅在热加载不足时重启 Gateway。
7. 部署 Relay 文件和 command Cron；先 dry-run，再真实运行。
8. 执行验收矩阵。
9. 若任一关键验收失败，停用新 Relay并回滚对应变更；旧通知泵继续 disabled。
10. 全部通过后更新文档、提交并推送当前分支。

所有生产写入均采用“生成临时文件/CLI 原子写入→校验→替换”的顺序；不直接覆盖活动 SQLite，不删除旧订阅、旧任务或历史运行记录。

部署停止门：

- 备份或备份验证失败：不写生产。
- 本地 build、fixture 或配置校验失败：不写生产。
- 角色卡 diff 超出本计划列出的增量块：不部署角色卡。
- 任一 Bot/account/binding/session 数量减少：立即停止并回滚对应配置。
- 真实 Telegram 投递不能确认发送账号和 message ID：不推进 Workboard cursor，不宣布验收通过。
- 模型用量只能以 Cron run 的真实 payload/usage 记录判定；不能用“脚本里没有模型调用”代替运行时验收。

## 五、验收矩阵

### A. 数据与服务

- Gateway `status --require-rpc` 通过。
- 八个 Telegram account probe 通过。
- 八个 agent、binding、session/transcript 数量和关键哈希未减少。
- 原有 CodexResetWatcher、WorkboardDispatchPump 和其他 Cron 未回退。

### B. 跨 Bot

- life 主会话正常回复由 life Bot 发送。
- life 子 Agent 完成测试只由 life Bot 产生用户可见结果。
- 全部自动外发均有显式 account；不得出现 `accountId=default`。
- 鱼玄机 Bot 不再替萧观音回答。
- 在 life 主会话启动一个同角色子任务，必须验证完成事件先回到 requester session，再由 life 正常 channel-final 投递；不得出现父 Agent 的 `message` 工具调用。

### C. 直接回答和努力阶梯

对八个 Agent 抽测：

- 已知事实：第一句直接回答。
- 未知事实：明确说不知道和缺少的证据。
- 权限缺失：明确写出权限/工具，不展开无关流程。
- 瞬时失败：执行有限重试或替代路径。
- 硬失败：不反复尝试。
- 简单查询：不创建子 Agent。
- 不可能完成的子任务：能力预检阻止创建。

### D. Workboard

- 连续 10 次空轮询：0 次模型调用、0 Token、0 Telegram 消息。
- 创建验收卡并触发 completed：手机真实收到 housekeeper Bot 消息。
- 创建验收卡并触发 failed/blocked：手机真实收到阻塞原因。
- Telegram 发送失败时 cursor 不推进；恢复后事件重放。
- cursor 推进前记录本批 event ID 与 Telegram message ID；推进失败时保留可审计的 at-least-once 重放记录。
- Gateway 重启后 Relay Cron、subscription cursor 和派发泵恢复。
- Cron runs 显示 command，无 `model/provider/usage`。
- Relay fixture 覆盖：空批次、completed、failed/blocked、无法提取 cardId、Telegram 失败、advance 失败、重复重放。

### E. 模型熔断

- 新 Relay 和 Dispatch 不出现 Grok/GPT/DeepSeek模型尝试。
- 已知额度不足模型只由专用探针调用。
- 探针无 fallback；失败不造成连续重试风暴。

### F. life-automation

- build 和集成测试通过。
- `inspect` 返回固定 agent/account 和运行状态，不返回 Token。
- 非 life agent 看不到工具。
- Gateway 重启后既有 job 状态保持。
- 使用一个标记为“验收测试”的短任务做真实 Telegram 路由测试；记录 sessionKey、runId、发送 account 和 message ID，完成后只删除该测试任务，不动既有 job。

## 六、回滚

1. 停用新 Relay Cron。
2. 恢复备份的 `openclaw.json`、life-automation 插件和八角色卡。
3. 执行 config validate，必要时单次重启 Gateway。
4. 重新验证八 Bot、binding、session、memory 和既有 Cron。
5. 原通知泵保持 disabled，除非少主另行明确要求；回滚不等于恢复高 Token 旧设计。

## 七、完成标准

- 三轮计划审核全部通过。
- 生产部署逐项与本计划一致。
- 验收矩阵 A–F 全部有真实证据且通过。
- 文档与真实状态一致。
- 当前 Git 分支提交并推送成功。
