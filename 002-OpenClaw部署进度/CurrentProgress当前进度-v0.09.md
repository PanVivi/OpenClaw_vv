# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.09

## 当前设计版本

- 賈南風 v1.08 `CANDIDATE`；实际最后已知仍为 v1.02 `STABLE`。
- 蕭觀音 v0.05 `CANDIDATE`。
- 魚玄機 v0.06、步非煙 v0.06、夏姬 / reviewer v0.04 `CANDIDATE`。
- 獨孤伽羅、武曌、呂雉各 v0.03 `CANDIDATE`。

## 五轮审核后的结论

1. 八 Agent 数量、身份、人物属性和职责边界保持不变。
2. 賈南風直接回答简单生活问题；设置型生活任务转 life，life 是生活自动化唯一执行所有者。
3. 工程基础层使用当前正式会话内可核对、明确标注“未持久化”且只使用一次的 Review/Risk 通过记录。
4. ops、coder、reviewer 的入口 README 已与候选说明统一：专用持久化、目标 Generation 和硬 Gate 都属于增强层。
5. 八张部署状态统一使用“当前运行状态”字段，状态值与运行事实没有改写。
6. ops/coder 的技术子 Agent 与 housekeeper 长期记忆写入均只在增强层受控启用。
7. 夏姬名称、三位 companion 属性和默认可用的较强羞辱性称呼均未改变。
8. 賈南風 v1.02 六文件继承矩阵继续由 `RoleCardAudit角色卡审核-v0.03.md` 保存，并由当前 v0.05 审核显式引用。

## 当前运行事实

本轮只修改 GitHub 本地工作树，没有连接或修改 NAS。实际 workspace、模型、Bot、binding、权限、工具、A2A、会话、记忆和自动化仍需只读核验。

## 下一步

1. 将当前审核树形成固定 Git 提交并生成五文件 SHA-256 清单。
2. 只读盘点八个 Agent 的实际配置与运行状态。
3. 部署八 Agent 基础层，先验证直接会话、当前会话记录和禁止能力。
4. 跑通 housekeeper↔life 路由和工程基础流程。
5. 再逐项部署 A2A、专用持久化、自动化可靠性、技术子 Agent、历史代理与记忆。

GitHub 设计完成不等于 NAS 已部署；基础 Agent 与增强功能分别记录状态。
