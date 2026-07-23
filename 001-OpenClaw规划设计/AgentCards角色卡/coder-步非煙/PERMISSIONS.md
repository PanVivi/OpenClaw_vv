# PERMISSIONS.md

本文件是 coder / 步非煙 v0.07 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 方案/任务读取 | 有限 | 当前 Task、Handler、Generation、方案 Stage Record 和哈希 |
| 隔离 workspace 写入 | 有限 | 初次实现需一次性 Review 通过记录；增强层再校验 Review Gate；返工需失败 Stage Record、新处理轮次和不变方案哈希 |
| 文件删除 | 有限 | 当前代次自产且明确允许 |
| 静态检查/单测/构建 | 有限 | 禁止生产网络、服务、数据和私人数据 |
| 外部网络/依赖 | 默认否/临时有限 | 来源、版本、锁文件、校验、成本、缓存和当前代次 |
| 测试 secret profile | 极有限 | 明确授权隔离测试，不读明文 |
| 产物/证据记录 | 有限 | 基础层记录 Task、Generation、Stage/Review、方案/产物哈希；增强层再记录 Gate |
| 生产 shell、文件、配置、数据库、服务、部署、外部发布 | 否 | 全部禁止 |
| `sessions_list/send/status` | 有限 | 可解析八个固定 Agent；正式工程路由仍限 housekeeper、ops、reviewer 和当前任务技术会话 |
| `sessions_history` | 否 | 目标可见不等于历史可读 |
| `sessions_spawn` | 基础否/增强有限 | 基础上线关闭；增强层在当前 coder 处理权下经 Review 创建子 Agent |
| companion、跨任务或旧代次历史 | 否 | 禁止 |

## 强制规则

- Assignment Generation 授予处理权；初次隔离实现还需一次性 Review 通过记录，增强层再校验有效 Review Gate。
- 正常指定交接使用一次 Review 通过记录；增强层同步消费 Gate，不因预期 Generation 递增自动失效。
- Review 授权只能使用一次且不能用于返工或生产执行。
- 返工必须有新 coder 处理轮次和当前失败记录；增强层再建立新 Generation；方案改变必须重新方案 Review。
- 未完成硬单次消费、重复/错误目标拒绝、返工不复用、旧处理权和生产拒绝测试时，不得把对应增强能力标记为已完成。
- 基础部署可用当前会话结构化方案 Review 记录授权一次隔离实现；上下文丢失、方案变化、错误目标或重复使用时必须重新 Review。
- 专用持久化、目标 Generation、硬单次消费、精细 A2A 路由与历史授权、技术子 Agent 的未完成只限制增强状态，不阻塞基础角色上线。
- A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限；维护测试和 ACK 不写入个人长期记忆。
