# 001 OpenClaw架设部署｜Workflows 工作流程｜v0.03

本文件记录 v2.1 精简结构下的任务流程。`v0.03` 明确标准受管入口与直接联系，恢复 ops 工程主线，区分技术自检与独立验收，并区分常驻 Agent 通信与临时子 Agent。

## 1. 入口模式

### 1.1 标准受管任务入口

正式工程、跨 Agent、长期、高风险以及需要审批或最终验收的任务，默认采用：

```text
薇
→ housekeeper 整理目标、范围、优先级和节奏
→ ops 主持工程主线，或 life 主持生活主线
→ coder 按需实现
→ reviewer 执行 Review / Risk / Test
→ housekeeper 汇总
→ 薇
```

housekeeper 负责分类、调度、审批转呈、冲突处理、长期跟踪和最终汇总，不直接替代专业 Agent。

### 1.2 直接联系模式

薇可以直接联系 `ops`、`coder`、`life` 和任一 `companion`。

- 简单、单一、低风险且无外部副作用的任务，可由当前 Agent 直接完成。
- 涉及多 Agent、正式方案、生产变更、范围扩大、风险审批、长期跟踪或最终验收时，应转交 housekeeper 纳入标准受管流程。
- `reviewer` 默认作为内部审查阶段，不作为普通任务入口。

### 1.3 快速直达任务

普通问答、解释、总结、无工具文本整理、已有结果转述、简单状态汇总等，不强制进入完整 Review / Risk / Test。

涉及工具调用、文件写入、配置修改、外部写操作、部署、生产环境或正式验收时，必须升级为标准受管流程。

## 2. 调试与部署任务

```text
薇提出目标
→ housekeeper 整理范围和优先级
→ ops 调查现状并制定方案
→ reviewer.Review 审查方案
→ 进入简单命令轨或代码/脚本轨
```

### 2.1 简单命令轨

```text
ops 准备命令、备份和回滚
→ reviewer.Risk 评估
  ├─ 低危：按项目规则由 ops 执行
  ├─ 中危：确认备份、回滚和执行条件后放行
  └─ 高危：housekeeper 上报薇决策
→ ops 执行并技术自检
→ reviewer.Test 独立验收
→ housekeeper 汇总
```

### 2.2 代码/脚本轨

```text
ops 制定技术方案和实现边界
→ reviewer.Review 审查方案
→ 必要时由薇批准
→ coder 按方案实现
→ ops 对照方案核对
→ reviewer.Review 审查产物
→ reviewer.Risk 评估执行风险
→ ops 执行并技术自检
→ reviewer.Test 独立验收
→ housekeeper 汇总
```

## 3. 正式代码任务

正式代码任务不能由 housekeeper 收到后直接交给 coder。

```text
薇提出需求
→ housekeeper 整理目标、范围和优先级
→ ops 制定设计方案
→ reviewer.Review 审查方案
→ housekeeper 转呈薇
→ 薇选择通过、修改或不做
```

通过后：

```text
coder 按批准方案实现
→ ops 对照设计逐项核对
→ reviewer.Review 代码审查
→ reviewer.Risk 部署风险评估
→ ops 部署并技术自检
→ reviewer.Test 功能验收
→ housekeeper 汇总
```

coder 主要负责程序代码、Shell/PowerShell 脚本、SQL、配置模板、正则和自动化逻辑。任务摘要、状态汇报、决策选项、普通表格和非技术性结构整理，可由 housekeeper 或当前 Agent 完成。

## 4. 技术自检与独立验收

### ops 技术自检

确认命令是否成功，文件、路径、权限或 hash 是否符合预期，服务和日志是否正常，基础 Smoke Test 是否通过。技术自检不等于最终验收。

### reviewer.Test 独立验收

独立判断是否满足原始目标、证据是否充分、是否存在遗漏，并给出 pass / fail。

| 失败类型 | 处理 |
| --- | --- |
| 方案问题 | 打回 ops 改方案，重新 Review |
| 代码问题 | 打回 coder，重新走 ops 核对和 Review |
| 部署问题 | 打回 ops 重新部署 |
| 需求不清 | housekeeper 向薇澄清 |

ops 不得因自己完成部署和自检就宣布整个任务最终通过。

## 5. 生活与陪伴任务

```text
薇提出生活、健康、娱乐或情绪需求
→ housekeeper 分类，或薇直接联系 life
→ life 处理或选择合适 companion
→ 需要跨 Agent 协调时由 housekeeper 汇总
```

- life 是生活和陪伴分支主控。
- 薇明确指定某位 companion 时，可以直接联系或直接转交。
- companions 只负责聊天和陪伴，不进入工程流程，不读取工程敏感文件，不获得工程执行权限。

## 6. 失败、打回与熔断

| 熔断 | 条件 | 处理 |
| --- | --- | --- |
| Review 熔断 | coder 被 reviewer.Review 连续或累计打回 5 次 | housekeeper 上报薇 |
| Ops 核对熔断 | coder 被 ops 打回 5 次 | housekeeper 上报薇 |
| Test 熔断 | reviewer.Test 连续失败 5 次 | housekeeper 上报薇 |

熔断后不得自动继续。由薇决定调整目标、更换方案、拆分、暂停或终止。

## 7. 常驻 Agent 通信

housekeeper 与已配置的 `ops`、`coder`、`reviewer`、`life` 和 companions 之间的任务发送、状态查询和结果回收，属于常驻 Agent 通信，不等同于创建临时子 Agent。

- 只在白名单内协调常驻 Agent。
- 只取得完成协调所需的有限结果。
- 不得借通信能力获得 shell、生产写入、删除、凭据或敏感数据权限。
- 具体工具名称和配置字段以当前 OpenClaw 版本实际支持为准，不在流程文档中写死未经验证的配置。

## 8. 复杂任务与临时子 Agent

```text
ops/coder 提出拆分方案
→ reviewer.Review 审查
→ ops/coder 创建临时子 Agent
→ 临时子 Agent 并行处理
→ ops/coder 汇总和核验
→ 结果重新走 Review / Risk / Test
→ housekeeper 汇总
```

拆分方案必须说明目标、输入、输出、完成标准、工具与禁止事项、权限、成本、并发和汇总负责人。

- 临时子 Agent 是临时执行单元，不是常驻角色。
- 默认使用隔离上下文；仅在确实依赖当前对话时使用 fork。
- 子 Agent 声称完成不等于父任务完成，主 Agent 必须核验。
- 子 Agent 失败计入对应主 Agent 熔断。
- 不允许用子 Agent 绕过 reviewer 或取得被禁止权限。
- housekeeper 负责监督和最终呈报，默认不创建普通临时子 Agent。

## 9. 任务范围控制

- 一次只推进一个已批准目标或 Change。
- 不得顺手修改无关问题。
- 新发现但不阻塞当前任务的问题，记录为 Observation、Issue 或后续待办。
- 只有确实阻塞当前任务时，才向薇请求扩大范围。
- 范围、方案、命令、目标文件、执行环境或风险发生实质变化后，原批准不得自动继承。