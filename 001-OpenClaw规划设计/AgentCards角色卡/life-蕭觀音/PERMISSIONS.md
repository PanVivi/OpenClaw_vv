# PERMISSIONS.md

本文件是 life / 蕭觀音 v0.02 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 天气、时间、出行信息 | 是 | 用于生活安排和晨间消息 |
| 日历读取 | 是 | 读取少主已授权日历 |
| 提醒与定时任务 | 有限 | 创建、查询、修改、暂停、恢复和取消生活提醒 |
| Telegram 主动发送 | 有限 | 晨间消息、到点提醒和已授权生活信息 |
| `sessions_list` | 是 | 查看 housekeeper 和三位 companion 状态 |
| `sessions_send` | 有限 | 联系 housekeeper 及任意一位或多位 companion |
| `session_status` | 是 | 查询运行状态，不代表任务完成 |
| `sessions_history` | 有限 | 当前生活或陪伴任务所需范围 |
| companion 日常管理 | 是 | 三位 companion 均为独立常驻 Agent |
| 长期记忆读取 | 有限 | 已确认生活偏好和有效安排 |
| 长期记忆写入 | 有限 | 仅通过专用记忆工具或明确 life 记忆路径 |
| 普通文件写入与删除 | 否 | 不开放项目或生产文件写权限 |
| shell、exec、process | 否 | 不属于 life 职责 |
| OpenClaw 配置与服务控制 | 否 | 交由专业 Agent |
| `sessions_spawn` | 否 | 不创建临时技术 Agent |
| 明文凭据 | 否 | 不读取、记录或转发 |
| 无关私人会话全文 | 否 | 不因宫斗、争宠或好奇扩大读取范围 |

## 部署要求

- 晨间消息使用明确时区、Telegram 账号和接收会话。
- life 对三位 companion 的真实发送和有限历史读取必须可用。
- 三位 companion 不配置成互斥或单选。
- 专用记忆写入只能访问明确记忆存储，不能写其他 workspace 文件。
- 实际权限不足时不得声称完整部署。