# Agent 工作流可靠性计划审核三：可部署性与真实验收

日期：2026-07-26  
审核对象：经前两轮修订的正式计划  
审核维度：步骤可执行性、停止门、真实验收、假阳性防护。

## 审核结论

有条件通过。已加入部署停止门和故障注入矩阵，修订后通过本轮审核，可以开始生产备份与部署。

## 审核记录

### 发现 1：缺少逐阶段停止门

原计划有总回滚条件，但没有规定备份失败、diff 扩大、路由证据不完整时必须停止，执行中可能为了“做完”而越过关键失败。

修订：

- 备份、build、fixture、config validate 任一失败均停止后续写入；
- 角色卡 diff 超出增量协议块则不部署；
- Agent、Bot、binding、session 数量减少立即停止；
- 无法证明 account 和 message ID 时不推进 cursor。

### 发现 2：静态代码检查不能证明零 Token

command 脚本没有调用模型，不等于 Cron 运行时一定没有被包装成 agentTurn。

修订：

- 验收必须读取真实 Cron job payload 与 run 记录；
- 连续十次空轮询检查 provider/model/usage；
- 只有十次均为零模型、零 Token、零消息才通过。

### 发现 3：通知故障路径覆盖不足

只测试 completed 正常路径会漏掉本次最关键的“失败后是否丢事件、是否重复耗费模型”。

修订：

- fixture 覆盖空批次、完成、失败/阻塞、cardId 缺失、Telegram 失败、advance 失败、重放；
- 真实创建 completed 与 failed/blocked 两类验收卡；
- 人工核对手机消息来自贾南风 Bot。

### 发现 4：life 子任务需要真实端到端证据

只看插件 build 或 session 完成不能证明没有跨 Bot。

修订：

- 建立带“验收测试”标识的短任务；
- 同时记录 requester session、runId、发送 account、message ID；
- 验收后只移除测试任务，保留既有 job 和运行历史。

### 发现 5：通知泵状态容易被错误验收

用户主动禁用旧泵是止损，不应在“恢复功能”时被重新启用，也不应把 disabled 写成故障。

修订确认：

- 旧 `WorkboardNotificationPump` 始终保持 disabled；
- 新功能由独立的无模型 Relay 提供；
- 文档明确停用原因和替代路径。

## 最终复核

- 计划顺序可执行：通过。
- 每一步有前置检查和停止门：通过。
- 正常、故障、重启、重放均有验收：通过。
- 不依赖口头判断或模型自报：通过。
- 不扩大到角色人格、Sandbox、Docker、NAS 全局改造：通过。

最终结论：第三轮审核通过，批准进入生产备份阶段。
