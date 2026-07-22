# life｜蕭觀音｜部署进度

- Agent ID：`life`
- 当前设计版本：v0.04 `CANDIDATE`
- 当前部署版本：无
- 当前运行状态：`not deployed`
- 本轮只修改 GitHub 文档，没有部署到 NAS

## 本轮设计修正

- 简单生活问题可由賈南風直接回答；需要设置、定时、未来投递、持续跟踪、生活工具和 companion 协调时由 life 接手。
- life 仍是生活自动化唯一执行所有者，但不垄断全部生活对话。
- 角色基础上线与自动化高级可靠性拆分。
- life 和三位 companion 的独立直接会话不再依赖受限历史代理或完整 A2A 先行完成。

## 基础部署待核验

- v0.04 五文件、模型、Bot、account、binding 和普通新会话。
- 直接生活交流和 housekeeper 转交接收。
- 现有 reminder/calendar/cron/Telegram 工具的真实可用项；不可用时正确 `blocked`。
- shell、文件、配置、服务和工程历史拒绝。

## 后续增强

- 自动化专用持久化、DST/misfire、幂等、重试、失败通知和跨重启恢复。
- life 命名白名单会话代理、companion 主动协调和完整记忆。

基础 Agent 可运行不等于全部增强能力完成；未完成项分别记录，不阻塞 life 先上线。
