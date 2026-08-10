# OpenClaw 部署方案｜v0.14｜任务系统事件化切换

本版完整继承 v0.13。生产新增：

- 插件：`task-system-control 1.0.0`、`workflow-governance 1.1.0`、`housekeeper-workboard-control 1.1.0`。
- 角色：housekeeper、ops、life 的工作流入口说明更新；名称、agentId、Telegram account 和 binding 不变。
- 状态：任务 intake、handoff、风险决定与 managed Flow 均持久化在 OpenClaw state，不进 Git。
- 调度：WorkboardDispatchPump 与 WorkboardNotificationRelay 定义保留但 disabled；晨报、CodexResetWatcher 等无关 Cron 不变。

标准部署顺序：空闲门 → staging/hash → 配置/插件/角色备份 → 候选 schema 校验 → 原子替换 → registry refresh → 必要时一次安全 Gateway 重启 → plugin/identity/module/handoff/risk/Telegram 验收 → 30 分钟 shadow → 停用旧分钟任务。失败时恢复 manifest 与旧 Cron 状态，不删除历史，不自动重发 unknown。

conversation hook 只能对确有需要的两个插件设置 `hooks.allowConversationAccess=true`；其他插件不得顺带开放。依赖必须来自已验证版本或锁文件，不在生产临时联网安装。
