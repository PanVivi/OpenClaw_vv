# OpenClaw 部署方案｜v0.13｜晨报与治理增量

本版完整继承 v0.12。当前生产增量为：

- 应用：`hehuan-daily` v2 运行路径，真实输入和状态位于 OpenClaw state，不进 Git。
- 插件：`morning-brief-control 1.0.2`、`life-automation 1.1.0`、`ops-controlled-exec 1.0.0`、`workflow-governance 1.0.2`。
- 技能：`morning-brief-control` 与 `workflow-execution`。
- 角色：life v0.14、housekeeper v1.17；ops 身份和 binding 不变。
- Cron：晨报 `0 6 * * *` / `Asia/Shanghai`；旧 Workboard 两个一分钟 Cron 因上游 Hook 缺失暂保留。

部署必须执行：空闲门 → 备份 → staging/hash → 本地与生产自测 → 原子替换 → 必要时一次受控 Gateway 重载 → 插件/角色/绑定/Cron/动态数据/Telegram 验收。unknown 消息不得因部署或回滚重发。

