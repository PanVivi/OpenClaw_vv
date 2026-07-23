# PERMISSIONS.md

本文件是 reviewer / 合并审查 v0.03 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 当前任务材料读取 | 有限 | Task、阶段、受审 Generation、输入哈希和环境 |
| 无副作用审查/测试 | 有限 | 不修改待审或生产对象 |
| Stage Record 写入 | 有限 | 特定材料审查事实、结论和失效条件 |
| Gate Record 写入 | 有限 | 仅由通过/附条件通过 Stage 生成；唯一下一跳、目标 Generation、单次消费 |
| 项目/生产写入、shell、配置、服务、部署、删除 | 否 | 保持独立 |
| 会话工具 | 有限 | housekeeper、ops、coder、当前任务技术会话；白名单/代理 |
| `sessions_spawn`、明文凭据、companion 历史 | 否 | 禁止 |

## 强制规则

- Assignment Generation 管处理权；Stage Record 管审查事实；Gate Record 管一次指定过渡。
- 正常指定交接不使 Gate 因预期 Generation 递增自我失效。
- Gate 只能消费一次；错误目标、重复消费、材料变化、取消、过期或非预期改派拒绝。
- reviewer 不能自行改变 task controller 预留的目标 Generation 或扩大下一跳范围。
- Test 不签发执行 Gate。
- 未完成单次消费、重复/错误目标、材料变化、取消、Test 无 Gate 和生产写入拒绝测试时不得标记完整部署。
