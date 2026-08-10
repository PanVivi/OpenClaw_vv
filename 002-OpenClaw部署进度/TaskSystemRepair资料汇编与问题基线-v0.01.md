# OpenClaw 全任务系统修复：资料汇编与问题基线 v0.01

> 冻结日期：2026-08-09（Asia/Taipei）
> 范围：賈南風（`housekeeper`）、魚玄機（`ops`）、蕭觀音（`life`）的正式任务入口、跨角色转交、执行、收口、通知、风险闸门，以及晨间玉简各模块的数据录入。
> 身份结论：没有改名。生产绑定仍为 `default → ops`、`housekeeper → housekeeper`、`life → life`。

## 1. 版本与权威基线

| 对象 | 核对结果 | 采用方式 |
|---|---|---|
| 本地修复工作树 | `codex/repair-task-system-20260809`，基于 `c1b795a2d65ea5c38946a024ced978c845da7559` | 本轮唯一写入位置 |
| GitHub 最新项目文档分支 | `origin/codex/repair-morning-workflow-20260804` 同为 `c1b795a2...` | 本地与 GitHub 对齐，无落后提交 |
| 原工作目录 | 存在用户未提交改动 | 保持不动，不覆盖 |
| 生产 OpenClaw | `2026.7.1-2 (0790d9f)`，Node `22.22.3` | 所有实现必须以此版本实测能力为准 |
| OpenClaw 当前 main | 文档与源码较生产更新 | 用于确认方向；不可把 main 的能力冒充生产能力 |

本项目原设计的职责边界保持不变：

- Workboard 保存业务任务卡、授权范围、依赖、领取、证据与可见状态；
- Task / Task Flow 保存后台执行事实与可恢复编排状态；
- Standing Orders、角色卡和技能说明授权与表达，不充当执行引擎；
- Cron 只负责真正的时间触发，不充当任务真相或空转轮询器；
- 賈南風负责统一收口与用户回禀，魚玄機和蕭觀音保持各自身份与专业边界。

## 2. 官方说明与上游源码结论

| 资料 | 已核实结论 | 对本轮设计的约束 |
|---|---|---|
| [Plugin hooks](https://docs.openclaw.ai/plugins/hooks) | 插件可以观察入站消息、约束最终答复、观察工具结果、子任务结束、消息送达、Gateway 启停和 Cron 变化 | 正式任务入口、遗漏兜底、终态回写和投递确认可以程序化，不应只靠角色记忆 |
| [Task Flow](https://docs.openclaw.ai/automation/taskflow) | Managed Flow 是带控制器、修订号、JSON 状态和子任务关联的持久编排层；跨重启保留 | 多阶段任务以稳定控制器和固定 owner session 驱动 |
| [Background tasks](https://docs.openclaw.ai/automation/tasks) | Task 是活动账本，不是调度器；完成应推送，轮询通常形状错误 | 停止用每分钟 Cron 制造空任务记录 |
| [Workboard](https://docs.openclaw.ai/plugins/workboard) | Workboard 是单 Gateway 的小型任务控制面；卡片可关联任务、运行和会话 | Workboard 是业务投影，不可与 Task Flow 各说各话 |
| [Standing orders](https://docs.openclaw.ai/automation/standing-orders) | `AGENTS.md` 会自动注入，但时间/事件执行仍需 automation 与程序控制 | 角色文件保留规则，不能作为“不会忘”的唯一保障 |
| 生产 `hook-types` | 已具备 `message_received`、`before_agent_finalize`、`agent_end`、`after_tool_call`、`message_sent`、`subagent_ended`、`gateway_start/stop`、`cron_changed` | 旧报告所谓“缺少状态事件接口所以只能分钟轮询”不成立 |
| 生产 Task Flow 类型 | 已具备 `api.runtime.tasks.flow.bindSession({sessionKey, requesterOrigin})` | 当前 `fromToolContext` 造成的会话分裂可在生产版修复 |
| 生产 Workboard 源码 | `subagent_ended` 只清理 worktree，不负责卡片终态；启动选择会把任意 `execution.status=running` 当作角色占用 | 必须补终态协调器，并清理“卡片 ready 但旧 execution 仍 running”的自锁状态 |

## 3. GitHub 项目与缺陷讨论

| 讨论 | 状态与证据 | 本轮处理 |
|---|---|---|
| [#115063](https://github.com/openclaw/openclaw/issues/115063) | 生产同版 `2026.7.1-2` 的 Codex 子任务可能在 `Completed(None)` 后把父会话留在等待；main 已有更广恢复，发行包尚有差距 | 不把核心升级当成本轮前提；插件做终态兜底，并把该上游缺口单列 |
| [#112616](https://github.com/openclaw/openclaw/issues/112616) | 旧完成投递仅约 3 秒重试，投递失败后可能状态矛盾；上游后续已修 | 本地使用持久 outbox 与明确 `unknown`，不依赖短暂 announce |
| [#50038](https://github.com/openclaw/openclaw/issues/50038) | 多代理输出丢失、错工作区、错频道及 orchestrator 工具边界问题均有社区复现 | 每次转交保存原始来源、目标能力、任务与收据，不把 A2A 回话当完成 |
| [#45522](https://github.com/openclaw/openclaw/issues/45522) | 长任务缺少可见进度和终态通知是明确产品缺口 | 只在状态变化或超时异常时自然回禀，不制造工业卡片 |
| [#43177](https://github.com/openclaw/openclaw/issues/43177) | announce 可记为 delivered 但 Telegram 未真实出现 | 最终通知必须取得 Telegram message id；超时进入不确定态且不盲目重发 |

## 4. 社群资料

社群资料只作实践佐证，不替代官方接口与生产实测：

- [Long-running tasks proactively](https://www.reddit.com/r/openclaw/comments/1sre0iq/how_do_you_make_openclaw_handle_longrunning_tasks/)：普遍遇到“一次回复后停止、没有任务状态”的问题；
- [Supervisor + Executor](https://www.reddit.com/r/openclaw/comments/1rjyu1o/designing_openclaw_with_supervisor_executor_for/)：有效实践是共享的明确状态机、每次交接写状态、仅活动期间守望；
- [Reliable long projects](https://www.reddit.com/r/openclaw/comments/1sltjrt/what_actually_makes_ai_agents_reliable_on_long/)：把状态持久化在上下文之外，以任务图、规格、差异和测试结果为准，技能只承载选择与规则。

共同结论与本项目原设计一致：角色记忆、`AGENTS.md` 或 `SKILL.md` 可以帮助判断，但可靠工作流必须由持久状态、确定性入口、状态机、证据和恢复控制器完成。

## 5. 对话审计范围

生产三角色会话目录中的 1,319 份 transcript/trajectory 文件、31,768 行记录已经过结构化遍历；任务相关的 Telegram 可见会话另做逐行复核，共 68 份 transcript、7,584 行，JSON 解析错误为 0。无关私人内容不进入报告。

### 5.1 关键对话事实

| 时间（Asia/Taipei） | 角色 | 用户交代或追问 | 系统实际表现 | 问题 |
|---|---|---|---|---|
| 2026-08-03 17:58 起 | 魚玄機 | 核查晨报推理泄漏、继续完成华丽晨报工程 | 使用临时子会话和人工派发；后续状态依赖模型回写 | 工程入口没有稳定控制器 |
| 2026-08-03 19:57 | 魚玄機 | 明确启动完整模块化晨报工程并随时汇报 | 启动了子任务，但工作板与实际 worker 多次脱节 | “已派发”不等于“已执行” |
| 2026-08-03 20:01 起 | 賈南風 | 追问通知异常与真实进度 | 父任务拆分被误报为整体完成；答复正文出现重复 | 终态判定和投递均不可靠 |
| 2026-08-03 21:50 | 賈南風 | 问哪个任务失败 | 已完成调查因没有正式完成动作而被重复派发，随后过期失败 | 完成评论/证据没有原子收口 |
| 2026-08-03 22:31 | 賈南風 | 问任务是否都卡住 | 42 张卡中当前相关 9 项，多项等待、无心跳或假运行 | 状态投影不一致 |
| 2026-08-03 22:35 | 賈南風 | 问为什么不能并行 | Grok 卡派发 51 次仍未建立 worker；多个角色通道被旧状态锁住 | 调度器缺少领取和防重闭环 |
| 2026-08-07 07:29 | 蕭觀音 | 录入 8 月 8 日 09:15 技能考试 | 只创建单独提醒；未写入晨报日程模块 | 模块之间脱节 |
| 2026-08-07 07:31 | 蕭觀音 | 要求所有日程进入晨报并提前一小时提醒 | 只改提醒时间，并反问是否新建 06:00 晨报 | 角色不知道已运行的晨报及其输入接口 |
| 2026-08-07 07:32 | 蕭觀音 | 明确当天 06:00 已收到晨报，询问系统数量 | 回答“0 个，可能来自其他渠道” | 角色与生产模块完全失去关联 |
| 2026-08-09 20:44 | 賈南風 | 被要求回禀晨报修复与四项限制 | 回答本轮全部完成，并沿用“缺少状态事件接口”的错误限制 | 文档与真实能力不一致、过度宣称 |
| 2026-08-09 20:47 | 賈南風 | 追问任务系统是否修复 | 承认只是“可用、未彻底修复” | 先前完成通知范围失真 |

### 5.2 全量对话的系统性发现

| 编号 | 发现 | 证据摘要 | 当前状态 |
|---|---|---|---|
| C01 | 正式任务没有确定性入站登记 | 三角色多数任务相关请求没有任何持久任务动作；是否建卡取决于模型当轮选择 | 未修 |
| C02 | 角色记忆被当作工作流触发器 | `AGENTS.md`/技能写了流程，但没有入站 hook 强制分流 | 未修 |
| C03 | 跨角色转交只传文本，不传受控状态 | `sessions_send` 回话常被当作进度或完成，没有统一收据 | 未修 |
| C04 | 賈南風不能统一看见其他角色创建的 Flow | `workflow-governance` 使用当前工具会话绑定 | 未修 |
| C05 | 蕭觀音只能看见 `life_automation`，看不见晨报输入 | 真实对话回答晨报为 0；后续晨报专用插件只修了一个模块族 | 局部修 |
| C06 | 模块录入缺少统一能力目录 | 日程、天气、空气、衣行、黄历、任务、门人等没有统一发现与路由 | 未修 |
| C07 | 助手正文重复 | 賈南風、魚玄機、蕭觀音均有同一答复连续出现两遍的记录 | 未修 |
| C08 | 用户可见工业语言 | 历史通知与状态答复暴露 Workboard、claim、heartbeat、session、内部状态 | 局部修 |
| C09 | 结果和状态相互矛盾 | 有证据/评论称完成，卡仍 ready/running；任务成功但投递失败 | 未修 |
| C10 | 完成通知可丢失、误报或重复 | 生产 tasks audit 有 3 条 `delivery_failed`；历史有解析异常和重复正文 | 未修 |
| C11 | 风险分级未成为统一执行闸门 | 当前只对部分 `exec` 文本做高风险拦截；其他工具与动作没有统一指纹和一次性授权 | 未修 |
| C12 | 修复报告过度宣称 | 报告把仍需分钟轮询、上游缺口和未实现入站 hook 写成“已收口” | 未修 |

## 6. 生产状态证据

采样时间：2026-08-09 21:10（Asia/Taipei）。

| 项目 | 实际值 | 含义 |
|---|---:|---|
| Task 总数 | 21,284 | 已严重膨胀 |
| Cron Task | 21,167 | 几乎全部由调度任务制造 |
| WorkboardDispatchPump | 每 60 秒一次 | 空闲也创建 Task |
| WorkboardNotificationRelay | 每 60 秒一次 | 空闲也创建 Task |
| 两个轮询预计每日新增 | 2,880 | 与官方 push-driven 建议相反 |
| Workboard 卡片 | 42 | 26 done、12 blocked、4 ready |
| 4 张 ready 卡的派发计数 | 约 8,688 次/张 | 每分钟记一次 dispatch，但没有启动 |
| Task audit | 3 条 `delivery_failed` | 完成结果未送达 |
| Task Flow | 62 | 分散在多种 owner session；另有 1 条 queued 遗留 |

直接源码与卡片状态证明了自锁条件：一张卡可以同时是 `status=ready`，却保留旧的 `execution.status=running` 和 running attempt。Workboard 的 worker 选择会把该执行状态计作该角色已有运行任务，因而所有分配给同一角色的 ready 卡都被跳过；与此同时每次 dispatch 仍增加计数和事件。这正是“反复派发但无人执行”的确定根因之一。

## 7. 权限与风险现状

- `ops/default`、`housekeeper/housekeeper`、`life/life` 的 agentId、账号和绑定均未改变；
- 魚玄機当前 `exec.mode=full`、`strictInlineEval=false`，exec approval 为 `ask=off`；历史上频繁原生审批的直接条件已被缓解；
- 但审批文件保留大量旧 `allow-always` 项，统一风险闸门只覆盖部分命令文本；
- 賈南風和蕭觀音没有 raw exec，这一点应保持；
- 目标不是恢复工业审批卡，而是：低风险自动、中风险内部审查与回滚、高风险只用角色化自然中文询问一次，并对精确动作指纹授权。

## 8. 正式计划必须满足的硬约束

1. 不改名、不猜身份；迁移前后核对三组绑定和实际 Telegram 路由。
2. 任何正式任务入站都先进入持久 inbox；模型不调用工具时也不能静默遗忘。
3. 角色记忆、角色卡、Standing Orders、Skill 只提供语义，不承担唯一触发与状态保存。
4. Task Flow 是执行编排真相；Workboard 是业务控制与可见投影；二者必须用同一关联记录和幂等键连接。
5. 所有晨报模块输入都能由蕭觀音正确写入；賈南風可以做带认证、可追踪、可去重的转交。
6. 停止两个一分钟空轮询，改为 hook 驱动与 Gateway 内部的轻量持久 outbox/reconcile 服务，不再制造 Task。
7. worker 结束必须由程序收口；缺少证据只可进入 review/blocked，不可因模型说“完成”而 done。
8. 低风险自动，中风险内部审查并保留回滚，高风险一次自然询问；任何时候不向用户弹工业卡片。
9. Telegram 只说角色化自然中文，信息完整但不泄露 Card、Task、Host、CWD、UUID、session、claim、heartbeat 等内部字段。
10. 必须通过故障注入、重启恢复和真实 Telegram 端到端验收，才能整理文档、同步 GitHub 和最终通知。
