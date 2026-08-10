# OpenClaw 全任务系统正式修复计划：独立完整审查 1 v0.01

> 冻结计划 SHA-256：`e11d58a41ceae6d5d459f3f156fef5ef241f3e99034536139496a993b9aa2921`
> 审查 nonce：`TSR-R1-20260809-6a9e31d4`
> 性质：第一次独立完整审查

## 1. 输入与范围完整性

重新读取并核对：用户全部要求；项目最新总设计、工作流、进度、角色卡、插件与事故文档；三角色任务相关 Telegram 全量审计；生产配置、审批、Cron、Tasks、Flow、Workboard、插件、hook 与运行源码；官方 hooks/Tasks/Task Flow/Workboard/Standing Orders；GitHub 源码/issues；社群实践。审查覆盖入口、分流、状态、执行、转交、风险、通知、迁移、回滚、验收、文档和最终回禀，不沿用作废审查结论。

## 2. 用户要求逐项追踪

| 要求 | 计划落点 | 结果 |
|---|---|---|
| 资料完整收集后再定计划 | 已冻结问题基线；计划能力均有官方/生产证据 | 通过 |
| 同一计划三次独立完整审查 | hash/revision/nonce 闸门；每次相同完整范围 | 通过 |
| 不改名 | 身份和绑定是负向约束与 E2E 断言 | 通过 |
| 修整个任务系统 | inbox/profile/Flow/Workboard/worker/outbox/risk/migration 全覆盖 | 通过 |
| 蕭觀音处理所有晨报模块输入 | 8 模块 registry、专用工具收据、日程提醒联动 | 通过 |
| 賈南風转交 | 持久 handoff、认证来源、去重与应用收据 | 通过 |
| 低自动、中内部、高只问一次 | 动作风险目录、preflight、精确指纹一次授权 | 通过 |
| 不弹工业卡片、语言符合角色 | 不用原生 approval，完整自然中文与负向泄漏测试 | 通过 |
| 修复、验收、文档、同步、Telegram | 顺序和闸门均明确，真实 message id 才完成 | 通过 |

## 3. 架构与生产可行性完整复核

| 子系统 | 复核结果 |
|---|---|
| 入站 | `before_agent_run` 同步 upsert 是权威点；观察型 `message_received` 只供关联，时序成立 |
| 幂等 | provider id 优先，弱标识降级并待 transcript 对账；route/account/chat 隔离充分 |
| 工作流选择 | 四种 profile 避免把本轮三审强加给提醒或简单任务 |
| 持久化 | 原子写、revision、event id、锁、大小上限、恢复/隔离覆盖并发崩溃 |
| Task Flow | 生产确有 `bindSession`；一个 managed 父 Flow 保留原 requesterOrigin |
| 执行账本 | Workboard detached run 的真实 Task/mirrored Flow 保留为官方账本；禁止 `runTask` 复制记录 |
| Gateway RPC | 生产确有 `api.runtime.gateway.request`；无需 CLI 自回调 |
| worker | spawned/活动/ended 与正式完成收据联合收口；缺工具和缺收据均 blocked |
| 模块 | registry 只选路，专用工具真正写入，`after_tool_call` 收据才 applied |
| 通知 | 持久 outbox、真实 message id、unknown 不盲重发、同轮去重 |
| 空转 | Gateway 内部补偿服务只处理 pending/lease，不制造 Cron/Task |

没有使用生产不存在的 `subagent_progress`、`cron_reconciled` 或 current-main 恢复补丁。

## 4. 状态机、一致性与失败模式完整复核

- inbox、handoff、risk decision、outbox 均有有限状态、revision 与唯一事件；
- managed 父 Flow、业务卡、真实 Task、mirrored 子 Flow、run/session 由 link record 连接；
- 同一 runId 唯一 Task；无法唯一解析即 blocked，不继续；
- 卡片创建成功而 Flow/link 失败、Flow 成功而 RPC 失败均进入 `reconcile_required`，不重复建实体；
- worker 正常退出但没有 complete receipt 进入 protocol violation；失败、超时、kill、reset 都有明确终态；
- hook 重复、乱序和 RPC timeout 由幂等键/revision 收敛；
- Gateway 重启从 pending/lease/outbox 恢复；发送不明进入 unknown。

逐步演绎未发现“角色说完成即成功”、父任务提前 done、同一 worker 重复启动或失败被覆盖为成功的路径。

## 5. 安全、权限、隐私与语言完整复核

- 只接受 host 证明的 owner Telegram requester；缺失身份不放宽；
- 初始 inbox 保存最小引用与哈希，结构化 disposition 后才留必要任务字段；
- in-process Gateway RPC 无 shell 注入和凭据输出面；
- 賈南風/蕭觀音无 raw exec；魚玄機副作用统一过风险 hook；全部自动 assignee 先审工具面；
- 高风险重启必须另有针对准确动作、时间和影响的一次决定，本轮概括授权不可替代；
- 用户正文禁止内部状态、控制词、工业字段、推理和工具计划，但失败原因/影响/下一步不得过分省略。

风险分级与用户体验符合原设计。

## 6. 迁移、回滚与验收完整复核

- 42 卡、62 Flow、21,284 Task、3 delivery_failed 均保留并分类；
- 4 张 ready 自锁卡先查真实运行，再关闭旧 execution/attempt，避免伤活任务；
- 测试卡归档、旧修复 superseded、真实业务迁移或 blocked，不删历史；
- shadow、备份、精确高风险决定、启用、E2E、停旧 Cron 的顺序可逆；
- 验收覆盖三入口、8 模块、转交、并行/依赖、全 assignee、缺收据、重启、重放、风险三档、通知六终态、晨报和回滚；
- 空闲 30 分钟 Task 零增量与 dispatchCount 不变可证明两个分钟轮询真正退出；
- 生产失败即回滚并 blocked，不降目标宣布通过。

## 7. 文档与最终交付完整复核

只有生产 E2E 通过后才更新索引、设计、进度、角色工具、插件、部署/验收/事故文档；同步前有测试、diff、秘密扫描；最终賈南風通知需真实 Telegram message id。顺序无倒置。

## 8. 结论

- 阻断发现：0
- 非阻断发现：0
- 计划修改：否
- 审查结论：通过（1/3）

计划哈希保持不变，尚不得实施。
