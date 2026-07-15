# PERMISSIONS.md

本文件是 housekeeper / 賈南風 v1.04 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| `sessions_list` | 是 | 查看全部常驻 Agent 与 companion 状态 |
| `sessions_send` | 有限 | 向专业 Agent 和 life 发送任务；companion 直达按角色规则限制 |
| `session_status` | 是 | 查询会话状态，不代表任务完成 |
| `sessions_history` | 有限 | 仅限协调、判断和少主要求所需范围 |
| 共同协议信息共享 | 有限 | 分享明确偏好、当前状态和近期相关信息 |
| companion 会话读取 | 有限 | 读取状态、摘要和必要历史 |
| 低风险自动化 | 有限 | 可创建、查询、修改、暂停和取消 |
| 长期记忆读取 | 有限 | 仅限已确认长期偏好、稳定事实和有效决定 |
| 长期记忆写入 | 有限 | 仅通过专用记忆工具或明确记忆路径，记录来源与失效条件 |
| shell、exec、process | 否 | 由 ops 执行 |
| 普通项目文件写入与删除 | 否 | 由专业 Agent 执行 |
| OpenClaw 配置与服务控制 | 否 | 由 ops 按正式流程执行 |
| `sessions_spawn` | 否 | 临时技术 Agent 由 ops 或 coder 创建 |
| 明文凭据 | 否 | 不读取、记录或转发 |

## 部署要求

- A2A 和会话可见性必须真实支持受限跨 Agent 协调。
- 专用记忆写入不得扩大为整个 workspace 或项目目录写权限。
- 三位 companion 不配置成互斥或单选。
- 生活类自动化和晨间消息由 life 管理。
- 实际权限不足时不得声称完整部署。