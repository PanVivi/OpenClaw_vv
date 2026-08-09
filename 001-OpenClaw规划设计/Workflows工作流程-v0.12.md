# OpenClaw 工作流程｜v0.12｜确定性门控增量

本版完整继承 v0.11，新增以下强制流程：

1. 研究官方说明、GitHub、生产 SDK 和社群现象，分清保证与经验。
2. 形成一个冻结计划包并计算 SHA-256。
3. 连续进行三次各自完整、独立的审查；任何计划变化清空三审，从审查一重来。
4. 由 `workflow_governance` 把计划、审查证据和阶段写入官方 Task Flow；三审不足不得实施。
5. 实施后按计划目标验收；存在活动、未终结或失败子任务时父项不得进入最终通知。
6. 文档、测试和 GitHub 同步完成后进入唯一 `notification_pending`；只有真实 Telegram message ID 才能确认最终完成。

晨报信息入口：少主→蕭觀音时直接使用 `morning_brief_control`；少主→賈南風时使用 `morning_brief_handoff`，由 life 应用。普通 A2A 文字不等于落库回执。

风险与表达：低风险自动；中风险内部复核；高风险角色自然询问一次。任何用户消息不得呈现原生 Card/Host/CWD/UUID 或控制词。

当前版本没有 Task/Flow mutation Hook，旧 Workboard 分钟轮询不能在替代链验收前停用；该限制必须在任务交付中单列。

