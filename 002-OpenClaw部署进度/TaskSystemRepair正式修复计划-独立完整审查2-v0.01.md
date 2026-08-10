# OpenClaw 全任务系统正式修复计划：独立完整审查 2 v0.01

> 冻结计划 SHA-256：`e11d58a41ceae6d5d459f3f156fef5ef241f3e99034536139496a993b9aa2921`
> 审查 nonce：`TSR-R2-20260809-d72b460f`
> 性质：第二次独立完整审查；不引用审查 1 的判断

## 1. 审查重建

从原始要求与证据重新建立审查清单：原设计架构、三角色全量任务对话、生产身份/权限/插件/任务/卡片/Cron、生产 hook 与 runtime types、Workboard dispatch 与 lifecycle 源码、官方文档、GitHub 缺陷和社区实践。然后独立追踪计划的每个阶段与验收，不把前次“通过”作为证据。

## 2. 需求和边界完整审查

1. 资料收集发生在计划之前，且明确区分当前 main 与生产 2026.7.1-2；通过。
2. 本轮固定为 `research_plan_triple_review`，三次审查哈希相同、完整、相互不借结论；通过。
3. 普通聊天、模块录入、简单任务、一般变更不会被误套本轮大型流程；通过。
4. agentId/account/binding 均是不可变验收项，没有任何改名推测；通过。
5. 入口覆盖賈南風、魚玄機、蕭觀音，执行工具面覆盖所有可能自动 assignee；通过。
6. 晨报八模块、日程/提前提醒、賈南風转交和蕭觀音收据均有 E2E；通过。
7. 低风险自动、中风险内部核查、高风险精确询问一次且不使用原生卡片；通过。
8. 修复后才验收、验收后才文档/GitHub、全部成功后才由賈南風通知；通过。

## 3. 数据模型与拓扑完整审查

| 实体 | 唯一性/权威性 | 复核 |
|---|---|---|
| inbox event | provider event key；弱标识需 transcript 对账 | 可去重、可恢复 |
| module receipt | 专用工具成功结果 | 不以角色口头承诺替代 |
| managed parent Flow | 每个跨轮正式任务一个 | 保存 workflow profile 与阶段 |
| Workboard card | 每个业务任务一个，幂等键查找 | 保存授权、依赖、证据与可见投影 |
| real Task + mirrored Flow | 每个 detached run 由 OpenClaw 自动产生 | 不再复制 shadow Task |
| link record | 连接上述实体与 run/session | 父 readiness 有真实依据 |
| risk decision | task/origin/action fingerprint 唯一 | 一次、限时、参数不漂移 |
| outbox item | terminal event/route 唯一 | message id 后才 sent |

该拓扑接受官方 mirrored Flow 的存在，同时保留唯一 managed 父 Flow，不再错误追求“全系统只能一条 Flow”。父状态不依赖无法看到外部 child 的 `getTaskSummary(parent)`，改由 link record 中真实 Task/mirrored Flow 与 proof 计算，生产可行。

## 4. 入口、执行与恢复完整审查

- `message_received` 的异步观察限制已被正确处理；权威写在 `before_agent_run`；
- 持久写失败会阻止无记录执行，模型忘记分流有 finalize 补做和 triage 兜底；
- `api.runtime.gateway.request` 是生产明确支持的同进程 RPC，避免 CLI 自调用；
- dispatch 只在状态 revision 变化、依赖完成、恢复或启动 reconcile 时触发；
- worker 工具活动更新活性，worker 结束由 receipt + hook + proof 收敛；
- 无工具、无收据、超时、失败、kill、reset 不能进入成功；
- RPC/Hook 重复和乱序不新建第二张卡、第二个 worker 或第二条 Task；
- Gateway 崩溃在 inbox/card/link/outbox 任一步发生，都有 pending/reconcile 状态，不依赖角色记忆恢复。

执行链闭合，且没有一分钟 Agent/Cron 轮询替代事件链。

## 5. 风险与对外表达完整审查

重新以三类样例推演：

- 只读状态核对：低风险，自动执行，只留最小审计；
- 限定范围、可回滚的模块配置写入：中风险，先做范围/备份/回滚检查，自动执行，不问用户；
- Gateway 重启、全局执行策略变化或未知副作用写：高风险，第一次阻止，角色一次讲清目标、最坏影响、回滚、替代与准确决定；重复指纹不再问；明确同意后仅放行该指纹一次。

賈南風和蕭觀音保持无 raw exec；魚玄機旧审批规则先备份再收窄。计划没有调用 `requireApproval`，也没有让 task/card/session/host/cwd/uuid 等进入 Telegram。表达测试同时要求信息完整，避免“为了简单”只说一句含混状态。

## 6. 历史迁移与无损性完整审查

- 配置、审批、插件、Cron、Tasks、Flow、42 卡、通知状态、绑定和会话索引全部先快照/哈希；
- 4 ready 自锁卡先对照真实 task/session 活动，不凭卡面清 running；
- 12 blocked 逐张区分历史测试、superseded 和真实未完成；
- 3 delivery_failed 保留原状态，只补验证结果，不篡改；
- 62 Flow 中历史保持原 owner，只有仍需继续者迁入新 managed parent；
- 21,284 Task 不批量删除；停轮询后按官方保留策略自然清理；
- 旧 Cron 只在 shadow/E2E 后停用，定义和回滚参数保留。

迁移不会删证据、伪造旧成功或覆盖活任务。

## 7. 验收、回滚和交付完整审查

验收既有功能断言，也有运行事实：三个入口、八模块、跨角色、三审闸门、并行/依赖、全 assignee、缺收据、故障/重启/重复、风险三档、通知六终态、晨报版式与数据、真实 Telegram message id、30 分钟零 Task 增量、dispatchCount 稳定、生产回滚演练。任一核心项失败都回滚并列为 blocked，不能降低标准。

文档和 GitHub 只能在上述通过后更新；秘密扫描与 diff/test 是同步门禁；最终通知由賈南風账号发送并取得 message id。交付顺序完整。

## 8. 结论

- 阻断发现：0
- 非阻断发现：0
- 计划修改：否
- 审查结论：通过（2/3）

计划哈希复核不变；仍须完成第 3 次独立完整审查才可实施。
