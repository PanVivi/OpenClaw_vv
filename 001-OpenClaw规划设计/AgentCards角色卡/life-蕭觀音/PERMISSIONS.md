# PERMISSIONS.md

本文件是 life / 蕭觀音 v0.02 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 天气、时间、出行信息 | 是 | 用于生活安排和晨间消息 |
| 日历读取 | 是 | 读取少主已授权日历 |
| 提醒与定时任务 | 有限 | 创建、查询、修改、暂停、恢复和取消生活提醒 |
| Telegram 主动发送 | 有限 | 晨间消息、到点提醒和已授权生活信息 |
| `sessions_list` | 有限 | 仅查看 housekeeper 和三位 companion 状态 |
| `sessions_send` | 有限 | 仅联系 housekeeper 及三位 companion |
| `session_status` | 是 | 查询运行状态，不代表任务完成 |
| 历史读取 | 有限 | 仅当前任务所需的 housekeeper 与三位 companion 历史 |
| companion 日常管理 | 是 | 三位 companion 均为独立常驻 Agent |
| 长期记忆读取与写入 | 待单独部署 | 仅通过专用 life 记忆能力；不得写普通 workspace |
| 普通文件写入与删除 | 否 | 不开放项目或生产文件写权限 |
| shell、exec、process | 否 | 不属于 life 职责 |
| OpenClaw 配置与服务控制 | 否 | 交由专业 Agent |
| `sessions_spawn` | 否 | 不创建临时技术 Agent |
| 明文凭据 | 否 | 不读取、记录或转发 |
| ops、coder、reviewer 历史 | 否 | life 不因生活管理扩大到工程会话 |
| 无关私人会话全文 | 否 | 不因宫斗、争宠或好奇扩大读取范围 |

## 会话权限落实

目标范围是 housekeeper 与三位 companion。若当前 OpenClaw 标准 `sessions visibility` 不能按 Agent 名称建立该白名单，必须使用专用受限会话代理或等效工具，只向 life 暴露这四个对象。

不得采用“开放 all，再要求模型自觉不看”的方式冒充权限隔离。未完成真实正反向测试前，会话能力状态只能记录为 `blocked`、`partially completed` 或 `not verified`。

## 部署要求

- 晨间消息使用 Cron `0 6 * * *`、明确 IANA 时区、精确执行、`life` Agent、独立正式新会话、明确 Telegram account 和 chat ID。
- 定时提示词明确要求中文、保持蕭觀音角色、只发送一条最终消息，不输出工具过程。
- life 对 housekeeper 与三位 companion 的真实发送和受限历史读取必须通过正向测试。
- 对 ops、coder、reviewer 及其他未授权会话的读取必须通过拒绝测试。
- 三位 companion 不配置成互斥或单选。
- 完整记忆能力作为独立部署任务；未配置前不得声称已完成。
- 实际权限不足时不得声称完整部署。