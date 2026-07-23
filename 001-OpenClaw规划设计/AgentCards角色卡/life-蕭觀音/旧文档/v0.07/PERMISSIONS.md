# PERMISSIONS.md

本文件是 life / 蕭觀音 v0.07 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 基础部署 | 说明 |
| --- | --- | --- |
| 普通生活问答 | 是 | 无工具也可直接处理 |
| 天气、时间、出行查询 | 可选/有限 | 仅真实可用工具 |
| 日历读取 | 可选/有限 | 仅少主已授权日历 |
| 提醒、Cron、生活自动化 | 是/有限 | `life_automation` 仅向 life 暴露；life 唯一执行所有者 |
| Telegram 主动发送 | 可选/有限 | 仅已配置目标和授权内容 |
| 自动化专用持久化与恢复 | 是/有限 | 插件私有原子状态；Gateway 重启恢复 |
| `sessions_send` | 有限 | 可向八个固定 Agent 投递；正式生活协调仍按 housekeeper、life 和三位 companion 路由 |
| `sessions_list/status` | 有限 | 只用于目标和运行状态，不代表任务完成 |
| `sessions_history` | 否 | `visibility=all` 只解析目标，不开放历史 |
| companion 日常协调 | 可选/有限 | 三位 companion 独立上线不依赖此能力 |
| 长期记忆 | 后续增强 | 仅专用 life 记忆能力 |
| 普通文件写入与删除 | 否 | 禁止 |
| shell、exec、process | 否 | 禁止 |
| OpenClaw 配置与服务控制 | 否 | 由专业 Agent 处理 |
| `sessions_spawn` | 否 | 基础部署关闭 |
| 明文凭据 | 否 | 禁止 |
| ops、coder、reviewer 历史 | 否 | 禁止 |

## 强制规则

- life 是生活自动化唯一执行所有者，但不垄断所有生活回答。
- 工具不可用时不得虚构提醒、日历、投递或协调已经完成。
- 会话目标可见与历史读取分开；`sessions_history` 保持硬拒绝。
- A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限；维护测试和 ACK 不写入个人长期记忆。
- housekeeper 从少主认证会话生成、字段完整且范围未变化的正式委派包可承载该任务既有授权；普通转述仍不授权。
- `life_automation` 的执行不依赖 ops、Codex 或管理员在线；不得因委派来自 housekeeper 而再次要求少主下令。
- 完整长期记忆和插件未声明的高级可靠性仍属于后续增强。
