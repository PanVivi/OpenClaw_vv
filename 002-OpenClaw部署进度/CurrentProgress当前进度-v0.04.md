# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.04

## 当前文档状态

- 最终结构仍为八个常驻 Agent。
- 本轮完整读取并交叉审查賈南風、蕭觀音、魚玄機、步非煙全部当前角色文件，同时核对共同协议、reviewer、最终设计、工作流、部署方案和版本规则。
- 当前设计版本：賈南風 v1.06、蕭觀音 v0.03、魚玄機 v0.05、步非煙 v0.05、reviewer v0.03；均为 `CANDIDATE`。
- 三位 companion 仍为 v0.01 `CANDIDATE`。
- 被替代且存在缺陷的旧候选版均已归档并标记 `REJECTED`。

## 本轮发现并修正

1. housekeeper 与 life 对生活提醒/低风险自动化双主控：改为 life 唯一执行所有者，housekeeper 只拥有项目/工程和跨域父级自动化。
2. 四角色缺少统一交接：新增 Task Owner、Active Handler、Assignment Generation、接收确认和旧处理权撤销。
3. life 缺少提醒运行级可靠性：新增持久化、IANA/DST、misfire、幂等 occurrence、有限重试、失败通知和重启恢复。
4. 直接联系专业 Agent 可能绕过治理：简单无副作用事项可直接处理；正式任务必须登记并进入门控。
5. reviewer 接口过弱：新增 Stage Record、输入哈希、结论适用范围、A2A 硬隔离和正式输出。
6. 初版 Generation/审查设计形成门控悖论：最终分离处理权 Generation、审查 Stage Record 和一次性 Gate Record。

## 最后已知运行状态

以下没有在本轮重新连接 NAS 验证：

- housekeeper 最后已知仍运行賈南風 v1.02，模型最后记录为 `custom-1/gpt-5.6-luna`。
- ops 基础 Agent、Telegram account/binding 曾生效，但当前文件、模型、权限和版本待核验。
- coder、reviewer、life 和三位 companion 的实际 workspace、Bot、binding 和权限缺少运行证据。
- A2A、session visibility、Task/Stage/Gate/Automation 持久化、weather、calendar、Telegram 主动发送和 Cron 均待配置/测试。

## 当前阻塞

- 没有 NAS 只读盘点证据。
- 不确定当前 OpenClaw 是否原生支持所需命名白名单、Gate/Stage 持久化和自动化可靠性字段；不能实现时需专用受限代理/工具。
- 所有新版本均未完成正向、拒绝、恢复和回滚测试，因此不得标记 `STABLE`。

## 下一步

1. 固定本 PR 最新提交，只读盘点 NAS。
2. 先实现 Task Control 与 Stage/Gate Record，再部署工程组三角色。
3. 保留 v1.02 回滚，部署賈南風 v1.06。
4. 部署蕭觀音 v0.03 和生活自动化可靠性。
5. 分别部署三位 companion，另立 Change-Memory。

## 状态原则

GitHub 设计完成不等于 NAS 已部署；工具可见不等于调用成功；未取得真实配置、日志、投递和测试证据的能力保持 `not verified` 或 `blocked`。
