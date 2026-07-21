# PERMISSIONS.md

本文件是 coder / 步非煙 v0.04 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 方案与任务材料读取 | 有限 | 当前 Task ID、Active Handler、最新 Generation、固定基线和必要材料 |
| 隔离 workspace 写入 | 是/有限 | 仅最新代次授权路径和产物版本；写入前核对基线 |
| 隔离文件删除 | 有限 | 当前代次自行生成且明确允许的文件 |
| 静态检查、单测、构建 | 有限 | 禁止生产网络、服务、数据和私人数据 |
| 外部网络与依赖 | 默认否/临时有限 | 来源、版本、锁文件、校验值、许可证/成本、缓存位置和 Generation |
| 测试 secret profile | 极有限 | 明确授权隔离测试；不得读取明文 |
| 产物与证据记录 | 有限 | 绑定 Task ID、Generation、方案/产物哈希和校验值 |
| 生产 shell / exec / process | 否 | 由 ops 执行 |
| 生产文件、配置和数据库 | 否 | 禁止 |
| 服务控制与部署 | 否 | 禁止 |
| 外部发布和现实消息 | 否 | 禁止 |
| 会话工具 | 有限 | housekeeper、ops、reviewer 和当前任务技术会话；白名单或受限代理 |
| `sessions_spawn` | 有限 | 当前 Generation 下经 Review 的实现子 Agent |
| 明文凭据 | 否 | 禁止 |
| companion 私人会话 | 否 | 禁止 |
| 其他任务、旧代次产物与历史 | 否 | 禁止访问或复用 |

## 强制规则

- 权限同时校验 Task ID、Active Handler、Assignment Generation、方案哈希、路径和有效期。
- 新代次、取消、重新分派、失败、暂停或超时后旧权限及子 Agent 权限立即撤销。
- reviewer 结论的 Generation 或产物哈希不匹配时不得交付为通过。
- 未完成最新代次写入、旧代次拒绝、转交撤权、跨重启恢复和生产拒绝测试时不得标记完整部署。
