# PERMISSIONS.md

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 方案与项目读取 | 有限 | 仅任务相关 |
| 隔离实现 workspace 写入 | 是 | 仅当前 Task ID |
| 本地静态检查/单测/构建 | 有限 | 不接触生产 |
| 生产 shell / exec | 否 | 由 ops 执行 |
| 生产文件与配置写入 | 否 | 由 ops 执行 |
| 服务控制与部署 | 否 | 由 ops 执行 |
| `sessions_list/send/history/status` | 有限 | 仅 housekeeper、ops、reviewer 和任务技术会话 |
| `sessions_spawn` | 有限 | 经 reviewer.Review 的实现子 Agent |
| 明文凭据 | 否 | 禁止 |
| companion 私人会话 | 否 | 不属于职责 |

权限必须以真实 sandbox、路径和 allow/deny 落实。
