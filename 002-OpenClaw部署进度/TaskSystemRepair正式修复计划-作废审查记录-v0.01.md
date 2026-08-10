# OpenClaw 全任务系统正式修复计划：作废审查记录 v0.01

## 作废审查 A

- 审查对象初始哈希：`802e62b4356b0448c62a482f23e2ce7c33d0b31a71117f350698e1c909dd9c85`
- 审查类型：独立完整审查
- 结果：不通过，审查计数作废

### 阻断发现

1. 初稿把 `message_received` 当成“先落盘、再处理”的权威时序点，但官方说明明确 observation-only handler 可以并行或 fire-and-forget，不能保证先于 agent run 完成。
2. 初稿没有固定生产插件调用 Workboard Gateway RPC 的可部署路径；生产 API 未承诺插件可直接调用另一插件 method。
3. 初稿只强调三名入口角色，没有把 coder/reviewer 等可能的自动 assignee 纳入工具面验收，可能重现 worker 已领取但缺少完成工具。
4. 初稿对 Gateway 重启已有授权的描述有歧义，不符合“高风险只询问一次、但必须是准确决定”的规则。

### 修正

- 用可等待、可阻断的 `before_agent_run` 完成权威 inbox upsert；`message_received` 只作路由线索；
- 固定为无 shell 拼接的 OpenClaw CLI Gateway RPC 适配器；
- 增加全部自动 assignee 的工具面审计与验收；
- 明确部署重启必须取得针对准确动作、时间和影响的一次自然决定。

计划发生实质变化，后续三次正式审查必须对新哈希从第 1 次重新开始；本记录不计入三次通过数。

## 作废审查 B

- 审查对象哈希：`b3b9796b0a2a8d8a98ac6d5b9490d3766fb28a83ed59b365c9556bff62ba6e2a`
- 审查类型：独立完整审查
- 结果：不通过；此前针对同一哈希的正式审查 1 通过结论同时作废

### 阻断发现

计划把计划、三审、文档与同步写成所有正式任务的统一阶段，没有区分普通模块录入、简单任务、一般工程变更和用户明确要求三审的大型工程。若照此实施，普通提醒或简单查询也会进入三次审查，偏离原设计的按任务性质、风险和复杂度选择工作流。

### 修正

- 增加 `direct_module`、`simple_task`、`governed_change`、`research_plan_triple_review` 四种明确 profile；
- 当前修复固定为 `research_plan_triple_review`；
- 三审闸门只对该 profile 生效；
- 模块录入以专用工具收据为真相，不创建空 Flow；
- 简单任务仍需验收，但不强行套用大型工程文档流程。

计划再次发生实质变化，所有正式审查计数归零，必须对新哈希重新完成三次独立完整审查。

## 作废审查 C

- 审查对象哈希：`bee62b1c12537877314c610994eff44d2d90f1b2a6846cec054749b3616e2fd0`
- 审查类型：独立完整审查
- 结果：不通过；该哈希下正式审查 1 的通过结论作废

### 阻断发现

1. 生产 `PluginRuntime` 类型已经明确提供 `api.runtime.gateway.request(...)`，原稿却使用 CLI 子进程回调同一 Gateway，平白引入启动竞态、额外进程、解析和超时故障面。
2. Workboard 的 `subagent.run` 会自动创建真实 Task 与 `task_mirrored` Flow，且生产 `SubagentRunParams` 没有 `parentFlowId`。若 controller 再对 managed Flow 调用 `runTask`，会因 owner/parent 维度不同创建第二条 Task，而不是可靠收养原 Task。

### 修正

- controller 改为生产官方 in-process Gateway request；
- 保留一个 managed 父 Flow；把 OpenClaw 自动产生的真实 Task/mirrored 子 Flow 作为执行账本，通过 link record 关联；
- 禁止为同一 run 复制 Task；父 Flow 的 readiness 由真实 Task/mirrored Flow 与 Workboard proof 联合计算；
- 验收增加同一 runId 唯一 Task 与父/子 Flow 拓扑断言。

计划发生实质变化，所有正式审查计数再次归零。
