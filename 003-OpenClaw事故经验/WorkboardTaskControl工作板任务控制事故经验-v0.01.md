# Workboard Task Control 工作板任务控制事故经验 v0.01

## 1. 原问题

旧方案把聊天委派、首次回报期限和自定义 `tasks.json` 组合成“看门狗”。它能改善一次 A2A 委派，却无法天然取得 Workboard/Tasks 的权威执行态，因此容易出现：

- 只收到 ACK，就误判为可以主动双向派单。
- 未按期回报，被错误描述成任务失败或“看门狗没回复”。
- 主 Agent 持续等待下游，Telegram 主会话被长任务占住。
- 重启后聊天上下文、任务状态和私人记忆被混为一谈。
- 下游把正式委派当成未授权转述，重复向少主索权。

“看门狗”不是 OpenClaw 官方独立 Agent，也不应成为新的管理角色；它只是旧自定义插件中的计时/提醒逻辑。

## 2. 根因

1. 业务任务真相没有放在官方持久任务控制面。
2. A2A 消息、Agent session、任务状态和 Telegram 送达被当成同一层。
3. 只有首次派发，没有持续但非阻塞的 dispatcher 周期。
4. 终态通知依赖聊天轮询，缺少可重放 cursor。
5. 角色卡虽定义风险分级，但运行态没有统一 card 字段承载授权与验收。

## 3. 正确修复

- Workboard 保存业务卡、授权、依赖、claim、heartbeat、proof 和终态。
- Tasks / Task Flow 保存执行事实；不以聊天 ACK 代替完成。
- 固定 Cron 调度泵每分钟推进 Workboard；不占用賈南風主会话。
- 通知泵消费可重放终态并 advance；无事件静默。
- 长任务在责任角色独立 worker 执行；賈南風随时可接下一条 Telegram 消息。
- 父子依赖表示“检查通过后继续”，父任务完成后自动续办，不重复索权。
- 失联依据官方 max runtime/claim 语义进入明确 blocked/failed 通知，并保留真实原因。

## 4. 验收教训

- “工具在列表中”不是验收；必须真实调用并核对 card、run、Task、proof 和 Telegram delivery。
- “能回复 ACK”不证明可以主动发起；必须分别测试 A→B 主动发送。
- 模型口头说“订阅不存在”不能覆盖 Cron 实际消费/送达证据；要区分工具可见范围与持久对象是否存在。
- 通知事件字段可能使用 `cardId`、`card_id` 或只在 run/session 字段中携带 UUID；解析必须容错，读取失败不能冒充业务阻塞。
- max runtime 的官方实际语义优先于事先猜测：当前版本会把卡片置为 blocked 并产生 failed 通知。
- 重启验收必须在重启前建立 waiting/ready 事实，重启后验证对象仍在、只执行一次、数据计数不减。

## 5. 禁止回归

- 不再用主会话 sleep、轮询或等待 worker。
- 不再用 A2A ACK、Telegram delivered 或“子 Agent 已启动”冒充任务完成。
- 不再建立另一个常驻“管理 Agent”代替 Workboard。
- 不为了解决任务控制而开放 housekeeper 任意 exec/write/message 或跨 Agent 历史。
- 不删除旧状态、transcript、记忆或凭据来“清理故障”。
