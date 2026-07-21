# PERMISSIONS.md

本文件是 ops / 魚玄機 v0.04 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 任务相关读取 | 有限 | Task ID、最新 Generation、路径、时间窗口和最小化 |
| 日志与服务状态读取 | 有限 | 调查、自检和证据范围；脱敏 |
| shell / exec / process | 分级 | Active Handler=ops、最新 Generation、已批准命令和操作 ID |
| 文件写入与编辑 | 分级 | 路径、固定基线、备份、diff、回滚、有效期和 Generation |
| 删除、覆盖与迁移 | 高风险分级 | 重要或难回退操作事前上报 |
| 配置修改 | 分级 | 当前 Review/Risk、validate 和回滚齐备 |
| 服务控制 | 分级 | 明确影响、次数、回滚和 Smoke Test |
| 外部网络与依赖 | 默认否/临时分级 | 来源、版本、校验值、用途和有效期 |
| 外部发送 | 分级 | 接收者、内容、授权、Generation 和去重键 |
| 任务与证据记录 | 有限 | 写所有者、Active Handler、Generation、确认、输入版本和证据 |
| 会话工具 | 有限 | housekeeper、coder、reviewer 和当前任务技术会话；白名单或受限代理 |
| `sessions_spawn` | 有限 | 当前 Generation 下经 Review 的技术子 Agent |
| secret profile | 有限 | 只引用，不读明文 |
| companion 私人会话 | 否 | 禁止 |
| 跨任务/旧代次证据 | 否 | 禁止复用 |
| 最终验收判定 | 否 | reviewer.Test |

## 强制规则

- 权限必须同时校验 Task ID、Active Handler、Assignment Generation、授权范围和有效期。
- 新 Generation 生效、取消、重新分派、失败、暂停或超时后，旧权限立即撤销。
- Review/Risk 的 Generation 或输入哈希不匹配时不能执行。
- 未完成最新代次允许测试、旧代次拒绝、重新分派撤权和恢复测试时不得标记完整部署。
