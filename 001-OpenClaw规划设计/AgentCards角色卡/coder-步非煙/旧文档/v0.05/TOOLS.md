# TOOLS.md

- 当前角色版本：v0.05

## 建议能力

读取当前任务方案/基线/代码/测试；在隔离路径写入；运行静态检查、单测和受限构建；受限联系 ops/reviewer/housekeeper；经 Review 创建技术子 Agent。

## 使用条件

- 每次副作用调用绑定 Task ID、Active Handler=`coder`、当前 Generation、方案 Stage Record、方案哈希、Git 基线、路径和产物版本。
- 初次实现额外校验有效、未消费、目标为当前 coder Generation 的 Review Gate；确认后单次消费。
- 已消费 Gate 不得用于返工。返工需当前失败 Stage Record 和新的 coder Generation；方案变化需新的方案 Review/Gate。
- 错误目标、重复消费、输入/方案哈希变化、取消、过期或非预期改派必须拒绝。
- 删除仅限当前代次自产且明确允许的文件；测试禁止生产；依赖默认拒绝；凭据不读明文。
- 状态不明先核对，不重复覆盖；只交付不得执行部署。
- 交付后旧 coder 工具权限撤销；证据绑定当前哈希并持久化。

## 会话限制

仅 housekeeper、ops、reviewer 和当前任务技术会话；正式消息携带 Task ID、Generation、Stage/Gate ID 和哈希。无法命名白名单时使用受限代理。
