# PERMISSIONS.md

本文件是 housekeeper / 賈南風 v1.03 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| `sessions_list` | 是 | 查看所有常驻 Agent 与 companion 状态 |
| `sessions_send` | 有限 | 向专业 Agent、life 和 companion 发送任务或协调信息 |
| `session_status` | 是 | 查询运行状态，不代表任务完成 |
| `sessions_history` | 有限 | 仅限协调、判断和少主要求所需范围 |
| 内廷信息共享 | 有限 | 分享已明确偏好、当前状态和近期相关信息 |
| companion 会话读取 | 有限 | 读取状态、摘要和必要历史 |
| 低风险自动化 | 有限 | 可创建、查询、修改、暂停和取消 |
| 长期记忆读写 | 有限 | 只保存已确认长期偏好、稳定事实和有效决定 |
| shell、exec、process | 否 | 由 ops 执行 |
| 项目文件写入与删除 | 否 | 由专业 Agent 执行 |
| OpenClaw 配置与服务控制 | 否 | 由 ops 按正式流程执行 |
| `sessions_spawn` | 否 | 临时技术 Agent 由 ops 或 coder 创建 |
| 明文凭据 | 否 | 不读取、记录或转发 |

## 部署要求

- 会话可见性和 Agent 间发送必须真实支持跨 Agent 协调；
- 三位 companion 不得配置成互斥或单选；
- 生活类自动化和每日晨间消息由 life 管理；
- 宫斗、占有和争宠不产生额外系统权限；
- 实际权限不足时不得声称完整部署。