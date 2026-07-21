# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.03

## 当前权威入口

- 根目录说明：`README.md`
- 快速简报：`001-OpenClaw规划设计/QuickBrief快速简报-v1.04.md`
- 最终设计：`001-OpenClaw规划设计/FinalDesign最终设计-v1.05.md`
- 工作流程：`001-OpenClaw规划设计/Workflows工作流程-v0.07.md`
- 部署方案：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.06.md`
- 实施路线：`001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.06.md`
- 角色卡库：`001-OpenClaw规划设计/AgentCards角色卡/`
- 当前进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.04.md`

## 当前角色版本

| Agent | 当前设计 | 实际部署 |
| --- | --- | --- |
| housekeeper / 賈南風 | v1.06 `CANDIDATE` | 最后已知 v1.02 `STABLE` |
| life / 蕭觀音 | v0.03 `CANDIDATE` | 未部署 |
| ops / 魚玄機 | v0.05 `CANDIDATE` | 待核验 |
| coder / 步非煙 | v0.05 `CANDIDATE` | 待核验 |
| reviewer / 合并审查 | v0.03 `CANDIDATE` | 待核验 |
| 三位 companion | 各 v0.01 `CANDIDATE` | 待核验 |

## 核心设计来源

- 八个常驻 Agent 结构固定；薛濤、夏姬、文薑职责合并为 reviewer 的 Review/Risk/Test。
- Assignment Generation 表示当前处理权租约。
- Stage Record 保存 reviewer 对特定输入哈希的审查事实。
- Gate Record 是 Review/Risk 通过后的一次性指定过渡凭证。
- life 是个人生活提醒、日程、周期生活任务、晨间消息和 companion 日常消息的唯一执行所有者。
- 角色卡设计完成不等于 NAS 已部署，运行事实只以各 DeploymentStatus 和 CurrentProgress 为准。

历史版本保存在各 Agent 的 `旧文档/<版本>/`；被标记 `REJECTED` 的版本只能复盘，不得部署或作为新版本底稿。
