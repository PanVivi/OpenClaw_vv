# life｜蕭觀音｜部署进度

## 当前结论

- Agent ID：`life`
- 当前设计版本：v0.02
- 当前部署版本：无
- 当前运行状态：`not deployed`
- 目标 workspace：待从 NAS 只读核验
- 目标模型：待确定并核验
- Telegram Bot / account / binding / chat ID：待配置和核验
- 当前配置版本或 SHA：无；尚未部署
- 最近验收 Change ID：无
- 最后文档核验：2026-07-16（America/Los_Angeles）
- 运行时核验：未进行；本文件不把设计要求写成运行事实

## 已完成

- 当前角色卡 v0.02 已完成文案、职责、权限和最低验收设计。
- 已明确生活事务、三位 companion 日常管理、主动提醒和每日 06:00 消息。
- 已明确三位 companion 是独立常驻 Agent，可同时运行，不设置单选或互斥。
- 已明确 06:00 任务的 Cron、IANA 时区、精确执行、`life` Agent、独立正式新会话、Telegram account、chat ID、中文单条消息和失败通知要求。
- 已明确 life 的目标会话范围仅为 housekeeper 与三位 companion；标准 visibility 不能落实命名白名单时必须使用专用受限会话代理或等效机制。
- 已明确完整记忆能力单独立项部署，角色卡不虚构插件、工具名称或已完成状态。

## 尚未完成

- 五个 workspace 文件尚未写入 NAS。
- workspace、模型、Telegram Bot、account、binding 和接收 chat ID 尚未核验。
- weather、calendar、cron、主动 Telegram 投递尚未配置和测试。
- A2A、三位 companion 通信和受限历史读取尚未配置和测试。
- 针对 ops、coder、reviewer 及其他未授权会话的拒绝测试尚未进行。
- 专用受限会话代理或等效命名白名单机制尚未确定和部署。
- 完整记忆插件、life 独立命名空间、真实工具名称、纠正、删除、失效和隔离机制尚未设计和测试；另立部署任务。
- 每日 06:00 精确任务尚未创建和手动试运行。

## 下一步

1. 只读核对 `life` workspace、可用模型、Bot、account、binding、目标 chat ID 和现有配置。
2. 确定会话白名单的真实落地方式；不能硬隔离时不得部署为完整权限。
3. 备份目标五文件与配置，生成 diff、权限方案、验证方案和回滚方案。
4. 配置最小权限的天气、日历、提醒、Telegram、A2A 和受限会话能力。
5. 写入五文件并创建普通正式新会话。
6. 创建并手动试运行每日 06:00 精确任务。
7. 完成角色、权限、companion、提醒、会话拒绝和 Telegram 投递验收。
8. 完整记忆插件与隔离方案另立任务，不阻塞角色卡回退修复，但未完成前不得宣称完整记忆可用。

## 证据原则

设计完成不等于已部署。所有工具、消息、会话访问和自动化通过真实测试前不得标记 `completed`。工具可见不等于调用成功；无 NAS、Telegram、配置或运行日志证据的字段保持“待核验”。