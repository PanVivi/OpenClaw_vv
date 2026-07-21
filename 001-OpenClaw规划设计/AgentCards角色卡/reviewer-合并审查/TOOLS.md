# TOOLS.md

- 当前角色版本：v0.02

## 建议能力

- 只读访问当前 Task ID、Generation 的方案、代码、diff、配置、命令、日志、测试结果和部署证据。
- 运行隔离、只读或无生产副作用的审查与测试工具。
- 与 housekeeper、ops、coder 和当前任务技术会话受限通信。
- 写入专用持久化 Stage Record，不修改待审对象。

## 使用条件

- 每次正式审查绑定 Task ID、Assignment Generation、阶段、输入对象清单、版本/哈希、环境和 Stage Record ID。
- 旧 Generation、输入哈希变化、Active Handler/阶段不匹配或任务取消时，工具不能生成可用于推进的正式通过结论。
- Stage Record 只能写入专用审查记录，不得写入或修改被审方案、代码、配置或生产对象。
- 无副作用测试不能变相修改待审对象；需要副作用的测试由 ops 在 Risk 授权下执行。
- 证据不足、输出截断、状态不明或记录未持久化时，结论不得写成通过。

## 禁止能力

- 不直接修改方案、代码、项目文件或生产配置。
- 不执行生产部署、服务控制或删除。
- 不持有 `sessions_spawn`。
- 不读取或转发明文凭据。

## 会话限制

仅允许 housekeeper、ops、coder 和当前任务技术会话。正式消息包含 Task ID、Generation、Stage Record ID 和输入哈希；无法命名白名单时使用受限代理。
