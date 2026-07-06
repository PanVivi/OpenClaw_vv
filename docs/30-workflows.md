# 30｜工作流程

本文件记录 v2.1 精简结构下的流程。早期文档中薛濤、文薑、夏姬是独立角色；后期已合并进 `reviewer`。

## 1. 通用入口

```text
PANVIVI
↓
housekeeper / 南風
↓
ops / 魚玄機 或 coder / 步非煙
↓
reviewer 内部阶段：Review / Risk / Test
↓
housekeeper 汇总
↓
PANVIVI
```

## 2. 调试任务

```text
PANVIVI 提出目标
↓
housekeeper 评估优先级和任务类型
↓
ops 制定方案
↓
reviewer.Review 审查方案并预估风险
├── 不通过：打回 ops 改方案
└── 通过：进入分轨
```

### 简单命令轨

```text
ops 准备执行命令
↓
reviewer.Risk 评估危险等级
├── 低危：ops 直接执行
├── 中危：确认备份/回滚后放行
└── 高危：上报 housekeeper，由 PANVIVI 决策
↓
reviewer.Test 验收
```

### 代码/脚本轨

```text
coder 根据方案写代码/脚本
↓
ops 对照方案确认是否符合目标
├── 不符合：打回 coder
└── 符合：进入 reviewer
↓
reviewer.Review 审查代码
├── 不通过：打回 coder
└── 通过：进入 Risk
↓
reviewer.Risk 部署前风险评估
↓
ops 执行
↓
reviewer.Test 验收
```

## 3. 代码任务

```text
PANVIVI 提需求
↓
housekeeper 整理需求和优先级
↓
ops 制定设计方案
↓
reviewer.Review 审查方案
├── 不通过：打回 ops
└── 通过：housekeeper 转呈 PANVIVI
↓
PANVIVI 三选一：
  - 通过
  - 修改
  - 不做
```

通过后：

```text
coder 写代码
↓
ops 对照设计文档逐项确认
↓
reviewer.Review 代码审查
↓
reviewer.Risk 部署风险
↓
ops 部署
↓
reviewer.Test 功能验收
```

## 4. 失败分类

`reviewer.Test` 验收失败时必须分类：

| 类型 | 处理 |
| --- | --- |
| 方案问题 | 打回 ops 改方案，重新 Review |
| 代码问题 | 打回 coder，重新走 ops 确认和 Review |
| 部署问题 | 打回 ops 重新部署 |
| 需求不清 | housekeeper 向 PANVIVI 澄清 |

## 5. 熔断

| 熔断 | 条件 | 处理 |
| --- | --- | --- |
| Review 熔断 | coder 被 reviewer.Review 连续/累计打回 5 次 | housekeeper 上报 PANVIVI |
| Ops 确认熔断 | coder 被 ops 打回 5 次 | housekeeper 上报 PANVIVI |
| Test 熔断 | reviewer.Test 连续验收失败 5 次 | housekeeper 上报 PANVIVI |

PANVIVI 决策：

- 调整目标。
- 换方案方向。
- 拆分任务。
- 暂停任务。

## 6. 复杂任务与临时子 Agent

允许 `ops` 或 `coder` 创建临时子 Agent，但必须先过 Review。

```text
ops/coder 提出拆分方案
↓
reviewer.Review 审查拆分是否合理
↓
创建临时子 Agent 并行处理
↓
ops/coder 汇总
↓
结果重新走 Review / Risk / Test
```

限制：

- 子 Agent 是临时执行单元，不是常驻角色。
- 子 Agent 失败计入主 Agent 熔断。
- 不允许用子 Agent 绕过 reviewer。

