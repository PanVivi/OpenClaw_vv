---
name: workflow-execution
description: "Run multi-step OpenClaw repair and delivery work with research, one immutable plan, three independent complete reviews, deterministic execution gates, acceptance, documentation, sync, and one natural owner notification."
metadata: { "openclaw": { "emoji": "⚖️" } }
---

# 可恢复工作流执行

这个技能用于会跨越多个步骤、会修改状态或需要验收与通知的正式任务。它不依赖角色自己记住进度；使用官方 Task Flow 和 `workflow_governance` 工具保存状态与闸门。

## 什么时候必须用

- 用户要求“先调研、出计划、审查、修复、验收、整理文档、同步、通知”的任务。
- 任务可能跨会话、跨重启、跨 Agent 或包含生产变更。
- 完成声称需要真实证据，不能以“已写配置/已改角色卡”代替。

## 权威状态

1. 正式执行状态放在官方 Task Flow。
2. `workflow_governance` 把计划哈希、三次审查、验收证据和最终通知放在该 flow 的 `stateJson/waitJson`。
3. Workboard 只能投影这个事实，不能反向覆盖 Task Flow。
4. Telegram 回复不是任务状态库；“已送达”不等于“已开始”，“已开始”不等于“已完成”。

## 固定顺序

### 1. 接单与资料收集

- 用 `workflow_governance create` 建立受管 Task Flow，写入原始目标和可验收的完成条件。
- 先读当前生效配置、日志、代码、官方文档和相关讨论；时效性强的信息必须现查。
- 先查现有资料再判定缺少输入，不重复向用户索要已给出的内容，不推测 Agent 身份或改名。

### 2. 正式计划

- 计划必须包含：范围、不做什么、变更顺序、隐私/安全边界、回滚、真实验收、文档/同步、不能完成项。
- 计算整份最终计划的 SHA-256，用 `set_plan` 绑定。
- 任何字句变更都会产生新哈希；只要哈希改变，之前审查全部作废。

### 3. 三次独立完整审查

三次都要对同一份、同一 SHA-256 的计划从头到尾审查，每次覆盖全部目标、资料依据、步骤、风险、回滚、验收、文档、同步和通知。

- 不得把三次拆成“不同角度”。
- 每次从空白审查清单开始，不引用上一次的“通过”代替本次检查。
- 发现任何缺口：停止本轮，修改计划，产生新哈希，然后从审查一重新开始。
- 只有 `review_number=1/2/3`、`scope=independent_complete`、同一计划哈希、无遗留发现且有独立证据哈希的三条记录才能开启执行。

### 4. 执行与风险

- 低风险：自动执行并验证。
- 中风险：不向用户逐条索权；执行前内部检查目标、范围、备份/回滚和验证方法，然后执行。
- 高风险：只集中询问一次。面向用户的决策必须用角色化自然中文说清目标、风险、影响/最坏情况、回滚、替代方案和本次精确决定。
- 禁止向用户抛出 Card、Task、Host、CWD、UUID、命令原文或等待队列等工业字段，除非用户明确要求技术细节。
- 优先用 `ops_controlled_exec` 做常用只读运维检查，避免为查状态拼接任意 shell。

### 5. 验收

- 按计划的每一条完成条件给出证据：实际日志、时间、状态、输出、反例和同键重跑。
- 需要外部投递的功能必须做一次真实端到端验收；只有真实 message ID/对端收到证据才能说投递成功。
- 结果不明时先停住重试并核对，不得因为超时就自动再发。

### 6. 文档、同步与最终通知

- 验收全部通过后才更新设计、实施、进度、回滚、验收和未完成项文档。
- 同步 GitHub 前执行秘密扫描、`git diff --check`和目标测试；不把生产配置、聊天号、个人资料和密钥写入 Git。
- 使用 `ready_to_notify` 进入唯一通知等待状态。通知成功并得到真实 message ID 后，才能 `acknowledge_notification` 并完成 flow。
- 通知不得重复；稳定事件键为 `workflow:<flowId>:<planHash>:completion`。

## 面向用户的说法

先说结果、真实影响和下一步。把内部状态翻译为“已接下、正在查、计划已完成三次完整复核、正在修复、验收通过、还缺什么”。保留必要的原因和恢复条件，不要过度省略。

