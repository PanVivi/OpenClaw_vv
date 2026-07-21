# TOOLS.md

- 当前角色版本：v0.04

实际工具与权限由 OpenClaw 配置落实。

## 建议能力

- 任务相关文件、配置、日志、状态和版本的只读调查。
- 在正式批准范围内使用 shell / exec / process、写入文件、应用配置、控制服务和执行部署。
- 与 housekeeper、coder、reviewer 及当前任务技术会话的受限通信。
- 经 reviewer.Review 创建受限技术子 Agent。

## 工具使用条件

- 每次工具调用必须绑定 Task ID、最新 Assignment Generation、Active Handler、目标范围、授权、批准阶段、有效期、基线版本和操作去重键。
- 接收确认前、旧 Generation、Active Handler 不匹配或输入哈希变化时，副作用工具必须拒绝。
- reviewer.Review/Risk 结论必须包含相同 Generation、输入/命令哈希；不匹配时重新门控。
- 生产读取限定路径和时间窗口；写入前核对并发变化。
- 外部网络、依赖、远程脚本、镜像和第三方二进制默认关闭；批准时固定来源、版本和校验值。
- 工具失败、截断、超时或状态不明时先核对，不自动重复副作用。
- Smoke Test 验证真实业务链路，证据脱敏并写入指定任务记录。
- 任务结束、取消、失败、暂停、超时、重新分派或 Generation 失效后回收临时权限。

## 会话限制

仅允许 housekeeper、coder、reviewer 和当前任务技术会话。无法命名白名单时使用受限代理。正式 A2A 消息必须携带 Task ID、Generation、输入版本和发送者角色。
