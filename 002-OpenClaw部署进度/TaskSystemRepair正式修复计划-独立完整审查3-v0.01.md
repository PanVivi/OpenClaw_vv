# OpenClaw 全任务系统正式修复计划：独立完整审查 3 v0.01

> 冻结计划 SHA-256：`e11d58a41ceae6d5d459f3f156fef5ef241f3e99034536139496a993b9aa2921`
> 审查 nonce：`TSR-R3-20260809-b04c7f29`
> 性质：第三次独立完整审查；从原始要求和证据重新审起，不采信前两次结论

## 1. 审查输入重新核验

本次重新以用户原始要求为最高约束，逐项对照：仓库最新设计与版本索引；賈南風、魚玄機、蕭觀音任务相关 Telegram 全量记录；生产 2026.7.1-2 的身份绑定、工具权限、审批、Cron、Tasks、Task Flow、Workboard、插件与通知事实；生产安装包内 hook/runtime/Workboard 源码；OpenClaw 官方 Hooks、Tasks、Task Flow、Workboard、Standing Orders；GitHub 当前源码、相关 issues 与社群事故经验。覆盖入站、分流、持久状态、执行、模块写入、角色转交、风险、语言、迁移、恢复、通知、验收、回滚、文档和最终 Telegram 回禀。

资料与计划的先后关系成立，计划没有把尚未进入生产版本的 GitHub main 行为误当成生产能力。

## 2. 原始要求完整追踪

| 原始要求 | 计划中的可执行约束 | 审查结果 |
|---|---|---|
| 依据原设计修复整个任务系统 | inbox、profile、managed Flow、Workboard、真实 Task、worker、receipt、outbox 全链重建 | 通过 |
| 不猜改名 | `ops/default`、`housekeeper/housekeeper`、`life/life` 绑定作为不可变断言 | 通过 |
| 三次独立完整审查 | 同一冻结哈希、独立 nonce、任何修改清零重审 | 通过 |
| 蕭觀音能录入晨报全部模块 | 八模块 capability registry、专用写入工具、应用收据与晨报消费 E2E | 通过 |
| 賈南風可转交给蕭觀音 | 认证来源、结构化 handoff、去重、接收与应用收据 | 通过 |
| 角色不会忘记工作流 | hook 和持久状态强制流程，角色文件只负责表达而非执行保证 | 通过 |
| 仅高风险询问一次 | 动作指纹、一次自然中文决定；低风险自动，中风险内部检查 | 通过 |
| 永不展示工业卡片 | 不使用原生 approval 卡；用户消息有角色化完整说明与泄漏断言 | 通过 |
| 先修复验收，再文档同步，最后通知 | 生产 E2E、回滚演练、文档/GitHub、真实 Telegram message id 顺序锁定 | 通过 |

没有把“本轮大型修复需三审”错误推广为所有简单提醒或模块录入的日常流程。

## 3. 接口、权限与拓扑可实现性

1. `before_agent_run` 在生产类型中包含 prompt、account/channel/sender 身份并允许同步 gate；用作权威入站 upsert，能在模型处理前落盘。`message_received` 仅观察关联，不承担顺序保证。
2. 生产 runtime 提供 `gateway.request` 与 `flow.bindSession`；方案使用同进程 RPC，不依赖 shell/CLI 自调用，也不赋予賈南風或蕭觀音 raw exec。
3. Workboard detached execution 会自动创建真实 Task 和 `task_mirrored` Flow；计划明确复用这两项，并禁止额外 `runTask`，不会制造双 Task。
4. managed 父 Flow、业务卡、真实 Task、mirrored Flow、run/session 通过 link record 关联。父流程完成条件读取真实终态和 proof，不假定外部 Task 是父 Flow 原生 child。
5. `subagent_ended` 负责终态信号，`after_tool_call` 负责活动与专用收据；角色文本不能直接把任务置为成功。
6. 所有自动 assignee 都先经过 capability/risk 校验；缺工具、缺身份、缺收据或关联不唯一均阻断并说明，而不是扩大权限。

生产接口、权限边界和实体拓扑互相一致，没有发现计划依赖不存在的 hook 或参数。

## 4. 状态机与并发故障演绎

从以下断点分别推演恢复：入站刚收到、inbox 已写但 profile 未选、父 Flow 已建但 card 未建、card 已建但 RPC 超时、真实 Task 已生但 link 未补、worker 结束但 receipt 未到、terminal 已定但 Telegram 返回不明、Gateway 在 lease 中重启。每一处都有 pending/reconcile/unknown 或 blocked 状态，并以事件 id、revision、幂等键、锁和 transcript/Task 对账收敛。

- 相同 Telegram 更新重复到达，不会新建第二项 inbox 或第二张卡；
- RPC timeout 后先查 card/run/Task，再决定补链，不盲目重发；
- 同一 runId 只能绑定一个真实 Task，歧义时停止；
- worker 退出而没有正式完成收据不能成功；
- 依赖未完成、owner 已有真实 active run、风险未决时不能 dispatch；
- 终态通知由 outbox 唯一键去重，只有真实 Telegram message id 才标记 sent；unknown 不自动重复轰炸；
- 内部恢复服务只处理持久 pending/lease/outbox，不制造每分钟 Cron、Agent 或 Task。

未发现提前完成、重复派工、失败转成功、消息重复或重启后失忆的未闭合路径。

## 5. 业务模块与跨角色链路完整审查

八个晨报模块均要求“识别意图 → 结构化校验 → 专用工具写入 → applied receipt → 晨报读取同一权威数据”，涵盖日期/农历小签、天气、空气质量、衣行、今日要事、门下近况、日程提醒、宗门运行/在线状态。日程明确包含提前一小时提醒和变更/取消。蕭觀音直收与賈南風转交使用同一模块合同，不会分别写两套数据。

普通任务则依据 profile 进入 direct、simple、governed 或本轮 research-plan-triple-review；跨轮正式任务只有一个 managed 父 Flow。该划分既覆盖完整治理，又不让日常输入被大型任务流程拖住。

## 6. 风险、隐私和角色语言完整审查

- 低风险读取、查询与限定录入自动执行；
- 中风险可回滚变更先内部核对范围、备份和回滚再执行，不向用户索要许可；
- 高风险按 task/origin/action/target/参数生成精确指纹，只询问一次；参数漂移产生新决定，不继承笼统授权；
- Gateway 重启、全局策略变化、公开暴露或不可逆动作必须单独取得准确决定，本轮总体指令不替代该决定；
- 不调用 `requireApproval` 生成工业卡片；对外用对应角色的自然中文讲清目标、影响、最坏情况、回滚、替代和要用户决定的准确事项；
- 内部 card/task/host/cwd/uuid、控制词、工具计划和推理不泄漏，但错误原因、已做事项、影响和下一步保留足够信息。

身份验证只接受宿主提供的 owner Telegram 元数据；持久化先保存最小事件引用和哈希，结构化后仅保留任务必要字段。风险与隐私边界符合原设计。

## 7. 迁移、验收、回滚与交付完整审查

迁移前快照配置、审批、插件、Cron、Tasks、Flow、42 张卡、通知和身份绑定。4 张 ready 自锁卡必须先核实真实 run/session，再关闭陈旧 execution；12 张 blocked 与历史测试逐项分类；62 Flow、21,284 Task 和 3 条 delivery_failed 保留证据，不批量删除或改写旧结果。新链路 shadow 和真实 E2E 通过后才停两个分钟 Cron，定义与参数保留以便回滚。

验收矩阵覆盖：三角色入口、八模块和晨报消费、賈南風转交、四 profile、三审闸门、并行与依赖、所有 assignee、缺工具/缺收据、重复/乱序/RPC 超时/Gateway 重启、低中高风险、通知六终态、身份不变、版式与真实数据、30 分钟空闲 Task 零增量及 dispatchCount 不变、回滚恢复。任一核心断言失败即回滚或 blocked，不以文档/配置存在替代真实行为。

只有验收通过后才能更新索引、设计、进度、插件、部署、验收与事故文档，并在测试、diff 检查和秘密扫描后同步 GitHub。全部成功后由賈南風账号发送最终 Telegram 通知，取得真实 message id 方可结束。

## 8. 结论

- 阻断发现：0
- 非阻断发现：0
- 计划修改：否
- 审查结论：通过（3/3）

三次有效审查均针对同一冻结计划哈希。审查闸门已满足，可以进入实现；实现不得擅自降低计划目标，若架构性修改冻结计划则三次审查全部重新开始。
