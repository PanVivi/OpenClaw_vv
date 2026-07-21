# OpenClaw_vv 项目文档

本仓库用于保存薇的 OpenClaw 多 Agent 组织架构、部署方案、工作流程、Agent 角色卡、部署进度、纠错记录和经验复盘。当前组织名：合欢宗。

## 给其他 AI 的阅读顺序

1. [快速简报 v1.03](001-OpenClaw规划设计/QuickBrief快速简报-v1.03.md)
2. [最终设计 v1.04](001-OpenClaw规划设计/FinalDesign最终设计-v1.04.md)
3. [角色卡库](001-OpenClaw规划设计/AgentCards角色卡/README.md)
4. 处理某一 Agent 前，先读其 `DeploymentStatus部署状态.md` 和 `VERSION-STATUS版本状态.md`
5. [全体 Agent 共同协议 v0.02](001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md)
6. [部署方案 v0.05](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.05.md)
7. [工作流程 v0.06](001-OpenClaw规划设计/Workflows工作流程-v0.06.md)
8. [实施路线图 v0.05](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.05.md)
9. [当前进度 v0.03](002-OpenClaw部署进度/CurrentProgress当前进度-v0.03.md)
10. [事故与经验](003-OpenClaw事故经验/)

## 当前角色结构

最终结构固定为八个常驻 Agent：

```text
housekeeper       賈南風：大总管与跨 Agent 协调
ops               魚玄機：工程调查、方案、执行与自检
coder             步非煙：代码、脚本与技术产出
reviewer          合并审查：Review / Risk / Test
life              蕭觀音：生活总管、提醒与 companion 管理
companion-dugu    獨孤伽羅：全面管控型陪伴
companion-wu      武曌：绝对权威型陪伴
companion-lv      呂雉：冷酷命令型陪伴
```

薛濤、夏姬、文薑不再是独立 Agent，职责合并到 reviewer。

## 当前角色卡版本

- 賈南風：v1.04 `CANDIDATE`；实际部署仍为 v1.02 `STABLE`。
- 蕭觀音：v0.02 `CANDIDATE`；尚未部署。
- 魚玄機、步非煙、合并审查、獨孤伽羅、武曌、呂雉：各 v0.01 `CANDIDATE`；实际部署状态分别以各目录状态文档为准。

八个常驻 Agent 的当前角色卡均已补齐。候选版必须完成实际部署和验收后才能升级为稳定版。

## 核心流程

工程任务由 housekeeper 整理目标，ops 调查并制定方案，reviewer.Review 审方案；简单命令轨进入 Risk、ops 执行、自检和 Test，代码轨则由 coder 实现、ops 对照核对、reviewer 再审产物后，按是否只交付决定停止或进入执行。

生活事务由 life 主控。三位 companion 是独立常驻 Agent，拥有独立会话和 Telegram Bot，可同时运行，只负责聊天、陪伴和情绪价值。正常协调经 life；只有薇直接要求时 housekeeper 才直达指定 companion。

## 部署与状态原则

- 五个 workspace 文件：`IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- `PERMISSIONS.md` 只作为真实权限配置参考。
- `DeploymentStatus部署状态.md` 是实际运行状态唯一入口。
- 共同协议摘要必须内嵌到每个 Agent 的 `AGENTS.md`。
- 写入后创建正式普通新会话，独立测试允许与禁止能力。
- GitHub 设计不等于 NAS 已部署；工具可见不等于调用成功。
- 每次部署、回滚、模型、Bot、binding、权限、记忆或自动化变化后更新状态文档。

## 当前文档

- [DocumentRules文档编号规则-v1.04.md](000-OpenClaw文档管理/DocumentRules文档编号规则-v1.04.md)
- [SourceIndex来源索引-v0.02.md](000-OpenClaw文档管理/SourceIndex来源索引-v0.02.md)
- [FinalDesign最终设计-v1.04.md](001-OpenClaw规划设计/FinalDesign最终设计-v1.04.md)
- [AgentCards角色卡/](001-OpenClaw规划设计/AgentCards角色卡/README.md)
- [DeploymentPlan部署方案-v0.05.md](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.05.md)
- [Workflows工作流程-v0.06.md](001-OpenClaw规划设计/Workflows工作流程-v0.06.md)
- [ImplementationRoadmap实施路线图-v0.05.md](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.05.md)
- [CurrentProgress当前进度-v0.03.md](002-OpenClaw部署进度/CurrentProgress当前进度-v0.03.md)
