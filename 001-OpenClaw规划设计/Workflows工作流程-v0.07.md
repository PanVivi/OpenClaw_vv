# 001 OpenClaw架设部署｜Workflows 工作流程｜v0.07

## 一、共同规则

- 正式任务由 housekeeper 维护 Task Owner、Active Handler 和 Assignment Generation。
- 每次 Active Handler 变化递增 Generation，接收方确认后才取得副作用权限。
- Stage Record 记录 reviewer 对特定输入哈希的审查事实。
- Gate Record 是一次性指定下一跳凭证；正常指定交接消费 Gate，不会因预期 Generation 递增自我失效。
- 任何材料、命令、配置、权限、环境变化，错误目标、重复使用、取消、过期或非预期改派使 Gate stale。

## 二、标准工程任务

### 1. 任务登记与方案

```text
薇提出目标
→ housekeeper 建立 Task ID、范围、授权、完成标准和 ops 调查 Generation
→ ops 确认处理权，完成只读调查并形成方案哈希
→ housekeeper 转交 reviewer 新 Generation
→ reviewer.Review 方案，写 Stage Record
→ 通过时生成只允许 coder 的一次性 Review Gate
```

### 2. 代码或脚本轨

```text
housekeeper 创建 Gate 指定 coder Generation
→ coder 确认并消费 Review Gate
→ coder 在隔离 workspace 实现和测试
→ coder 交付产物哈希
→ housekeeper 创建 ops 核对 Generation
→ ops 对照方案核对
→ reviewer.Review 当前产物哈希
```

- 只交付：产物 Review 通过后停止，housekeeper 汇总。
- 返工：方案不变时，依据原方案 Stage Record 与当前失败 Stage Record建立新 coder Generation；不得复用已消费 Gate。
- 方案变化：退 ops，重新方案 Review并生成新 Gate。

### 3. 简单命令轨或代码执行阶段

```text
ops 形成固定执行包：命令/配置/权限/环境/备份/回滚/验证哈希
→ reviewer.Risk 写 Stage Record
→ 通过时生成只允许 ops 的一次性 Risk Gate
→ housekeeper 按风险边界决定推进或上报
→ task controller 创建 Gate 指定 ops 执行 Generation
→ ops 确认并消费 Risk Gate
→ ops 执行、自检、记录证据和回收权限
→ reviewer.Test 绑定实际部署版本与证据集
→ housekeeper 汇总
```

Test 不生成生产执行 Gate。

## 三、失败路由

- 方案问题：退 ops，新 Generation、新方案哈希、重新 Review。
- 代码问题：方案不变则新 coder 返工 Generation；方案变化则先退 ops。
- 部署问题：退 ops 形成新执行包，重新 Risk 和 Test。
- 需求不清：housekeeper 结合上下文澄清；关键目标无法判断才询问薇。
- 五次打回或 Test 五次失败：熔断，housekeeper 重新规划。

## 四、直接联系专业 Agent

少主可直接联系任意 Agent。简单、单一、无现实副作用且不跨 Agent 的事项可直接完成。仓库写入、真实测试、生产操作、长期或跨 Agent 请求必须登记 Task ID，并按上述流程门控。

## 五、生活流程

```text
薇或 housekeeper 提出生活需求
→ life 创建或查询唯一 Automation ID / Task ID
→ life 直接处理或协调 companion
→ 持久化计划、occurrence、投递状态和失败信息
→ life 返回或主动投递
→ 跨分支影响时通知 housekeeper
```

life 是生活提醒、个人日程、周期生活任务、晨间消息和 companion 日常消息的唯一执行所有者。housekeeper 不创建副本。

提醒处理 IANA 时区、DST、misfire、grace window、幂等 occurrence、有限退避重试、失败通知和重启恢复。暂停、恢复、修改、取消或所有权变化递增 Automation Generation 并撤销旧计划。

## 六、Companion

三位 companion 可同时独立运行。life 负责日常协调和最小上下文；少主可直接联系。housekeeper 只有少主直接要求时才直达指定 companion。companion 不进入工程流程。

## 七、取消、恢复和降级

取消或撤权后停止未开始步骤；旧处理权和未消费 Gate stale；在途操作先核对。依赖不可用只阻塞受影响分支。恢复时核对任务记录、最新 Generation、Gate/Stage、输入哈希、自动化 occurrence 和实际状态。

## 八、验收原则

允许能力和禁止能力都要真实测试，包括 Gate 单次消费、重复/错误目标拒绝、材料变化失效、旧处理权拒绝、返工不复用、Test 无执行 Gate、自动化去重和重启恢复。未通过不得标记完整部署。
