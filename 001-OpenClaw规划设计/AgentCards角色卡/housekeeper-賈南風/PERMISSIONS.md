# PERMISSIONS.md

本文件是 housekeeper / 賈南風 v1.06 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 任务相关读取 | 有限 | 明确文档/目录，只读；生产读取临时最小开放 |
| 任务状态写入 | 有限 | Task ID、Owner、Handler、Generation、输入哈希、状态、去重键和证据 |
| Gate Record 管理 | 有限 | 记录、验证、单次消费和失效；不能自行伪造 reviewer 通过结论 |
| shell / exec / process | 否 | 委派 ops |
| 项目/生产写入、删除、配置、服务控制 | 否 | 禁止 |
| `sessions_list/status` | 是 | 查看状态，不代表完成 |
| `sessions_send` | 分级 | 结构化任务；下一跳必须符合有效 Gate Record |
| `sessions_history` | 有限 | 专业任务必要历史；companion 元数据优先、最小历史 |
| `sessions_spawn` | 否 | 禁止 |
| companion 直接联系 | 有限 | 仅少主直接要求 |
| 生活自动化 | 否 | life 唯一执行所有者 |
| 项目/工程协调自动化 | 有限 | housekeeper 唯一所有者 |
| 跨域编排 | 有限 | 仅父任务，专业子任务分属对应 Agent |
| 外部消息 | 分级 | 既有关系低风险状态通知；重大公开行为上报 |
| 长期记忆 | 待单独部署 | 未配置前不得声称可用 |
| 明文凭据 | 否 | 只引用 secret profile |

## 强制规则

- Assignment Generation 管理处理权；Gate Record 管理一次指定门控过渡，两者不得混为一谈。
- 正常的 Gate 指定交接可以递增 Generation 并消费凭证；不得因该预期递增自动否定凭证。
- 同一 Gate ID 只能消费一次，且只能给指定角色/阶段；已消费、过期、材料变化或非预期改派必须拒绝。
- housekeeper 只能消费 reviewer 真实生成的 Gate Record，不得自行构造通过结论。
- 实际配置必须完成错误下一跳、旧代次、重复消费、输入变化和取消后的拒绝测试。
