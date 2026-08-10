# OpenClaw 工作流程｜v0.13｜统一任务入口与事件推进

本版完整继承 v0.12，以下流程替代依赖角色记忆和分钟轮询的旧做法。

1. 已认证 owner 消息先持久登记并去重；未认证 sender 不能创建任务或录入模块。
2. 本轮分流为 `conversation`、`direct_module`、`simple_task`、`governed_change` 或 `research_plan_triple_review`。
3. 晨报模块由蕭觀音直接调用 `morning_brief_control`；賈南風通过 `task_handoff`/`morning_brief_handoff` 转交，只有专用工具成功收据才算 applied。
4. 跨轮正式任务调用 `task_intake start`，建立唯一 managed 父 Flow、Workboard 卡和真实 worker；评论、拆分或“已派发”不能标记完成。
5. 研究/计划/三审任务必须冻结计划 SHA-256，连续完成三次各自独立完整审查；计划变化清空三审。
6. controller 关联真实 run、Task、mirrored Flow、proof 与终态；重启后 reconcile，重复事件幂等处理。
7. 实施 → 验收 → 文档 → GitHub 同步按顺序推进；失败、活动子项或证据不足均阻止最终通知。
8. 最终通知由賈南風发送一次，真实 Telegram message ID 回写后才算完成；unknown 不自动重发。

风险执行仍为低风险自动、中风险内部预检、高风险自然询问一次。所有用户可见答复禁止 Card/Task/Host/CWD/UUID/session/run/claim/heartbeat 等工业字段。

两个旧 Workboard 分钟 job 已在 30.3 分钟生产验收后停用，定义和历史保留。正常 CodexResetWatcher、晨报和其他 Cron 不受影响。
