# OpenClaw 全任务系统正式修复计划 v0.01

> 状态：待三次独立完整审查
> 依据：`TaskSystemRepair资料汇编与问题基线-v0.01.md`
> 生产目标：OpenClaw `2026.7.1-2 (0790d9f)`
> 原则：不改角色身份；不以角色记忆代替执行器；只有高风险才询问一次；不向用户展示工业审批卡或内部任务字段。

## 1. 目标

在不依赖 OpenClaw 核心升级的前提下，按项目原设计把“用户消息 → 任务/模块分流 → 持久登记 → 计划与三审 → 执行与转交 → 证据验收 → 文档同步 → 賈南風 Telegram 回禀”闭合为可恢复、可去重、可审计的确定性链路，并清除当前所有已确认阻塞。

完成定义同时包括：

- 賈南風、魚玄機、蕭觀音收到的正式任务都不会因角色忘记调用工具而消失；
- 蕭觀音能处理晨报全部模块的数据输入，賈南風能认证转交；
- Workboard、Task Flow、worker 和 Telegram 通知只有一套一致终态；
- 空闲时不再每分钟制造 Task 或 dispatch 事件；
- 风险分级真实作用于工具动作，不以工业审批卡打扰用户；
- 旧任务、测试卡和失败投递有清晰迁移结果，不删除证据。

## 2. 实现结构

### 2.1 新增 `task-system-control` 插件

插件是任务系统控制器，不替代角色表达。它包含以下组件：

1. **Durable Inbox**
   - `message_received` 只收集已认证 owner 的 Telegram 路由与 provider update 线索；它是观察型 hook，不作为“已落盘”的唯一依据；
   - `before_agent_run` 在模型运行前同步校验 requester、规范化本轮 prompt，并完成 inbox upsert；持久写入失败时阻止本轮运行并给出自然故障说明，保证先登记、再处理；
   - 以 channel/account/chat/provider-message-id 组成首选幂等键；provider id 缺失时以 route + 规范化内容哈希 + 有界时间桶组成降级键并标记 `weak_identity`，后续通过 transcript id 对账；
   - 保存来源角色、原会话、接收时间、摘要哈希和处理状态，不保存无关私人内容副本；
   - 状态为 `pending → disposed`，分流结果只能是：普通对话、模块数据、正式任务、现有任务更新、高风险决定；
   - `agent_turn_prepare` 注入本次待分流记录；`before_agent_finalize` 在没有分流收据时要求同一轮补做一次；`agent_end` 仍未分流则进入 `needs_triage`，由控制器建立待整理项并自然告知，禁止静默丢失。

2. **统一工具面**
   - `task_intake`：登记/更新正式任务、查询状态、取消、确认风险决定；
   - `task_handoff`：賈南風或原接收角色向专业角色进行带来源、范围、去重键和收据的转交；
   - `task_module`：查询能力目录、登记目标能力和预期收据；专用模块仍由目标角色调用其受控工具，控制器通过 `after_tool_call` 核验成功收据后才能把模块输入标为 applied；
   - 工具结果给模型的是中文表达指引，对用户隐藏 action、ID、schema 和内部状态字段。
   - intake 必须选择明确的 `workflow_profile`：`direct_module`（结构化模块录入）、`simple_task`（短任务，执行后直接验收）、`governed_change`（有变更/回滚/验收的工程任务）、`research_plan_triple_review`（用户明确要求资料收集、冻结计划和三次独立完整审查）。当前修复任务固定为最后一种；不得把大型工程闸门强加给普通提醒或简单查询。

3. **持久状态**
   - 沿用已验收晨报控制插件的“0600 权限目录 + 原子临时文件 rename + revision + 锁 + 有界大小”模式；
   - inbox、task-link、handoff、risk-decision、outbox 分文件/日志保存，写入前校验 schema，任何不完整写入在启动时恢复或隔离；
   - 所有状态变更带 revision 与 event id，重复 hook 和重放不产生第二份业务动作。

4. **Gateway 内部服务**
   - 由 `gateway_start` 启动轻量 reconcile/outbox 服务，`gateway_stop` 有界落盘；
   - 仅扫描 pending/unknown/过期 lease，不创建 Cron、Task 或 Agent turn；
   - 启动时全量一次，此后事件触发优先，定时器只作崩溃补偿且无待办时零外部调用。
5. **官方 RPC 适配器**
   - 使用生产 `PluginRuntime` 已明确提供的 `api.runtime.gateway.request(method, params, {timeoutMs})` 直接调用 `workboard.*` Gateway RPC；
   - method 与 schema 先以生产类型/源码 fixture 固定，设置超时、错误分类和幂等重试；不得在 Gateway 内再启动 OpenClaw CLI 回调自身；
   - 离线迁移预览使用独立只读脚本，生产 controller 不保留 shell/CLI fallback。

### 2.2 升级 `workflow-governance` 到 v2

1. 由 `fromToolContext` 改为生产已具备的 `api.runtime.tasks.flow.bindSession(...)` 固定绑定：
   - owner session：`agent:housekeeper:task-system`；
   - requesterOrigin 保存原 Telegram channel/account/target；
   - 賈南風、魚玄機、蕭觀音从任何会话都能解析同一 Flow。
2. 每个需要跨轮次执行的正式任务只创建一个 managed 父 Task Flow；`direct_module` 以模块收据为真相，不创建空 Flow。OpenClaw 对每个 detached Workboard/subagent run 会自动创建一个真实 Task 和一个 `task_mirrored` 子 Flow，这是官方执行账本，不得再调用 `runTask` 复制第二条 Task。link record 关联 managed 父 Flow、业务卡、真实 Task、mirrored 子 Flow、run/session 与 inbox event。
3. 对 `research_plan_triple_review` 保留并强化计划哈希与三审闸门：
   - 冻结计划后才能记录审查；
   - 三次均为 `independent_complete`，各自包含完整范围、风险、回滚、验收和资料一致性检查；
   - 任一发现导致计划变化，三次审查全部作废并从第 1 次重来；
   - 三次通过前拒绝进入 implementation。
4. Flow 状态只由控制器按修订号推进；角色回复和评论不能直接把任务标成完成。managed 父 Flow 的 child readiness 由 link record 中的真实 Task/mirrored Flow + Workboard proof 计算，不能只用 `getTaskSummary(parentFlow)`，因为生产 detached run 不支持直接带 `parentFlowId` 启动。

### 2.3 Workboard / Task Flow 桥接

1. 正式任务创建时：
   - 先持久保存 intake event；
   - 创建唯一 Flow；
   - 通过官方 Gateway RPC 创建/查找带同一幂等键的 Workboard 业务卡；
   - 写 link record；若后半步失败则留在 `reconcile_required`，补偿器续做，绝不重复创建。
2. 卡片只承担业务范围、授权、依赖、证据和用户可见投影；Flow 承担执行阶段与子任务真相。
3. Flow 阶段由 `workflow_profile` 决定：`simple_task` 至少包含执行/验收，`governed_change` 包含计划/执行/验收/回滚证据，`research_plan_triple_review` 包含资料/冻结计划/三审/执行/验收/文档/同步；子任务作为 Task/子卡挂在同一父任务下。
4. 父任务只有在所有必需子任务终态成功、验收证据满足且通知尚未发送时进入 `notification_pending`；拆分、评论、proof 或单个 child 完成均不能提前 done。

### 2.4 事件驱动执行与终态

1. 触发 dispatch 的事件：新卡 ready、依赖完成、人工恢复、Gateway 启动 reconcile；每个 card revision 最多触发一次。
2. 禁止常驻一分钟 `WorkboardDispatchPump`；通过官方 `workboard.cards.dispatch` RPC 立即启动 worker。
3. `subagent_spawned` 保存 run/session/card/flow 关联；`after_tool_call` 以真实工具活动刷新 linked worker 活性，不要求模型记住单独 heartbeat。
4. `subagent_ended` 必须进行终态协调：
   - 已有 `workboard_complete` 且证据满足：进入 review/下一阶段；
   - worker 正常结束但没有正式完成/阻塞收据：记录 protocol violation 并进入 blocked，不能假装成功；
   - error/timeout/killed/reset：阻塞并保存自然原因；
   - 对应 Flow 子 Task 同步终态并立即推动依赖或父任务。
6. controller 在 worker 启动后解析 Workboard 返回的 run/session，再通过任务查询取得真实 taskId/mirroredFlowId 写入 link record；同一 runId 只允许一条真实 Task，发现重复 Task 或无法唯一解析时立即 blocked，不继续执行。
5. `agent_end` 和 `after_tool_call` 只写幂等事件；所有 RPC 失败进入 reconcile，不在 hook 中无限重试。

### 2.5 模块能力目录与跨角色转交

1. 建立显式 capability registry，首批登记：
   - 晨报：抬头、天气、空气、衣行、宗门任务、门人近况、日程、黄历/小签；
   - 蕭觀音提醒；
   - 蕭觀音 owner files；
   - 魚玄機受控只读诊断；
   - 通用正式任务入口。
2. `task_module` 根据 registry 返回目标角色、专用工具和必填字段；未知模块只能进入 formal task/needs clarification，禁止口头声称已录入。
3. 蕭觀音直接收到晨报模块输入时，必须调用 `morning_brief_control` 并把工具收据回写 disposition；日程默认同时写晨报 schedule，并按规则创建提前一小时提醒。
4. 賈南風收到模块输入时，通过 `task_handoff` 生成认证 handoff；蕭觀音由 queued injection 收到，并调用目标专用工具应用；`sessions_send` 只作唤醒/表达，不作业务真相。
5. 转交超时、重复、拒绝或 schema 失败均回到同一任务状态，不产生第二条记录。

### 2.6 风险闸门与用户语言

1. 建立动作级风险目录，按工具名 + action + 规范化参数 + 目标范围生成指纹；未知写操作默认高风险，未知读操作默认中风险并限制范围。
2. **低风险**：自动执行并记最小审计，不询问用户。
3. **中风险**：执行前自动做范围、前置、回滚和证据检查；必要时创建内部 review 子步骤；不向用户询问。
4. **高风险**：
   - 第一次命中只阻止副作用，保存一个 pending decision；
   - 角色必须用自然中文一次说清目标、风险、最坏影响、回滚、替代方案和需要用户决定的准确事项；
   - 同一指纹在 pending 期间不重复询问；
   - 用户明确同意后生成一次性、限时、精确指纹授权，参数变化重新评估；
   - 永远不调用原生 `requireApproval`，不向 Telegram 展示 Card/Task/Host/CWD/UUID 等字段。
5. 保持賈南風、蕭觀音无 raw exec；魚玄機 raw exec 的所有副作用都受统一 hook，历史危险 `allow-always` 规则经备份后收窄或移除。
6. Gateway 重载/重启、插件启停和修改全局执行策略一律按高风险处理；本轮任务授权不自动等同于对某个时间点、某个影响范围的重启授权，部署前必须用自然中文只询问一次并获得明确决定。

### 2.7 持久通知 outbox 与防重复

1. 业务终态先写 outbox，再由賈南風账号发送；消息模板按她的角色说清：做了什么、结果、影响、仍未完成/需决定的事项。
2. 状态为 `pending → sending → sent`；发送返回 Telegram message id 后才算 sent。
3. 发送调用超时或结果不明进入 `unknown`，不自动重发；通过日志/人工确认后 resolve。
4. `message_sending/message_sent` 以 inbound event/run/route/content hash 做同轮去重，抑制同一答复连续发送两遍；新用户消息或明确再次发送不受影响。
5. 禁止 `NO_REPLY`、`ANNOUNCE_SKIP`、推理、工具计划、英文内部状态和工业字段进入用户正文。

## 3. 遗留状态迁移与阻塞清理

1. 变更前生成只读快照和哈希：配置、exec approvals、插件目录、Cron、Tasks audit、Task Flow、42 张卡、通知订阅/outbox、三角色绑定与相关会话索引。
2. 42 张卡逐一分类，不删除历史：
   - 真实完成且证据满足：纠正终态并标记 migrated；
   - 旧验收/故障注入卡：归档并保留证据；
   - 被本轮取代的旧修复卡：标明 superseded，并链接本轮任务；
   - 仍有真实未完成业务：迁入新 Flow 或明确 blocked reason/恢复条件。
3. 修复 ready 卡残留的 running execution/attempt 自锁；先核对真实 session/task 是否活动，再关闭遗留 attempt，绝不覆盖活跃执行。
4. 处理 3 条 `delivery_failed`：保留原 Task 事实，把成果定位到原会话/文件；能验证则补一条自然状态说明，不能验证则明确 blocked，不改写成 succeeded。
5. 处理 queued Flow 与分散 owner Flow：保留历史，只把仍需继续的工作迁移到固定 owner；不伪造旧 Flow 完成。
6. 审计所有可能被 Workboard 分配的 worker 角色，不限三名入口角色：每个角色要么具备执行所需工具和受控完成/阻塞路径，要么从自动 assignee 集合移除并明确转交给有能力的 worker；禁止再次出现“卡已领取、worker 没工具”。
7. 新控制器 shadow 验收通过后停用两个一分钟 Cron；保留任务定义和回滚参数，Task 历史按官方保留策略自然清理，不手工批量删除。

## 4. 实施顺序与变更门禁

1. 本地实现插件、schema、迁移器、部署脚本和文档；不接触生产。
2. 运行单元、集成、并发、崩溃恢复、风险矩阵、文案泄漏和重复投递测试。
3. 在生产旁路目录部署 shadow 插件，只读核对入站事件、Task/Workboard 关联和历史迁移预览；不发送、不执行副作用。
4. 备份生产文件并核对哈希；若需要 Gateway 重载/重启，按高风险规则针对准确动作、时间和影响只作一次自然决定确认；没有这项精确决定不得执行。
5. 启用新插件，保留旧两个 Cron 但暂时禁用其下一次执行；进行快速健康检查和回滚检查。
6. 完成真实端到端验收后正式停用旧轮询；若任一核心验收失败，恢复备份与两个 Cron，并把失败留在 blocked，不发完成通知。

## 5. 验收矩阵

### A. 入站与不遗忘

- 分别向賈南風、魚玄機、蕭觀音发送一个普通聊天、一个模块输入、一个正式多阶段任务；
- 普通聊天不误建正式任务；模块输入有专用工具收据；正式任务只有一个 inbox event、一个 Flow、一个业务卡；
- 强制模型不调用 intake 工具，验证 `before_agent_finalize` 补做或 `needs_triage` 兜底，不能静默消失；
- 重放同一 Telegram update 不产生第二份记录。

### B. 蕭觀音全部模块与賈南風转交

- 对晨报 8 个模块逐项做 create/update/cancel/inspect；
- 日程同时进入晨报并生成提前一小时提醒；取消时两处一致撤销；
- 同样输入交给賈南風，验证 handoff 只应用一次、蕭觀音可查询、次日 preview 正确；
- 未知字段或缺少条件必须说明缺什么，不能声称已录入。

### C. 计划与三审闸门

- 以下断言只对 `research_plan_triple_review` 生效；`direct_module` 和 `simple_task` 不得误入三审；
- 少于三次、哈希不同、重复 nonce、审查有发现、计划审后变化，均不能执行；
- 三次独立完整审查通过后才允许 implementation；
- 验收失败时不得进入 documentation/sync/notification。

### D. 执行、并行、依赖与恢复

- 两个不同角色任务并行启动，同角色按明确并发规则排队；
- 父子依赖只有父成功后才推进；child 失败阻塞父；
- worker 不调用 complete、worker timeout、worker error、Gateway 中途重启分别正确收口；
- 取消、重试、重复 hook、RPC 短暂失败不制造第二个 worker 或第二张卡。
- 每个正式任务恰有一个 managed 父 Flow；每个 detached worker 恰有一个真实 Task 和一个官方 mirrored 子 Flow；同一 runId 不得出现 controller 复制的第二条 Task。
- 对所有启用的自动 assignee 逐一验证工具面；缺少工具的角色不得被自动领取，转交后仍能正确执行和收口。

### E. 空转与状态一致性

- 空闲至少 30 分钟：旧两个 Cron 无运行，新 Task 增量为 0，ready 卡 dispatchCount 不变化；
- Workboard、Flow、Task、worker session 四处终态一致；
- `openclaw tasks audit` 不再新增 delivery_failed/stale/lost；历史 3 条有明确迁移记录。

### F. 风险与权限体验

- 低风险只读自动完成；
- 中风险可回滚写入自动完成并有内部检查；
- 高风险副作用被拦截，只收到一条角色化完整说明；重复尝试不重复询问；同意后只放行原指纹一次；
- Telegram 全程不出现原生审批卡、Card/Task/Host/CWD/UUID/session/claim/heartbeat 字段；
- 三角色 agentId/account/binding 前后完全一致。

### G. 通知与晨报回归

- completed、failed、blocked、cancelled、stale、unknown 各一条自然中文；
- 同轮重复答复只发一次，真实再次发送仍可用；
- Telegram 收到真实 message id，超时不盲目重发；
- 晨间玉简保持已确认华丽版式和完整模块，输入变更出现在 preview；生产定时发送幂等不重复。

### H. 回滚

- 在测试环境和生产各执行一次无损回滚演练；
- 回滚后 Gateway、Telegram、晨报和旧任务读取正常；
- 新状态文件保留为证据，不删除、不继续驱动副作用。

## 6. 文档、GitHub 与最终回禀

1. 验收通过后更新 SourceIndex、QuickBrief、CurrentProgress、工作流设计、角色工具说明、插件 README、部署/回滚/验收报告和事故经验。
2. 所有“已完成”必须附生产证据时间、测试结果、Telegram message id、配置/文件哈希及剩余上游限制；禁止把条件不足写成完成。
3. 运行格式、测试、`git diff --check`、敏感信息扫描；提交到当前隔离分支并推送 GitHub，创建/更新草稿 PR。
4. 全部同步成功后，由賈南風 Telegram 发送一次最终通知；只有取得真实 message id 才算本任务结束。

## 7. 明确不做与条件不足处理

- 不改三个角色名称、agentId、Telegram account 或绑定；
- 不以升级 OpenClaw 核心作为本轮前提；#115063 的发行缺口以插件兜底并在报告中保留，不伪称上游已修；
- 不删除历史 Task、卡片、对话或投递证据；
- 不对 Telegram `unknown` 投递自动重发；
- 不把本轮大型工程的资料收集、三审、文档同步要求默认套用到所有未来任务；工作流必须按明确 profile 执行；
- 若官方生产接口无法实现某一验收项，必须提供实测证据、影响、替代方案和恢复条件，单独列入未完成清单，不能降低目标后宣布通过。
