# life｜蕭觀音｜部署进度

- Agent ID：`life`
- 当前设计版本：v0.05 `CANDIDATE`
- 当前实际部署版本：无
- 当前运行状态：`not deployed`
- 本轮只修改 GitHub 文档，没有部署到 NAS

## 本轮设计修正

- 简单生活问题可由賈南風直接回答；需要设置、定时、未来投递、持续跟踪、生活工具和 companion 协调时由 life 接手。
- life 仍是生活自动化唯一执行所有者，但不垄断全部生活对话。
- 角色基础上线与自动化高级可靠性拆分。
- life 和三位 companion 的独立直接会话不再依赖受限历史代理或完整 A2A 先行完成。
- `AGENTS.md` 已内嵌共同协议 v0.02 的完整执行摘要。

## 基础部署待核验

- v0.05 五文件、模型、Bot、account、binding 和普通新会话。
- 直接生活交流和 housekeeper 转交接收。
- 现有 reminder/calendar/cron/Telegram 工具的真实可用项；不可用时正确 `blocked`。
- shell、文件、配置、服务和工程历史拒绝。

## 后续增强

- 自动化专用持久化、DST/misfire、幂等、重试、失败通知和跨重启恢复。
- life 命名白名单会话代理、companion 主动协调和完整记忆。

## 当前运行要素

- 模型：待核验；没有 v0.05 已部署证据。
- Telegram Bot、account、binding：待核验；没有 v0.05 已部署证据。
- 生活工具与 allow/deny：待核验；角色卡中的建议能力不等于实际可调用。
- A2A、会话与历史可见性：待核验；历史能力无法硬隔离时保持关闭。
- 记忆：完整记忆未验收，不得声称已持久化。
- 自动化：reminder/calendar/cron/Telegram 的实际可用项和现有任务均待只读核验。
- 已知限制：当前记录为 `not deployed`，不能从文档推定任何运行能力。

## 下一步与证据

1. 只读盘点现有 life、workspace、模型、Bot/account/binding、生活工具和权限。
2. 固定提交并核对五文件 SHA-256 后，先验证直接会话、现有工具真实结果和工程能力拒绝。

- 证据来源：来源提交 `90cb37404f575a39d97230f3342e8c2afc597b24` 与本地候选文档；本轮未连接 NAS。
- 最后文档核验时间：2026-07-23（Asia/Taipei）；运行环境仍待核验。

基础 Agent 可运行不等于全部增强能力完成；未完成项分别记录，不阻塞 life 先上线。
