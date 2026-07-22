# OpenClaw_vv 项目文档

本仓库保存薇的 OpenClaw 多 Agent 组织架构、角色卡、工作流程、部署方案、当前进度、纠错与经验。组织名：合欢宗。

## 当前阅读顺序

1. [快速简报 v1.05](001-OpenClaw规划设计/QuickBrief快速简报-v1.05.md)
2. [最终设计 v1.06](001-OpenClaw规划设计/FinalDesign最终设计-v1.06.md)
3. [角色卡库](001-OpenClaw规划设计/AgentCards角色卡/README.md)
4. 对应 Agent 的 DeploymentStatus、VERSION-STATUS 和五个 workspace 文件
5. [共同协议 v0.02](001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md)
6. [工作流程 v0.08](001-OpenClaw规划设计/Workflows工作流程-v0.08.md)
7. [部署方案 v0.07](001-OpenClaw规划设计/DeploymentPlan部署方案-v0.07.md)
8. [实施路线 v0.07](001-OpenClaw规划设计/ImplementationRoadmap实施路线图-v0.07.md)
9. [当前进度 v0.05](002-OpenClaw部署进度/CurrentProgress当前进度-v0.05.md)
10. [来源索引 v0.04](000-OpenClaw文档管理/SourceIndex来源索引-v0.04.md)

## 当前角色版本

```text
housekeeper       賈南風 v1.07
life              蕭觀音 v0.04
ops               魚玄機 v0.05
coder             步非煙 v0.05
reviewer          合并审查 v0.03
companion-dugu    獨孤伽羅 v0.02
companion-wu      武曌 v0.02
companion-lv      呂雉 v0.02
```

## 当前目标

先最小化部署完整八 Agent 集合，让各 Agent 拥有独立 workspace、Bot、binding、普通会话和正确最小权限。专用持久化、精细 A2A、自动化可靠性、技术子 Agent 与完整记忆分阶段增强，不再阻塞基础上线。

賈南風可直接回答简单生活问题；需要设置、定时、未来投递、持续跟踪、生活工具或 companion 协调时转蕭觀音。life 是生活自动化唯一执行所有者。

GitHub 设计不等于 NAS 已部署；基础角色状态与增强能力状态分别记录。
