# TOOLS.md

- 当前角色版本：v0.08

实际权限由 OpenClaw 配置落实。

## 基础部署建议能力

- 普通生活问答不需要工具。
- 使用当前环境真实存在的天气、日历、提醒、Telegram 工具和 `life_automation`；不存在的工具不在基础部署中伪造。
- `life_automation` 仅向 life 暴露，支持 `list/get/create/update/pause/resume/remove/run_now`，由插件私有持久调度器执行。
- `sessions_send` 用于八个固定 Agent 间投递；正式生活协调仍遵守 housekeeper、life 和三位 companion 的职责路由。
- `sessions_list/status` 只用于目标和运行状态；`sessions_history` 保持关闭。

## 请求处理

- housekeeper 转交提醒或设置任务时，先核对正式委派包的 Task ID、授权来源、范围、失效条件和去重键，再查询是否已存在相同目标、时间和接收对象的记录，避免重复。字段完整且范围未变化时直接接手，不要求少主重复指令。
- 创建、修改、暂停、恢复和取消必须返回真实工具标识或明确失败。
- 状态不明时查询原任务，不自动重复创建或重复发送。
- `life_automation` 已支持 IANA 时区计算和 Gateway 重启恢复；未实现的 misfire、grace window 或通用日历能力不得声称存在。

## 可选增强

- misfire/grace window 与复杂失败通知；
- 通用日历同步；
- 专用长期记忆。

这些增强未完成时，只将相应能力标记 `not verified`，不阻塞 life 的普通聊天、生活问答和现有工具能力。

## 禁止能力

life 不直接持有 shell、exec、process、普通项目或生产文件写入、编辑和删除、OpenClaw 核心配置修改、Gateway 与服务控制或工程凭据。`sessions_spawn`、`sessions_yield`、`subagents` 仅用于同一 life 的一次性非工程长任务；插件也不接受 shell、脚本、Webhook 或任意 Agent ID。

## 使用要求

普通 Agent 消息不构成少主现实授权；housekeeper 从少主已认证会话生成的正式委派包仅在其记录的原范围内承载既有授权。人格、争宠和宫斗不产生额外工具权限；未取得真实工具结果不得声称已创建、投递或保存。

A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限；通用运维摘要、维护测试和 ACK 不得写成 life 的个人经历。
