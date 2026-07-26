# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.23

核验时间：2026-07-26 10:00 +08:00
分支：`agent/lossless-content-update`

## v0.23 增量

- `CodexResetWatcher` 已从“只读 codexreset.org”升级为“X 最新动态发现 + X 官方 oEmbed 验证 + codexreset.org 独立核查”。
- 当前无 X Developer Token，生产实际使用 Nitter RSS 发现候选；脚本已预留 `0600` 文件形式的 X API v2 Bearer Token 入口，不虚构官方 API 已启用。
- 目标 Post `2081096447718723984` 已由 RSS 发现、X 官方 oEmbed 验证，并与网站同 ID 交叉核查。
- 网站尚未收录时，不阻塞已通过 X 官方验证的直接事件；任一发现源失败可降级，两源同时失败则 Cron 真实失败。
- 状态由 schema 1 无损迁移到 schema 2；原 8 个 `seenIds` 同步进入 `notifiedIds`，没有补发旧事件。
- Cron `59432519-c6fc-43f7-8efd-a3cf38230259` 由 30 分钟调整为 10 分钟；owner、agent、argv、cwd、timeout 和 delivery 不变。
- life Bot 真实验收通知成功；手动 Cron `status=ok`、返回 `NO_REPLY`。
- Gateway 重启后 service/RPC 恢复，八个 Telegram account 全部 running 且 probe ok。
- 配置 valid、插件诊断无问题；session files `2135→2135`、jsonl `1296→1296`、memory files `217→217`。
- 未修改人格、A2A、Workboard 业务流程、Telegram binding、个人记忆或其他 Agent 权限。

完整证据：

- `CodexResetWatcher双源监控修复计划-v0.01.md`
- `CodexResetWatcher双源监控部署报告-v0.01.md`
- `003-OpenClaw事故经验/CodexResetWatcher单源延迟事故-v0.01.md`

## v0.22 完整继承

以下内容完整继承 v0.22，不因本轮升级删除或缩减。

### v0.22 本版增量

- 已修复正式委派后执行 Agent重复索权：少主直接任务或賈南風字段完整、范围不变的正式委派包均承载一次任务级授权。
- 已部署 `housekeeper-async-dispatch 1.2.2`：A2A 委派立即返回，持久跟踪 Task ID 和首次回报期限，超时/blocked 主动向原会话上报；超期告警明确区分“未回报”和“执行失败”。
- 已部署 `ops-token-intake 1.0.1`：在模型和日志脱敏前接收少主发给 ops 的 Bot Token，只向魚玄機提供 opaque `tokenFile` handle；原生 account/binding 流程不变。
- 已清理旧 `ops-telegram-admin` 的配置登记，源文件只保留为历史；`openclaw config validate` 通过且零 warning。
- 已验证 Gateway `active/running`、connectivity `ok`，8 个 Telegram account probe 均为 `works / audit ok`。
- 已用生产 Agent 实测 housekeeper、ops、coder、reviewer、life 的职责工具，全部零失败、零重复索权。
- 真实 A2A Task `TEST-DELEGATE-004` 已从 accepted/waiting 自动闭环为 completed，主会话未阻塞。
- 未改 Telegram binding、已有 session/transcript、个人记忆、角色身份或人格。

### v0.22 当前插件

| 插件 | 状态 | 版本 |
| --- | --- | --- |
| housekeeper-async-dispatch | enabled | 1.2.2 |
| ops-token-intake | enabled | 1.0.1 |
| life-automation | enabled | 1.0.0 |
| ops-telegram-admin | disabled，且不再登记于生产配置 | 1.0.0 历史源 |

### v0.22 已知观察

- `custom-1`、`custom-2` 当时存在上游 503；系统回退到 DeepSeek 后任务完成。该项未误判为角色权限问题，也未在该轮扩展修改模型路由。
- 新 Bot Token 的真实入站端到端验收需在下一次正常绑定任务中完成；当时已通过 hook 集成、并发、去重、生产加载和生产工具调用测试。

完整证据见 `PermissionDelegationTokenContinuity权限委派凭据连续性报告-v0.01.md`。

### 2026-07-24 Workboard 正式任务控制增量

- Gateway：OpenClaw `2026.7.1-2`，Node `22.22.3`，active/running，connectivity ok。
- 官方 Workboard 已启用；正式工作板为 `production`。
- `housekeeper-workboard-control 1.0.3` 已加载，只提供固定 dispatch 和按 UUID 只读 show。
- `WorkboardDispatchPump`：每 1 分钟，固定官方 CLI 命令，失败 Telegram 告警。
- 当时记录的 `WorkboardNotificationPump`：每 2 分钟，可重放终态 cursor，无事件静默，使用 housekeeper Telegram 发送。2026-07-26 本轮备份时该泵已经 disabled；本轮后续现场列表不再返回该禁用对象，未在 CodexResetWatcher 范围内恢复。
- `housekeeper-async-dispatch 1.2.2` 已 disabled，旧工具入口已撤销，旧目录与状态文件未删除。
- 旧任务 `TEST-DELEGATE-004` 与 `PURELOVE-STATUS-20260724` 已迁为只读历史卡。
- 8 套角色卡已按原设计增量升版并部署；运行五件套共 40 个文件校验通过。
- 8 个 Telegram account 均 running 且 probe ok；A2A `housekeeper→ops`、`housekeeper→life` 主动发送均 ACK。
- 并发测试中 ops 与 life 两卡同时运行，housekeeper 主会话仍即时发送 Telegram 成功。
- 父子条件任务由调度泵自动提升和启动；无需少主再次授权。
- 超时失联卡按官方状态进入 blocked，并主动通知精确原因 `Run exceeded the card max runtime`。
- Gateway 重启后 ready 卡、Cron、Workboard 状态和通知 cursor 当时均恢复；卡片只启动一次并以 `RESTART_PERSIST_OK` 完成。
- 权限负向：housekeeper 无 `exec`，reviewer 无 `write`，测试文件不存在。
- 当时数据计数未减少：transcript `455+`、session 文件 `869+`、memory 文件 `233`，均高于当时部署前 `381/766/201`。
- `openclaw tasks audit --json` 当时为 0 finding；配置 valid；插件诊断无问题。
- 安全审计仍有部署前既存的 Control UI 无认证/危险开关和默认宽权限告警，本轮没有修改该独立网络安全范围。

完整证据见 `WorkboardTaskControl工作板任务控制部署报告-v0.01.md`。
