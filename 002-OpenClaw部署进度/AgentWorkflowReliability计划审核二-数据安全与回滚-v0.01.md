# Agent 工作流可靠性计划审核二：数据安全与回滚

日期：2026-07-26  
审核对象：经第一轮修订的正式计划  
审核维度：聊天记忆、Telegram 绑定、SQLite 一致性、凭据保护、可逆性。

## 审核结论

有条件通过。备份方式和通知游标回滚边界已补强，修订后通过本轮审核。

## 审核记录

### 发现 1：不能把活动 SQLite 当普通文件复制

OpenClaw 官方说明要求使用 SQLite online backup API 捕获已提交 WAL 状态，并明确不应复制活动的 `.sqlite/-wal/-shm/-journal` 作为可移植备份。原计划只写“备份 SQLite”，缺少一致性标准。

修订：

- OpenClaw 状态使用 `backup create --verify`；
- 全局状态另做 `backup sqlite create --global` 并验证；
- Workboard 自有库用 online backup API 生成私有快照并执行 `integrity_check`；
- 禁止直接复制活动数据库。

### 发现 2：宽备份会主动跳过部分 transcript 日志

官方宽备份为避免在线变更竞态，会跳过部分 session/cron/log 的 `.jsonl` 与 `.log`。只依赖一个 tar 包不能证明历史没有减少。

修订：

- 部署前后记录八 Agent 的 session/transcript 清单、数量与关键哈希；
- 既有 transcript 不做删除、迁移或重建；
- 回滚只恢复本轮变更对象，不回退用户在部署期间产生的新聊天。

### 发现 3：通知的 at-least-once 需要审计锚点

“发送成功后推进 cursor”仍存在发送成功、推进前进程退出导致重复的窗口。该窗口不能靠提前推进消除，否则会产生静默丢失。

修订：

- 继续选择 at-least-once；
- 每批记录 event ID 与 Telegram message ID；
- 推进失败保留记录，允许低概率重复，不允许丢失；
- 不删除旧 subscription，避免扩大范围和破坏回滚。

### 发现 4：回滚不能覆盖部署期间的新消息

直接整包恢复会覆盖新会话和状态，违背无损要求。

修订：

- 回滚按对象执行：配置键、插件版本、角色卡、Relay Cron；
- SQLite 宽备份仅作灾难恢复证据，不在正常回滚中覆盖在线新状态；
- 旧通知泵继续保持用户指定的 disabled 状态。

## 通过条件复核

- 聊天与记忆不删、不重建、不整库回退：通过。
- Bot token 不进入文档、日志和测试输出：通过。
- 数据库备份满足在线一致性：通过。
- 新通知路径失败可单独停用：通过。
- 回滚不会擅自恢复高 Token 的旧通知泵：通过。

最终结论：第二轮审核通过。
