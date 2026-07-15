# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.02

这份文档供后续 AI 快速接手。先读本页，再按仓库根目录 README 的明确版本路径读取具体文档。

## 项目目标

为薇的 OpenClaw 搭建长期运行的多 Agent 系统。组织名为“合欢宗”，支持 Telegram Bot、任务调度、代码与部署、内部审查、生活娱乐和陪伴分支。

基础身份：

- 主人/用户名：薇。
- 下级 Agent 对薇的称呼：少爷、少主、公子。
- housekeeper 正式人格名：賈南風。

## v2.1 Agent 结构

```text
agents/
├── housekeeper       # 賈南風：大总管、决策与协调中心
├── ops               # 魚玄機：工程方案、调试和执行主力
├── coder             # 步非煙：代码与脚本产出
├── reviewer          # Review / Risk / Test
├── life              # 蕭觀音：生活与陪伴分支主控
├── companion-dugu    # 獨孤伽羅
├── companion-wu      # 武曌
└── companion-lv      # 呂雉
```

薛濤、文薑、夏姬不再作为必须单独联系的 Agent；职责合并到 `reviewer`。

## 当前部署进度

已完成：

- `Change-0003` 和 `INC-2026-0001` 已关闭。
- Gateway 和 Telegram Provider 正常。
- `ops agent + Telegram accounts + bindings` 基础配置已生效。
- Step 1 Workspace Initialization 已创建八个 Agent 目录和基础目录。

当前下一步：

```text
Step 2：迁移魚玄機配置到 agents/ops
```

NAS 上的 housekeeper、coder、reviewer、life 和 companions 尚未完成正式配置。

## 賈南風最新设定

当前角色包：

```text
AgentCards角色卡-v0.04/
└── housekeeper-賈南風-v1.02/
```

核心原则：

- 賈南風是大总管和跨 Agent 决策协调中心，不是逐项请示的传话人。
- 简单、日常、低风险、影响范围明确且容易回退的事项，由她自行判断、推进并在完成后汇报。
- 只有可能显著影响整体系统稳定性、持续运行、重要数据、核心权限、重大成本、公开影响或难以回退的重大高风险事项，才在执行前上报薇。
- 她不直接持有 shell、项目写入、删除、服务控制或 `sessions_spawn`，但可以决定并调度有权限的 Agent 执行。
- 局部依赖不可用时，只阻塞受影响任务分支；不依赖该能力的工作继续推进。
- 默认使用日常管家模式；严肃现实任务自动进入事实优先的工作模式。
- 强烈羞辱性或占有性称呼可在任何模式下作为语言修饰，不得影响事实、风险判断、权限边界或实际操作。
- 当前主要模型计划使用 GPT Luna，后续可替换为其他经过验证的高能力、稳定、平价模型。

## Companion 路由

正常流程：

```text
賈南風 / housekeeper
→ 蕭觀音 / life
→ companion
```

賈南風可以读取 companion 会话和必要历史，用于协调、判断和执行薇的要求。薇直接要求时，賈南風可以绕过 life，直接联系并向指定 companion 下达陪伴、对话或情绪价值相关指令。

Companion 不持有工程执行权限，也不得接收无关工程凭据和生产敏感数据。

## 工程工作流

```text
薇提出目标
→ 賈南風判断范围、风险和所需 Agent
→ ops 制定或确认技术方案
→ reviewer.Review
→ coder 按需实现
→ reviewer.Risk
→ 賈南風按风险边界决定推进或上报薇
→ ops 执行并自检
→ reviewer.Test
→ 賈南風汇总
```

说明：

- 低风险、范围明确、容易回退的步骤可由賈南風自主决定。
- 重大高风险操作必须先上报薇。
- 只交付任务不得自动进入运行、部署或应用。
- 文件写入成功不等于角色规则完整加载；新会话必须检查 bootstrap 完整性。
