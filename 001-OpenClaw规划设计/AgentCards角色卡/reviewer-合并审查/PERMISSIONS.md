# PERMISSIONS.md

本文件是 reviewer / 夏姬（合并审查）v0.04 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 当前任务材料读取 | 有限 | Task、阶段、受审 Generation、输入哈希和环境 |
| 无副作用审查/测试 | 有限 | 不修改待审或生产对象 |
| 当前会话 Stage/通过记录 | 有限 | 基础层使用；特定材料审查事实、结论、唯一下一跳、范围和失效条件 |
| 专用 Stage/Gate Record 写入 | 增强有限 | 仅由通过/附条件通过 Stage 生成 Gate；唯一下一跳、目标 Generation、单次消费 |
| 项目/生产写入、shell、配置、服务、部署、删除 | 否 | 保持独立 |
| 会话工具 | 有限 | housekeeper、ops、coder、当前任务技术会话；白名单/代理 |
| `sessions_spawn`、明文凭据、companion 历史 | 否 | 禁止 |

## 强制规则

- Assignment Generation 管处理权；当前会话 Stage/通过记录管基础层审查事实和一次指定过渡；增强层的 Stage/Gate Record 提供专用持久化与硬门控。
- 增强层的正常指定交接不使 Gate 因预期 Generation 递增自我失效。
- 增强层 Gate 只能消费一次；错误目标、重复消费、材料变化、取消、过期或非预期改派拒绝。
- 增强层中，reviewer 不能自行改变 task controller 预留的目标 Generation 或扩大下一跳范围。
- Test 不签发执行 Gate。
- 未完成硬单次消费、重复/错误目标、材料变化、取消、Test 无 Gate 和生产写入拒绝测试时，不得把对应增强能力标记为已完成。
- 基础部署可用当前会话结构化 Stage 与 Review/Risk 记录代替专用存储，但必须绑定受审材料、唯一下一角色和范围，只在可核对上下文内使用一次。
- 专用持久化、目标 Generation、硬单次消费和精确 A2A 的未完成只限制增强状态，不阻塞基础 reviewer 上线。
