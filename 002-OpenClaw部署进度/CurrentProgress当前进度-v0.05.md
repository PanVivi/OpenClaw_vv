# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.05

## 当前设计版本

- 賈南風 v1.07 `CANDIDATE`；实际最后已知仍为 v1.02 `STABLE`。
- 蕭觀音 v0.04 `CANDIDATE`。
- 魚玄機 v0.05、步非煙 v0.05、reviewer v0.03 `CANDIDATE`。
- 獨孤伽羅、武曌、呂雉各 v0.02 `CANDIDATE`。

## 本轮完整兼容性审查结论

1. 修正生活路由：賈南風直接回答简单生活问题；设置、定时、未来投递、持续跟踪和协调转 life。
2. life 仍为生活自动化唯一执行所有者，但不垄断所有生活交流。
3. 发现部署方案过度前置化：专用 Task/Stage/Gate/Automation 服务、硬历史代理和完整记忆不应阻塞八 Agent 基础上线。
4. 三 companion 分离基础直接陪伴与 life 协调/历史/记忆增强。
5. 工程组三角色职责和流程保持兼容；当前会话结构化记录足以先跑基础流程，跨重启自动恢复后续实现。
6. 技术子 Agent 默认关闭，不作为最小完整 Agent 集合前置。

## 当前运行事实

本轮只修改 GitHub 文档，没有连接或修改 NAS。实际 workspace、模型、Bot、binding、权限和工具仍需只读核验。

## 下一步

1. 只读盘点八个 Agent。
2. 部署八 Agent 基础层，先验证直接会话与权限拒绝。
3. 跑通 housekeeper↔life 路由和工程基础流程。
4. 再逐项部署 A2A、持久化、自动化可靠性、历史代理与记忆。

GitHub 设计完成不等于 NAS 已部署；基础 Agent 与增强功能分别记录状态。
