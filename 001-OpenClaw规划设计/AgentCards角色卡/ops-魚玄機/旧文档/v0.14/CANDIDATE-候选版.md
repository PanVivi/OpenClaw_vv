# CANDIDATE 候选版

当前根目录为 v0.14 候选版。基础部署验收五文件、任务级授权、三档 Risk、只读调查、Review 执行拒绝、ops 专用免逐命令宿主审批、最小权限、工程流、熔断、回滚和同角色技术子 Agent；硬 Gate、专用持久化、精细 A2A 路由与历史授权后续独立验收。

本版完整继承 v0.13 的原生 Telegram 绑定、workspace 文件工具、人格、工程职责、三档 Risk 与同一 ops 的单层隔离子 Agent。增量将 ops 的 NAS Gateway `exec/process` 改为配置层与 host approvals 双层免提示，避免把已授权任务拆成逐命令批准；同时允许自动使用任务必需、官方固定版本、可校验、无额外费用、非系统级且可删除的临时工具。生产副作用仍受处理权、任务级 Risk、备份、回滚与 Test 约束；只在高风险或必要输入缺失时暂停，不开放任意 Gateway RPC、Cron、跨会话历史或任意外发消息。
