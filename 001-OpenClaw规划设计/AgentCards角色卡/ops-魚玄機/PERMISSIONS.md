# PERMISSIONS.md

本文件是 ops / 魚玄機 v0.05 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 任务相关读取 | 有限 | Task ID、当前处理权、路径、窗口和最小化 |
| shell / exec / process | 分级 | 当前 ops Generation + 有效一次性 Risk Gate + 已审命令哈希 |
| 文件/配置写入 | 分级 | 当前执行代次、Risk Gate、路径、基线、备份、回滚和有效期 |
| 删除/迁移/服务控制 | 高风险分级 | 当前 Risk Gate；重要或难回退事前上报 |
| 外部网络/依赖 | 默认否/临时分级 | 来源、版本、校验、用途、代次和有效期 |
| 外部发送 | 分级 | 接收者、内容、现实授权、执行代次和幂等键 |
| 任务/Gate/证据记录 | 有限 | 写 Owner、Handler、Generation、确认、Gate 状态、哈希和证据 |
| 会话工具 | 有限 | housekeeper、coder、reviewer、当前任务技术会话；白名单/代理 |
| `sessions_spawn` | 有限 | 当前处理代次下经 Review 的技术子 Agent |
| secret profile | 有限 | 只引用不读明文 |
| companion、跨任务或旧代次证据 | 否 | 禁止 |
| 最终验收 | 否 | reviewer.Test |

## 强制规则

- Assignment Generation 只授予处理权；生产执行必须额外持有指定当前 ops Generation 的有效 Risk Gate。
- 正常指定交接消费 Gate，不得因 Generation 预期递增自动判定 Gate 失效。
- Gate 错误目标、重复消费、材料/哈希变化、取消、过期或非预期改派必须拒绝。
- 未完成 Gate 单次消费、Review Gate 执行拒绝、错误下一跳、旧处理权、重新分派和恢复测试时不得标记完整部署。
