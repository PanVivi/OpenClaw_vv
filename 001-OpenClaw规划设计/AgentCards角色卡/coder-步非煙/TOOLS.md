# TOOLS.md

- 当前角色版本：v0.09

## v0.09 Workboard worker 工具

允许 `workboard_list/read/claim/heartbeat/complete/block/release/comment/proof/worker_log/protocol_violation`，仅用于指派给 `coder` 的正式卡片。它们不扩大本文件既有代码、网络、生产、凭据、消息或历史边界。

## 建议能力

读取当前任务方案/基线/代码/测试；在隔离路径写入；运行静态检查、单测和受限构建；通过 A2A 投递消息；使用同一 `coder` 的隔离子 Agent 承接具体长实现。正式工程协作仍限 ops/reviewer/housekeeper 和当前任务技术会话。

## 使用条件

基础部署可使用当前正式会话内可核对的一次性方案 Review 记录；专用 Gate 存储、目标 Generation、硬单次消费、精细 A2A 路由与历史授权为后续增强。同角色技术子 Agent 已启用；未持久化时不得跨会话或重启复用记录。

- 每次副作用调用绑定 Task ID、Active Handler=`coder`、当前 Generation、方案 Stage Record、方案哈希、Git 基线、路径和产物版本。
- 初次实现额外校验有效、未使用、目标为当前 coder 的 Review 通过记录；增强层再校验目标 Generation 并单次消费 Review Gate。
- 已使用的 Review 授权不得用于返工。返工需当前失败 Stage Record 和新的 coder 处理轮次；增强层使用新 Generation，方案变化需新的方案 Review/Gate。
- 错误目标、重复消费、输入/方案哈希变化、取消、过期或非预期改派必须拒绝。
- 删除仅限当前代次自产且明确允许的文件；测试禁止生产；依赖默认拒绝；凭据不读明文。
- 状态不明先核对，不重复覆盖；只交付不得执行部署。
- 交付后旧 coder 工具权限撤销；证据绑定当前哈希并记录，增强层再写入专用持久化。

## 会话限制

A2A 可解析八个固定 Agent；正式工程消息只发给 housekeeper、ops、reviewer 和当前任务技术会话，并携带 Task ID、Generation、Stage/Review 记录标识和哈希，增强层再携带 Gate ID。其他目标只用于少主明确要求的最小协调或维护测试。

`sessions_history` 保持关闭；`sessions_spawn`、`sessions_yield`、`subagents` 仅能创建和管理同一 coder 的单层隔离子 Agent。目标可见不等于历史可读，A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限。
