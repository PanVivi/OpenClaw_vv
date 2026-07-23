# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.10

## 当前设计版本

- 賈南風 v1.08 `CANDIDATE`；实际最后已知仍为 v1.02 `STABLE`。
- 蕭觀音 v0.05 `CANDIDATE`。
- 魚玄機 v0.06、步非煙 v0.06、夏姬 / reviewer v0.04 `CANDIDATE`。
- 獨孤伽羅、武曌、呂雉各 v0.03 `CANDIDATE`。

## 六轮审核后的结论

1. 八 Agent 数量、身份、人物属性、职责和基础路由保持不变。
2. 工程基础层使用当前正式会话内可核对、只使用一次的 Review/Risk/Stage 记录；Assignment Generation 继续表示当前处理权。
3. 专用持久化、Gate ID、目标 Generation 硬绑定、硬单次消费和跨重启恢复属于增强层。
4. ops、coder、reviewer 的详细流程、交付、取消、A2A 和权限矩阵已与上述分层统一。
5. 三个工程角色只有在角色专用长期记忆权限真实配置并验收后才能写入；当前没有已验收记忆能力。
6. 技术子 Agent、精确 A2A、完整记忆和高级自动化仍不阻塞八 Agent 基础上线。
7. 夏姬名称、三位 companion 属性和默认可用的较强羞辱性称呼均未改变。
8. 賈南風 v1.02 六文件继承矩阵继续由 `RoleCardAudit角色卡审核-v0.03.md` 保存，并由当前 v0.06 审核显式引用。

## 当前运行事实

本轮只修改 GitHub 本地工作树，没有连接或修改 NAS。实际 workspace、模型、Bot、binding、权限、工具、A2A、会话、记忆和自动化仍需只读核验。

## 下一步

1. 将当前审核树形成固定 Git 提交并生成五文件 SHA-256 清单。
2. 只读盘点八个 Agent 的实际配置与运行状态。
3. 部署八 Agent 基础层，先验证直接会话、当前会话记录和禁止能力。
4. 跑通 housekeeper↔life 路由和工程基础流程。
5. 再逐项部署 A2A、专用持久化、自动化可靠性、技术子 Agent、历史代理与记忆。

GitHub 设计完成不等于 NAS 已部署；基础 Agent 与增强功能分别记录状态。
