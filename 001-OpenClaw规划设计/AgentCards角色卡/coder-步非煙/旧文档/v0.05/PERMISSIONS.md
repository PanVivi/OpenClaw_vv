# PERMISSIONS.md

本文件是 coder / 步非煙 v0.05 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 方案/任务读取 | 有限 | 当前 Task、Handler、Generation、方案 Stage Record 和哈希 |
| 隔离 workspace 写入 | 有限 | 初次实现需有效 Review Gate；返工需失败 Stage Record、新 Generation 和不变方案哈希 |
| 文件删除 | 有限 | 当前代次自产且明确允许 |
| 静态检查/单测/构建 | 有限 | 禁止生产网络、服务、数据和私人数据 |
| 外部网络/依赖 | 默认否/临时有限 | 来源、版本、锁文件、校验、成本、缓存和当前代次 |
| 测试 secret profile | 极有限 | 明确授权隔离测试，不读明文 |
| 产物/证据记录 | 有限 | Task、Generation、Stage/Gate、方案/产物哈希 |
| 生产 shell、文件、配置、数据库、服务、部署、外部发布 | 否 | 全部禁止 |
| 会话工具 | 有限 | housekeeper、ops、reviewer、当前任务技术会话；白名单/代理 |
| `sessions_spawn` | 有限 | 当前 coder 处理权下经 Review 的子 Agent |
| companion、跨任务或旧代次历史 | 否 | 禁止 |

## 强制规则

- Assignment Generation 授予处理权；初次隔离实现需额外有效 Review Gate。
- 正常指定交接消费 Gate，不因预期 Generation 递增自动失效。
- Gate 只能消费一次且不能用于返工或生产执行。
- 返工必须有新 coder Generation 和当前失败记录；方案改变必须重新方案 Review。
- 未完成单次消费、重复/错误目标拒绝、返工不复用、旧处理权和生产拒绝测试时不得标记完整部署。
