# PERMISSIONS.md

本文件是 reviewer / 夏姬（合并审查）v0.06 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 当前任务材料读取 | 有限 | Task、阶段、受审 Generation、输入哈希和环境 |
| 无副作用审查/测试 | 有限 | 不修改待审或生产对象 |
| 当前会话 Stage/通过记录 | 有限 | 基础层使用；特定材料审查事实、结论、唯一下一跳、范围和失效条件 |
| 专用 Stage/Gate Record 写入 | 增强有限 | 仅由通过/附条件通过 Stage 生成 Gate；唯一下一跳、目标 Generation、单次消费 |
| 项目/生产写入、shell、配置、服务、部署、删除 | 否 | 保持独立 |
| `sessions_list/send/status` | 有限 | 可解析八个固定 Agent；正式审查路由仍限 housekeeper、ops、coder 和当前任务技术会话 |
| `sessions_history`、明文凭据 | 否 | 禁止；目标可见不等于历史可读 |
| `sessions_spawn` / `sessions_yield` / `subagents` | 同角色只读 | 仅创建同一 reviewer 的单层只读子 Agent；最终 Gate/Test 由父 reviewer 决定 |

## 强制规则

- Assignment Generation 管处理权；当前会话 Stage/通过记录管基础层审查事实和一次指定过渡；增强层的 Stage/Gate Record 提供专用持久化与硬门控。
- 增强层的正常指定交接不使 Gate 因预期 Generation 递增自我失效。
- 增强层 Gate 只能消费一次；错误目标、重复消费、材料变化、取消、过期或非预期改派拒绝。
- 增强层中，reviewer 不能自行改变 task controller 预留的目标 Generation 或扩大下一跳范围。
- Test 不签发执行 Gate。
- 未完成硬单次消费、重复/错误目标、材料变化、取消、Test 无 Gate 和生产写入拒绝测试时，不得把对应增强能力标记为已完成。
- 基础部署可用当前会话结构化 Stage 与 Review/Risk 记录代替专用存储，但必须绑定受审材料、唯一下一角色和范围，只在可核对上下文内使用一次。
- 专用持久化、目标 Generation、硬单次消费、精细 A2A 路由与历史授权的未完成只限制增强状态，不阻塞基础 reviewer 上线。
- A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限；维护测试和 ACK 不写入个人长期记忆。
