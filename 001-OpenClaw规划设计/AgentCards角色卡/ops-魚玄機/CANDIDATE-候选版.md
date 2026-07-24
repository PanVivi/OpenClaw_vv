# CANDIDATE 候选版

当前根目录为 v0.15 候选版。完整继承 v0.14，并增加 Workboard worker 的 claim、heartbeat、proof、complete/block 与重启恢复契约；原有任务授权、Risk、执行和工具边界不变。

本版完整继承 v0.13 的原生 Telegram 绑定、workspace 文件工具、人格、工程职责、三档 Risk 与同一 ops 的单层隔离子 Agent。增量将 ops 的 NAS Gateway `exec/process` 改为配置层与 host approvals 双层免提示，避免把已授权任务拆成逐命令批准；同时允许自动使用任务必需、官方固定版本、可校验、无额外费用、非系统级且可删除的临时工具。生产副作用仍受处理权、任务级 Risk、备份、回滚与 Test 约束；只在高风险或必要输入缺失时暂停，不开放任意 Gateway RPC、Cron、跨会话历史或任意外发消息。
