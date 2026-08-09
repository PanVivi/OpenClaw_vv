# Morning Brief Control

OpenClaw 2026.7.1-2 原生 Tool Plugin。它只向 `life` 暴露 `morning_brief_control`，只向 `housekeeper` 暴露 `morning_brief_handoff`。

- `life` 可维护晨报事件、生活待办、模块备注、偏好和日期化地点覆盖，并查询唯一晨报运行状态。
- `housekeeper` 只能提交持久转交；转交必须由 `life` 使用 `apply_handoff` 实际写入后才是 `applied`。
- 天气、AQI、农历、系统任务和 Agent 在线事实不接受人工覆盖。
- 非默认事件默认提前 60 分钟，由插件的持久提醒状态投递一次；不确定结果不自动重发。
- 动态数据固定存于 life owner 目录，目录 `0700`、文件 `0600`，不保存 token 或完整聊天正文。

生产配置必须明确提供 `ownerRoot`、`stateRoot`、`runtimeStatusPath` 和 `ownerChatId`。插件拒绝非 `life` / `housekeeper` 身份配置。
