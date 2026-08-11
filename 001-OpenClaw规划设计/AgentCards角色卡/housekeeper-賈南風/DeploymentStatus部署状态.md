# housekeeper｜賈南風｜部署进度

## 2026-08-11 模型路由

- 身份仍为 `housekeeper`，Telegram account/binding 仍为 `housekeeper`，没有改名或重绑。
- 主链已部署为 `custom-2/grok-4.5` → Luna → Qwen 3.8 Max → DeepSeek V4 Flash → LongCat；无投递真实调用实际命中 Grok 4.5。
- 子 Agent 使用任务分流/生活链：Composer 2.5 → Luna → Qwen 3.8 Max → DeepSeek V4 Flash → LongCat。
- 旧会话 model override 已清除；角色卡、工具、workspace、transcript 与个人记忆未改变。
- 完整证据：`002-OpenClaw部署进度/ModelRouting部署与生产验收报告-v0.01.md`。

## 2026-08-09 晨间玉简全模块转交 v1.17

- 当前设计与实际部署版本：v1.17 `CANDIDATE`；身份仍为 `housekeeper`，Telegram account/binding 仍为 `housekeeper`，没有改名。
- `morning_brief_handoff` 只允许提交、查询和取消持久转交；housekeeper 不能直接写 life owner 文件，也不并行创建提醒。
- 少主交代抬头、天气关注、空气敏感、衣行偏好、生活待办、门人备注、日程或小签时均可代收；只有 life 实际应用后的 `applied` 才能回复已录入。
- 自然语言转交生产验收已形成 applied 回执并正确投影；pending/applying/blocked 不得包装成完成。
- 正式冻结计划和三次独立完整审查已写入官方 Task Flow，当前任务在文档与同步完成前不会进入最终通知。

## 2026-07-26 Codex 任务面板 v1.15

- 当前设计与实际部署版本：v1.15 `CANDIDATE`；完整继承 v1.14，不改变姓名、人格、大总管职责、风险边界或既有权限。
- 新增独立 `codex` Workboard 登记、查询、取消和最终通知规则；不交给 `production` dispatcher，不授予 housekeeper shell。
- 正式每小时 Codex Desktop Scheduled 为 ACTIVE；真实通过空扫描、官方 claim/release/heartbeat/blocked，以及本次可完成卡的三审、客户端、生产隔离和八 Telegram/A2A/数据无损回归。
- OpenClaw 配置、Gateway、Workboard/Codex 插件、production dispatcher、八 binding 与 A2A 均未修改；实际部署和最终端到端结果以 `002-OpenClaw部署进度/CodexTaskPanel任务面板部署报告-v0.01.md` 为准。

## 2026-07-26 角色表达与通知 v1.14

- 当前设计与实际部署版本：v1.14 `CANDIDATE`；姓名、人格、大总管职责、权限与风险边界未变。
- 共同协议 v0.08 已部署：内部工作记录与少主沟通分离；默认不再外发 Card、run、event、heartbeat、proof、英文状态、UUID 或 worker 原文。
- `WorkboardNotificationRelay` 已改为确定性的賈南風角色通知；真实 completed 链路由 housekeeper Telegram message ID 401 送达。
- 新 session 角色回复、技术细账、bootstrap、Telegram 和无损回归验收均通过。

## 2026-07-26 工作流可靠性 v1.13

- 当前设计与实际部署版本：v1.13 `CANDIDATE`；人格、身份和大总管职责未变。
- 接单后以 Workboard 建卡、分解、委派；长任务由 worker/同角色子 Agent 执行，主 Telegram 会话不等待长任务。
- blocked/failed/stale 由无模型 `WorkboardNotificationRelay` 主动回报；真实 completed、blocked、发送失败不推进 cursor、补发和重启恢复均通过。
- 用户主动停用的旧 `WorkboardNotificationPump` 继续 disabled；新 Relay 显式使用 housekeeper Bot。
- 共同协议 v0.07 已部署：直接回答、能力预检、有限重试、硬失败熔断、终态主动上报。
- 当前卡片、会话、个人记忆、Telegram account/binding 未删除或重建。

## 2026-07-24 Workboard 正式任务控制

- 当前设计与实际部署版本：v1.12 `CANDIDATE`；最近 `STABLE` 角色基线仍为 v1.02。
- 官方 Workboard 板 `production` 已启用；正式任务以卡片、官方 Task、run、worker session、proof 与 artifact 为事实源。
- `WorkboardDispatchPump` 每分钟派发 ready 卡；`WorkboardNotificationPump` 消费 completed、failed、stale 等可重放事件并向少主 Telegram 主动报告。
- `housekeeper-workboard-control 1.0.3` 只提供固定官方派发与按 UUID 查询，不开放任意命令、路径、环境变量、文件、配置或消息能力。
- `housekeeper-async-dispatch` 已停用，`housekeeper_task_watch` 已移出 allow；旧插件目录和历史状态只读保留，两条历史任务已迁移成 Workboard 卡。
- 已真实通过：完整成功、受控阻塞、两任务并发、父子依赖自动推进、超时阻塞与告警、Gateway 重启续跑、Telegram 完成通知、A2A 双向抽测、负向权限和八 Bot 探测。
- housekeeper 仍拒绝 `exec/process/write/edit/apply_patch/gateway/message/sessions_history`，本次未扩大角色职责或工程执行权限。

## 2026-07-23 委派连续性历史状态（已由 Workboard 取代）

- `housekeeper-async-dispatch 1.2.2` 已部署；跨角色 `sessions_send` 立即返回，Task ID、目标、来源会话、首次回报期限与状态持久化。
- 下游 A2A 回报自动更新；默认 10 分钟无首次回报或 blocked 时主动向原 Telegram 会话报告。
- 真实任务 `TEST-DELEGATE-004` 已从 waiting 自动闭环为 completed，正常闭环时 `alertCount=0`，主会话未阻塞。
- 生产超期测试真实投递 Telegram 告警；1.2.2 文案准确表述“未按期回报、执行状态未知”，不再把未知状态说成卡死。测试后任务已恢复 completed。
- `housekeeper_task_watch list` 生产实测 1 call / 0 failures。
- 未授予 shell、项目写入、服务控制或凭据读取权限。

## 2026-07-23 v1.11 实际状态

- 五件套已部署；`sessions_spawn`、`sessions_yield`、`subagents` 已开放为同一 housekeeper 的单层隔离子 Agent。
- 真实创建子 Agent成功，父会话非阻塞返回 runId，子任务 `CHILD_OK_housekeeper` 已完成。
- 跨角色委派仍使用现有异步 A2A；无 shell/写入/全局历史权限。Telegram connected/probe 正常。
- 旧文“spawn 拒绝/管理面持久化”由本节取代；生活持久任务由 life 自己通过 `life_automation` 完成。

- Agent ID：`housekeeper`
- 当时设计版本：v1.11 `CANDIDATE`
- 当时实际部署版本：v1.11 `CANDIDATE`
- 历史运行状态：`superseded`
- 当时核验：2026-07-23 16:25 +08:00

## 已验证

- v1.11 workspace 文件已部署；原 v1.08 文件保留为回滚基线。
- 模型：primary `custom-2/grok-4.5`；fallback 配置存在。
- Telegram：account `housekeeper` → Agent `housekeeper`，实际收发已通过。
- 工具：workspace 内 `read`、`sessions_list/send/status`、memory 查询、owner Telegram 会话内的 Cron 协调与同角色 spawn/yield/subagents 可用；写入、执行、Gateway、message 与 `sessions_history` 拒绝。生活持久任务正式委派给 life，由 life 通过 `life_automation` 完成。
- A2A：八个固定 Agent 可互发，housekeeper 作为发送方已验证；`visibility=all` 只用于目标解析，历史仍关闭。
- 非阻塞委派：`housekeeper-async-dispatch` 1.0.0 已加载；模型提交正数 `sessions_send` 超时时会被强制改为 `timeoutSeconds: 0`。独立任务在独立 session lane 执行，Telegram 前台可继续接收消息。
- Sandbox：关闭。
- 连续性：专属恢复包存在；个人聊天恢复索引由 housekeeper 自己的 9 段 transcript 派生并校验，通用运维摘要与个人记忆已分离。

## 本次范围外仍未完成

- 自动长期记忆仍未部署；这不影响 Workboard 正式任务持久化、跨重启核对和续办。
- v1.02 是最近 `STABLE` 角色基线；v1.12 为当前实际部署候选版。

## 下一步

后续内容更新继续按 `LosslessContentUpdate无损内容更新任务-v0.01.md` 保留原 Telegram 会话、个人记忆、A2A 和异步委派能力；未完成长期运行验收前不标记 `STABLE`。

## 证据

- NAS 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/housekeeper/recovery/session-continuity-20260723T095812+0800`
- 修复备份：`/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-personal-memory-a2a-all-20260723T103858+0800`
- 异步委派备份：`/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-async-dispatch-20260723T161500`
- 验收报告：`002-OpenClaw部署进度/HousekeeperAsyncDispatch贾南风非阻塞委派报告-v0.01.md`
