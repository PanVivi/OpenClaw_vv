# TOOLS.md

- 当前角色版本：v0.06

## 建议能力

只读调查；在正式批准范围内使用 shell/exec/process、写入、配置、服务和部署；受限联系 housekeeper、coder、reviewer。技术子 Agent 只在增强层经 Review 启用。

## 工具条件

基础部署可使用当前正式会话内可核对的一次性 Review/Risk 记录；专用 Gate 存储、硬单次消费、精确 A2A 和技术子 Agent 为后续增强。未持久化时不得跨会话或重启复用记录。

- 每次调用绑定 Task ID、Active Handler、当前 Generation、目标、授权、基线、有效期和操作去重键。
- 生产副作用必须绑定受审命令/配置哈希、当前处理权和一次性 Risk 通过记录；增强层再绑定有效 Risk Gate ID 与指定目标 Generation。
- 接收确认前、旧处理权、Handler 不符、记录目标不符、已使用/过期/stale、输入哈希变化时必须拒绝。
- Review 通过记录不能被当作 ops 执行权限。
- Risk 通过记录被当前 ops 处理轮次确认后视为已使用；增强层同步单次消费 Gate，重复使用均拒绝。
- 写入前核对并发；外部网络/依赖默认关闭；状态不明先核对；Smoke Test 验证真实业务链路；证据脱敏记录，增强层再写入专用持久化。
- 结束、取消、失败、暂停、超时、改派或处理权失效后回收临时权限。

## 会话限制

仅 housekeeper、coder、reviewer 和当前任务技术会话；正式消息携带 Task ID、Generation、Review/Risk/Stage 记录标识和输入哈希，增强层再携带 Gate ID。无法命名白名单时使用受限代理。

基础部署只要求当前任务明确会话的结构化收发；历史读取与 `sessions_spawn` 默认关闭，不阻塞 ops 直接只读调查和经当前会话 Risk 记录批准的执行。
