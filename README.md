# OpenClaw_vv 项目文档

本仓库保存薇的 OpenClaw 多 Agent 组织架构、角色卡、工作流程、部署方案、当前进度、纠错与经验。组织名：合欢宗。

## 当前阅读顺序

1. [快速简报 v1.04](001-OpenClaw规划设计/QuickBrief快速简报-v1.04.md)
2. [最终设计 v1.05](001-OpenClaw规划设计/FinalDesign最终设计-v1.05.md)
3. [角色卡库](001-OpenClaw规划设计/AgentCards角色卡/README.md)
4. 对应 Agent 的 DeploymentStatus、VERSION-STATUS 和五个 workspace 文件
5. [共同协议 v0.02](001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md)
6. [工作流程 v0.07](001-OpenClaw规划设计/Workflows工作流程-v0.07.md)
7. [部署方案 v0.06](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.06.md)
8. [实施路线 v0.06](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.06.md)
9. [当前进度 v0.04](002-OpenClaw部署进度/CurrentProgress当前进度-v0.04.md)
10. [来源索引 v0.03](000-OpenClaw文档管理/SourceIndex来源索引-v0.03.md)

## 常驻 Agent 与当前设计

```text
housekeeper       賈南風 v1.06
life              蕭觀音 v0.03
ops               魚玄機 v0.05
coder             步非煙 v0.05
reviewer          合并审查 v0.03
companion-dugu    獨孤伽羅 v0.01
companion-wu      武曌 v0.01
companion-lv      呂雉 v0.01
```

除最后已知实际运行的賈南風 v1.02 外，以上当前设计均未完成稳定部署验收。

## 核心治理模型

- Assignment Generation 管当前处理权。
- Stage Record 管特定材料的审查事实。
- Gate Record 管 Review/Risk 后一次指定过渡。
- life 独占生活提醒和个人日程自动化执行所有权。
- 正常 Gate 指定交接可递增 Generation 并单次消费；不能复用、换目标或扩大范围。

## 状态原则

五个 workspace 文件为 IDENTITY、SOUL、AGENTS、USER、TOOLS；PERMISSIONS 是配置参考；DeploymentStatus 是实际运行状态唯一入口。GitHub 设计不等于 NAS 已部署，所有允许和禁止能力都必须通过真实测试。
