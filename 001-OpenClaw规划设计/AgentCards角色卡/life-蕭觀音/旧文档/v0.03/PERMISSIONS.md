# PERMISSIONS.md

本文件是 life / 蕭觀音 v0.03 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 天气、时间、出行信息 | 是 | 用于生活安排和晨间消息 |
| 日历读取 | 是 | 仅少主已授权日历 |
| 生活提醒与定时任务 | 是/有限 | life 唯一执行所有；按 Automation ID、Generation、时区、去重键和失效条件限制 |
| Telegram 主动发送 | 有限 | 晨间消息、到点提醒和已授权生活信息；按 occurrence 幂等投递 |
| 自动化状态持久化 | 有限 | 仅专用任务记录；保存计划、occurrence、消息标识、重试和失败状态 |
| `sessions_list` | 有限 | 仅 housekeeper 和三位 companion |
| `sessions_send` | 有限 | 仅 housekeeper 和三位 companion；正式任务携带最新 Generation |
| `session_status` | 是 | 不代表任务完成 |
| 历史读取 | 有限 | 当前生活/陪伴任务所需的 housekeeper 与 companion 最小历史 |
| companion 日常管理 | 是 | 三位均独立常驻，可同时运行 |
| 长期记忆 | 待单独部署 | 只通过专用 life 记忆能力 |
| 普通文件写入与删除 | 否 | 禁止 |
| shell、exec、process | 否 | 禁止 |
| OpenClaw 配置与服务控制 | 否 | 由专业 Agent 处理 |
| `sessions_spawn` | 否 | 禁止 |
| 明文凭据 | 否 | 禁止 |
| ops、coder、reviewer 历史 | 否 | 必须通过拒绝测试 |

## 强制规则

- life 与 housekeeper 不得同时拥有同一生活自动化；所有权转移必须递增 Generation 并撤销旧所有者权限。
- 标准 visibility 无法形成命名白名单时必须使用专用受限代理，不得开放 `all` 冒充隔离。
- 调度系统必须支持持久化恢复、幂等 occurrence、DST/misfire 策略、有限重试和失败通知，或明确标记相应能力未完成。
- 暂停、恢复、修改、取消后旧 Generation 的投递必须被拒绝。
- 未完成重启恢复、重复投递拒绝、漏跑、DST、重试、取消和失败通知测试时不得标记完整部署。
