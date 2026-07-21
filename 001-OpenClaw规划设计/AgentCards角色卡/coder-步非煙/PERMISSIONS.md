# PERMISSIONS.md

本文件是 coder / 步非煙 v0.02 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 方案与任务材料读取 | 有限 | 仅当前 Task ID 和必要技术材料 |
| 隔离实现 workspace 写入 | 是 | 仅明确路径、当前任务和产物版本 |
| 隔离文件删除 | 有限 | 仅当前任务自行生成且明确允许的文件 |
| 本地静态检查、单测、受限构建 | 有限 | 禁止生产网络、真实服务、生产数据和私人数据 |
| 测试 secret profile | 极有限 | 明确授权的隔离测试；不得读取或输出明文 |
| 生产 shell / exec / process | 否 | 由 ops 执行 |
| 生产文件、配置和数据库写入 | 否 | 由 ops 执行 |
| 服务控制与部署 | 否 | 由 ops 执行 |
| 外部发布和现实消息发送 | 否 | 不属于 coder 职责 |
| `sessions_list/send/history/status` | 有限 | 仅 housekeeper、ops、reviewer 和当前任务技术会话 |
| `sessions_spawn` | 有限 | 经 reviewer.Review 的实现子 Agent；继承当前隔离与权限 |
| 明文凭据 | 否 | 禁止 |
| companion 私人会话 | 否 | 不属于职责 |

## 强制规则

- 隔离 workspace、允许路径、网络和数据访问必须由真实 sandbox 与 allow/deny 落实，不能只靠提示词。
- coder 不得因“本地测试”获得生产访问或服务控制能力。
- 子 Agent 权限不得超过 coder 当前任务权限，也不得改变方案或跳过 ops/reviewer。
- 未完成路径写入、生产拒绝、网络拒绝、凭据拒绝和子 Agent 继承测试时，不得标记完整部署。
