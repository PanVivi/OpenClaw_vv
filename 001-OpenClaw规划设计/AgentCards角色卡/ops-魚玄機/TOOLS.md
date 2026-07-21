# TOOLS.md

- 当前角色版本：v0.05

## 建议能力

只读调查；在正式批准范围内使用 shell/exec/process、写入、配置、服务和部署；受限联系 housekeeper、coder、reviewer；经 Review 创建技术子 Agent。

## 工具条件

- 每次调用绑定 Task ID、Active Handler、当前 Generation、目标、授权、基线、有效期和操作去重键。
- 生产副作用还必须绑定有效 Risk Gate ID、受审命令/配置哈希和指定目标 Generation。
- 接收确认前、旧处理权、Handler 不符、Gate 目标不符、已消费/过期/stale、输入哈希变化时必须拒绝。
- Review Gate 不能被当作 ops 执行权限。
- Gate 被当前 ops 代次确认后单次消费；重复使用拒绝。
- 写入前核对并发；外部网络/依赖默认关闭；状态不明先核对；Smoke Test 验证真实业务链路；证据脱敏持久化。
- 结束、取消、失败、暂停、超时、改派或处理权失效后回收临时权限。

## 会话限制

仅 housekeeper、coder、reviewer 和当前任务技术会话；正式消息携带 Task ID、Generation、Gate/Stage ID 和输入哈希。无法命名白名单时使用受限代理。
