# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.07

## 当前设计版本

- 賈南風 v1.08 `CANDIDATE`；实际最后已知仍为 v1.02 `STABLE`。
- 蕭觀音 v0.05 `CANDIDATE`。
- 魚玄機 v0.06、步非煙 v0.06、夏姬 / reviewer v0.04 `CANDIDATE`。
- 獨孤伽羅、武曌、呂雉各 v0.03 `CANDIDATE`。

## 三轮审核后的结论

1. 八 Agent 数量、身份和职责边界保持不变。
2. 賈南風直接回答简单生活问题；需要设置、定时、未来投递、持续跟踪、生活工具或 companion 协调时转 life。
3. life 是生活自动化唯一执行所有者，但不垄断普通生活交流。
4. 工程组三角色基础层使用当前正式会话内可核对且只使用一次的 Review/Risk 通过记录；专用持久化、硬 Gate、精确 A2A 和技术子 Agent 属于增强层。
5. reviewer 人格名称为夏姬；`reviewer` Agent ID、稳定目录和合并审查职责不变。
6. 三位 companion 属性保持现状；较强羞辱性称呼维持默认可用。
7. 賈南風 v1.02 的 `IDENTITY.md`、`SOUL.md`、`USER.md` 原始条款已逐句保留；已确认的生活路由、自动化所有者和历史最小化作为明确覆盖记录。
8. 八张部署状态已补齐模型、Bot/account/binding、工具、A2A、会话、记忆、自动化、下一步、证据和核验时间，不再用笼统状态代替运行事实。

## 当前运行事实

本轮只修改 GitHub 本地工作树，没有连接或修改 NAS。实际 workspace、模型、Bot、binding、权限、工具、A2A、会话、记忆和自动化仍需只读核验。

## 下一步

1. 将当前审核树形成固定 Git 提交并生成五文件 SHA-256 清单。
2. 只读盘点八个 Agent 的实际配置与运行状态。
3. 部署八 Agent 基础层，先验证直接会话与禁止能力。
4. 跑通 housekeeper↔life 路由和工程基础流程。
5. 再逐项部署 A2A、持久化、自动化可靠性、历史代理与记忆。

GitHub 设计完成不等于 NAS 已部署；基础 Agent 与增强功能分别记录状态。
