# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.03

## 当前文档状态

- 角色卡库稳定入口为 `001-OpenClaw规划设计/AgentCards角色卡/`。
- 最终结构为八个常驻 Agent；薛濤、夏姬、文薑职责合并在 reviewer 的 Review/Risk/Test 阶段，不另建 Agent。
- 八个 Agent 均已具备完整当前角色卡结构、版本状态和部署状态入口。
- 賈南風当前设计 v1.04 `CANDIDATE`；当前实际部署仍记录为 v1.02 `STABLE`。
- 蕭觀音当前设计 v0.02 `CANDIDATE`，尚未部署。
- 魚玄機与步非煙已完成联动审查并升级为 v0.02 `CANDIDATE`；各自 v0.01 已标记 `REJECTED`、不可采用。
- reviewer、獨孤伽羅、武曌、呂雉当前设计仍为 v0.01 `CANDIDATE`。
- 共同协议 v0.02 的执行摘要已内嵌到八个当前角色的 `AGENTS.md`。

## 魚玄機与步非煙 v0.02 修正

- 魚玄機补齐授权来源、任务状态、取消撤权、防重复、生产权限有效期与回收、凭据、执行证据和最低验收。
- 步非煙补齐隔离 workspace、路径写权限、受限测试、方案变化处理、交付状态、返工契约、子 Agent 权限继承和生产拒绝。
- 两张角色卡保持原工程路由：ops 方案 → reviewer.Review → coder 实现 → ops 核对 → reviewer.Review；只交付停止，需执行再进入 Risk、housekeeper 决策、ops 执行和 reviewer.Test。

## 最后已知 NAS 运行状态

以下均为历史记录中的最后已知状态，本轮 GitHub 文档与角色卡修正没有连接 NAS 重新验证：

- 最后已知已部署 housekeeper 为賈南風 v1.02，模型为 `custom-1/gpt-5.6-luna`。
- ops Agent、Telegram accounts 和 bindings 基础配置曾生效，但当前五文件、版本、模型与权限仍待核验。
- 最后已知跨 Agent 发送受 `tools.agentToAgent.enabled=false` 限制，历史读取受 `tools.sessions.visibility=tree` 限制。
- coder、reviewer、life 和三位 companion 的实际 workspace、Bot、binding 和权限均无足够证据确认。

## 尚未部署或未验证

- 賈南風 v1.04、蕭觀音 v0.02、魚玄機 v0.02、步非煙 v0.02 及其他候选角色均未完成对应运行时部署验收。
- 魚玄機的精确生产权限、回收机制、A2A、两条工程轨和真实 Smoke Test 待验证。
- 步非煙的隔离 workspace、路径 allow/deny、生产网络/数据拒绝、受限测试和交付返工流程待验证。
- A2A、会话硬隔离、天气、日历、Telegram 主动发送、提醒和每日 06:00 Cron 尚未统一配置和测试。
- 完整记忆插件、真实工具名称、独立命名空间、纠正、删除、失效和隔离尚未设计部署。

## 后续独立任务

1. 完成賈南風 v1.02 → v1.04 最终继承复核。
2. 只读核验 NAS 八个 Agent 的实际 workspace、模型、Bot、binding、配置和工具状态。
3. 分 Change 部署和验收魚玄機 v0.02 与步非煙 v0.02，先验证权限拒绝，再验证允许能力和联动流程。
4. 分 Change 部署和验收其他角色。
5. 配置受限 A2A、life 会话硬隔离和生活自动化。
6. 单独建立 `Change-Memory`。

## 状态原则

- GitHub 设计完成不等于 NAS 已部署。
- `CANDIDATE` 不得直接写成稳定版。
- “最后已知”不得写成未经重新验证的当前事实。
- 工具可见不等于调用成功，会话在线不等于任务完成。
- 未取得 NAS 配置、运行日志、Telegram 投递或真实工具测试证据的字段保持待核验。
