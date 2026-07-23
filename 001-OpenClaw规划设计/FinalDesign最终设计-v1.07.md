# 001 OpenClaw架设部署｜FinalDesign 最终设计｜v1.07

## 一、组织结构

八个常驻 Agent 保持不变：housekeeper、life、ops、coder、reviewer 与三位 companion。

## 二、部署原则

采用两层部署：

### 基础层

- 八个独立 Agent、workspace、五文件、模型、Bot/account/binding 和普通会话；
- 角色身份、职责与直接交流；
- 最小 allow/deny；
- 当前会话内的结构化任务与审查记录；
- 生活问题的正确直接回答/转交；
- companion 独立并行；
- 工程权限正反向测试。

### 增强层

- Task/Stage/Gate 专用持久化、硬单次消费和跨重启恢复；
- A2A 消息投递已启用；精细历史授权与受限代理后续独立增强；
- life 自动化可靠性；
- 技术子 Agent；
- 完整记忆。

增强层不得成为基础层上线前置。

## 三、生活路由

賈南風直接处理简单、一次性、无需工具和未来状态的生活问答。需要设置、定时、未来主动消息、持续跟踪、专用生活工具或 companion 协调时转给蕭觀音。life 是生活自动化唯一执行所有者。

## 四、工程路由

工程职责链保持：housekeeper 登记与协调 → ops 调查/方案 → reviewer.Review → coder 实现 → ops 核对 → reviewer.Review 产物 → 只交付停止，或 reviewer.Risk → ops 执行/自检 → reviewer.Test → housekeeper 汇总。

基础部署阶段，Review/Risk 的正式结构化输出可作为当前会话的一次性门控记录。未配置持久化时，重启或上下文丢失后停止并重新核对，不得自动续跑。

## 五、companion

三位 companion 的基础运行只依赖独立会话、角色加载、直接陪伴、并行和工程权限拒绝。其独立 Telegram Bot 仍需 token；life 主动协调、跨会话历史授权与记忆属于后续增强。

## 六、权限原则

- housekeeper 无工程副作用权限；
- life 无工程权限；
- ops 默认只读，执行需现实授权和 Risk；
- coder 仅隔离实现；
- reviewer 不修改待审对象；
- companion 只有陪伴会话能力；
- 八个固定 Agent 可使用 A2A 投递消息；`sessions.visibility=all` 只用于解析目标，`sessions_history` 保持拒绝；
- A2A 不授予另一 Agent 的 workspace、工具、个人记忆或现实授权；
- coder 在已验证 Sandbox 中运行，其他七个 Agent 当前关闭 Sandbox。

## 七、无损更新与连续性

- 角色卡、OpenClaw 配置、运行时、Telegram routing 和会话/记忆数据分别变更；
- 部署前固定 Git commit，停止 Gateway 后制作带 SHA-256 manifest 的一致性备份；
- 五文件使用暂存、校验和原子替换，不覆盖 session、transcript、SQLite、memory 或 Bot token；
- 通用运维摘要、当前任务和个人聊天记忆分开，个人恢复只能使用该 Agent 自己的 transcript；
- 更新后按 Gateway、Telegram、session/记忆、权限/A2A、Sandbox 和本次功能顺序验收；
- 详细流程以 `LosslessContentUpdate无损内容更新任务-v0.01.md` 为准。
