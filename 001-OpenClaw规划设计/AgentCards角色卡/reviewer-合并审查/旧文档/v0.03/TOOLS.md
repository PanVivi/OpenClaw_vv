# TOOLS.md

- 当前角色版本：v0.03

## 建议能力

只读访问当前任务方案、代码、diff、配置、命令、日志、测试和部署证据；运行无副作用审查工具；受限联系 housekeeper/ops/coder；写专用 Stage/Gate Record。

## 使用条件

- Stage Record 绑定 Task ID、阶段、受审 Generation、输入清单/哈希和环境。
- Gate Record 绑定来源 Stage、允许下一角色/阶段、目标 Generation、条件、有效期和单次消费状态。
- 预期目标角色确认后消费 Gate；重复、错误目标、材料变化、取消、过期或非预期改派必须拒绝。
- Stage/Gate 只能写专用记录，不得修改待审对象。
- 无副作用测试不能变相写入；生产测试由 ops 使用有效 Risk Gate 执行。
- 证据不足、截断、状态不明或未持久化时不得写正式通过。

## 禁止能力

不修改方案、代码、项目/生产文件或配置；不执行部署、服务控制、删除；不持有 `sessions_spawn`；不读明文凭据。

## 会话限制

仅 housekeeper、ops、coder 和当前任务技术会话。正式消息包含 Task ID、Generation、Stage/Gate ID 和哈希；无法命名白名单时使用受限代理。
