# 001 OpenClaw架设部署｜Workflows 工作流程｜v0.03

本文件记录 v2.1 精简结构下的任务流程。早期文档中薛濤、文薑、夏姬是独立角色；后期已合并进 `reviewer`。

本次 `v0.03` 更新：

- 将“通用入口”明确为“标准受管任务入口”。
- 增加直接联系与快速直达任务规则。
- 恢复 `ops` 作为工程方案主线，避免代码任务直接绕过方案审查。
- 区分 ops 技术自检与 reviewer.Test 独立验收。
- 区分常驻 Agent 通信与临时子 Agent。

## 1. 入口模式

### 1.1 标准受管任务入口

正式工程任务、跨 Agent 任务、长期任务、高风险任务，以及需要审批或最终验收的任务，默认采用：

```text
薇（少爷 / 少主 / 公子）
↓
housekeeper / 賈南風
↓
ops / 魚玄機 主持工程主线，或 life / 蕭觀音主持生活主线
↓
coder / 步非煙（需要技术实现时）
↓
reviewer 内部阶段：Review / Risk / Test
↓
housekeeper 汇总
↓
薇（少爷 / 少主 / 公子）
```

housekeeper 负责分类、优先级、范围、节奏、审批转呈、冲突处理和最终汇总，不直接替代专业 Agent。

### 1.2 直接联系模式

薇可以直接联系 `ops`、`coder`、`life` 和任一 `companion`。

- 简单、单一、低风险、无工具副作用的任务，可由当前 Agent 直接完成。
- 涉及多 Agent、正式方案、生产变更、范围扩大、风险审批、长期跟踪或最终验收时，应转交 housekeeper 纳入标准受管流程。
- `reviewer` 默认作为内部审查阶段，不作为普通闲聊或一般任务入口。

### 1.3 快速直达任务

以下任务不强制进入完整 Review / Risk / Test：

- 普通问答、解释和总结。
- 无工具调用的文本整理。
- 已有结果的转述。
- 简单状态汇总。
- 不产生外部副作用的一次性低风险任务。

一旦涉及工具调用、文件写入、配置修改、外部写操作、部署、生产环境或正式验收，必须升级为标准受管流程。

## 2. 调试与部署任务

```text
薇提出目标
↓
housekeeper 整理范围、优先级和任务类型
↓
ops 调查现状并制定方案
↓
reviewer.Review 审查方案
├── 不通过：打回 ops 修改方案
└── 通过：进入简单命令轨或代码/脚本轨
```

### 2.1 简单命令轨

```text
ops 准备命令、备份和回滚方案
↓
reviewer.Risk 评估危险等级
├── 低危：按项目规则由 ops 执行
├── 中危：确认备份、回滚和执行条件后放行
└── 高危：上报 housekeeper，由薇明确决策
↓
ops 执行并完成技术自检
↓
reviewer.Test 独立验收
↓
housekeeper 汇总呈报薇
```

### 2.2 代码/脚本轨

```text
ops 制定技术方案和实现边界
↓
reviewer.Review 审查方案
↓
必要时由 housekeeper 转呈薇批准
↓
coder 按确认方案写代码/脚本
↓
ops 对照方案逐项核对
├── 不符合：打回 coder
└── 符合：进入 reviewer
↓
reviewer.Review 审查技术产物
├── 不通过：打回 coder
└── 通过：进入 Risk
↓
reviewer.Risk 评估部署风险
↓
ops 执行并完成技术自检
↓
reviewer.Test 独立验收
↓
housekeeper 汇总呈报薇
```

## 3. 正式代码任务

正式代码任务不能由 housekeeper 收到后直接交给 coder。标准流程为：

```text
薇提出需求
↓
housekeeper 整理目标、范围和优先级
↓
ops 制定设计方案
↓
reviewer.Review 审查方案
├── 不通过：打回 ops
└── 通过：housekeeper 转呈薇
↓
薇选择：
  - 通过
  - 修改
  - 不做
```

通过后：

```text
coder 按批准方案实现
↓
ops 对照设计文档逐项核对
↓
reviewer.Review 代码审查
↓
reviewer.Risk 部署风险评估
↓
ops 部署并完成技术自检
↓
reviewer.Test 功能验收
↓
housekeeper 汇总呈报薇
```

### 3.1 coder 的产出范围

coder 主要负责：

- 程序代码。
- Shell / PowerShell 脚本。
- SQL。
- 配置模板。
- 正则表达式。
- 自动化逻辑。
- 需要技术实现或机器执行的结构化产物。

任务摘要、状态汇报、决策选项、工作清单、普通表格和非技术性结构整理，可由 housekeeper 或当前 Agent 完成，不必交给 coder。

## 4. 技术自检与独立验收

### 4.1 ops 技术自检

ops 在执行后负责确认：

- 命令是否成功。
- 文件内容、路径、权限或 hash 是否符合预期。
- 服务是否正常。
- 日志是否存在异常。
- 基础 Smoke Test 是否通过。

ops 的自检是执行责任的一部分，不等于最终验收。

### 4.2 reviewer.Test 独立验收

reviewer.Test 负责：

- 判断结果是否满足原始目标。
- 判断证据是否充分。
- 检查是否存在遗漏或范围偏差。
- 独立给出 pass / fail。
- 失败时完成分类。

`reviewer.Test` 验收失败时必须分类：

| 类型 | 处理 |
| --- | --- |
| 方案问题 | 打回 ops 改方案，重新 Review |
| 代码问题 | 打回 coder，重新走 ops 核对和 Review |
| 部署问题 | 打回 ops 重新部署 |
| 需求不清 | housekeeper 向薇澄清 |

ops 不得因自己完成部署和自检就宣布整个任务最终通过。

## 5. 生活与陪伴任务

```text
薇提出生活、健康、娱乐或情绪需求
↓
housekeeper 分类（或薇直接联系 life）
↓
life / 蕭觀音处理或选择合适 companion
↓
结果返回薇；需要跨 Agent 协调时由 housekeeper 汇总
```

规则：

- life 是生活和陪伴分支主控。
- 薇明确指定某位 companion 时，可以直接联系或直接转交，不必先由 life 再选择。
- companions 只负责聊天和陪伴，不进入工程流程，不读取工程敏感文件，不获得工程执行权限。

## 6. 失败、打回与熔断

| 熔断 | 条件 | 处理 |
| --- | --- | --- |
| Review 熔断 | coder 被 reviewer.Review 连续或累计打回 5 次 | housekeeper 上报薇 |
| Ops 核对熔断 | coder 被 ops 打回 5 次 | housekeeper 上报薇 |
| Test 熔断 | reviewer.Test 连续验收失败 5 次 | housekeeper 上报薇 |

熔断后不得自动继续。薇决定：

- 调整目标。
- 更换方案方向。
- 拆分任务。
- 暂停任务。
- 终止任务。

## 7. 常驻 Agent 通信

常驻 Agent 通信是 housekeeper 与已配置的 `ops`、`coder`、`reviewer`、`life` 和 companions 之间的任务发送、状态查询和结果回收，不等同于创建临时子 Agent。

设计原则：

- housekeeper 只在白名单内协调常驻 Agent。
- 允许发送任务、查询状态和取得完成协调所需的有限结果。
- 不得通过会话通信间接取得 shell、生产写入、删除、凭据或敏感数据权限。
- 具体工具名称和配置字段必须以当前 OpenClaw 版本实际支持为准，不在流程文档中写死未经验证的配置。

## 8. 复杂任务与临时子 Agent

临时子 Agent 用于复杂任务的并行拆分，不是常驻角色。

```text
ops/coder 提出拆分方案
↓
reviewer.Review 审查拆分是否合理
↓
ops/coder 创建临时子 Agent
↓
临时子 Agent 并行处理
↓
ops/coder 汇总和核验
↓
结果重新走 Review / Risk / Test
↓
housekeeper 汇总呈报薇
```

拆分方案必须说明：

- 任务目标。
- 输入范围。
- 输出格式。
- 完成标准。
- 可用工具与禁止事项。
- 权限范围。
- 成本与并发计划。
- 汇总和验收负责人。

限制：

- 默认使用隔离上下文；只有任务依赖当前完整对话时才使用 fork。
- 子 Agent 声称完成不等于父任务完成，主 Agent 必须核验。
- 子 Agent 失败计入对应主 Agent 熔断。
- 不允许用子 Agent 绕过 reviewer。
- 不允许借子 Agent 获得主 Agent 或当前任务被禁止的权限。
- housekeeper 负责进度监督和最终呈报，默认不承担普通临时子 Agent 的创建职责。

## 9. 任务范围控制

- 一次只推进一个已批准目标或 Change。
- 不得顺手修改无关问题。
- 新发现但不阻塞当前任务的问题，记录为 Observation、Issue 或后续待办。
- 只有新问题确实阻塞当前任务时，才向薇请求扩大范围。
- 范围、方案、命令、目标文件、执行环境或风险发生实质变化后，原批准不得自动继承。