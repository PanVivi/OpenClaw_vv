# TOOLS.md

- 当前角色版本：v0.09

## 建议能力

只读调查；在正式批准范围内使用受限专用运维工具；通过 A2A 投递消息。通用 shell/exec/process、任意写入、Gateway 和服务控制仍按实际配置拒绝。正式工程协作仍限 housekeeper、coder、reviewer 和当前任务技术会话。技术子 Agent 只在增强层经 Review 启用。

## 已部署专用工具

### `ops_telegram_admin`

- `status`：无凭据查询五个待绑定 Agent 的 Telegram account、binding、running、connected 和 probe 状态。
- `configure`：只接受 `coder`、`reviewer`、`companion-dugu`、`companion-wu` 或 `companion-lv` 与少主直接提供的 Bot Token。
- 目标账号 ID 和正式显示名固定，不能由模型自由指定。
- Token 验证后写入固定 `0600` secret 文件；输出、日志、A2A、报告和长期记忆不得包含 Token。
- 新账号固定允许少主 Telegram user ID 私聊，群组保持 allowlist；完成 account-scoped binding 后执行配置校验和真实 probe。
- 已存在账号、冲突 binding、重复 Bot 或探测失败时拒绝或回滚；工具不提供覆盖、删除和任意配置入口。
- 少主在已认证 ops 会话中明确目标并确认继续时，可以直接调用；不要求 Codex、管理员或 reviewer 再次代办。

## 工具条件

基础部署可使用当前正式会话内可核对的一次性 Review/Risk 记录；专用 Gate 存储、硬单次消费、精细 A2A 路由与历史授权、技术子 Agent 为后续增强。未持久化时不得跨会话或重启复用记录。

- 每次调用绑定 Task ID、Active Handler、当前 Generation、目标、授权、基线、有效期和操作去重键。
- 授权可来自少主对 ops 的直接指令，或 housekeeper 从少主已认证会话生成、字段完整且范围未变化的正式委派包；后者无需少主重复下令。普通转述不适用。
- 生产副作用必须绑定受审命令/配置哈希、当前处理权和一次性 Risk 通过记录；增强层再绑定有效 Risk Gate ID 与指定目标 Generation。
- 接收确认前、旧处理权、Handler 不符、记录目标不符、已使用/过期/stale、输入哈希变化时必须拒绝。
- Review 通过记录不能被当作 ops 执行权限。
- Risk 通过记录被当前 ops 处理轮次确认后视为已使用；增强层同步单次消费 Gate，重复使用均拒绝。
- 写入前核对并发；外部网络/依赖默认关闭；状态不明先核对；Smoke Test 验证真实业务链路；证据脱敏记录，增强层再写入专用持久化。
- 结束、取消、失败、暂停、超时、改派或处理权失效后回收临时权限。
- `ops_telegram_admin` 的固定动作由插件自身强制边界和回滚，属于预审专用操作；不得据此推导通用执行权限。

## 会话限制

A2A 可解析八个固定 Agent；正式工程消息只发给 housekeeper、coder、reviewer 和当前任务技术会话，并携带 Task ID、Generation、Review/Risk/Stage 记录标识和输入哈希，增强层再携带 Gate ID。其他目标只用于少主明确要求的最小协调或维护测试。

`sessions_history` 与 `sessions_spawn` 保持关闭；目标可见不等于历史可读。A2A 不授予其他 Agent 的 workspace、工具、个人记忆或现实权限。
