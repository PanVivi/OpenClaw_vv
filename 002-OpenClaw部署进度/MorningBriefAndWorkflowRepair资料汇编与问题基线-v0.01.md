# 晨报接手与 Telegram 工作流修复｜资料汇编与问题基线｜v0.01

更新时间：2026-08-04（Asia/Taipei）  
适用仓库：`PanVivi/OpenClaw_vv`  
生产版本：`OpenClaw 2026.7.1-2 (0790d9f)`  
身份核对：魚玄機为 `agentId=ops`、Telegram account=`default`；賈南風为 `agentId=housekeeper`、Telegram account=`housekeeper`。本次没有改名，也不以显示名推断身份。

## 1. 调查范围与证据顺序

本次先完成只读调查，尚未改动生产：

1. 完整读取仓库 148 份最新有效文档；历史版本只用于追溯，不作为当前设计。
2. 核对本地 Git、GitHub 远端和生产运行态。当前 GitHub 最新项目提交为 `88659057a4d1abc5f9ec7ce992c03a138523a220`；后续工作从该提交建立独立工作树，不触碰现有脏工作区。
3. 读取 2026-08-03 17:50 后魚玄機 Telegram 对话、20:00 后賈南風 Telegram 对话及关联任务、Workboard、Task Flow、Cron、插件和日志证据。
4. 读取晨报恢复记录与 NAS 上 `hehuan-daily` 全部当前源码、测试结构和关键测试语义。
5. 查询 OpenClaw 官方说明、官方 GitHub 代码与议题、公开社群讨论；结论只采用可与当前版本或现场证据相互印证的部分。

证据优先级为：生产有效配置与日志 > 官方当前说明与当前版本代码 > GitHub 当前议题/合并记录 > 仓库当前文档 > 历史文档与社群经验。

## 2. 官方机制结论

| 机制 | 官方定位 | 本项目正确用法 |
|---|---|---|
| `AGENTS.md` / Standing Orders | 长期规则、边界和角色表达 | 规定职责、风险原则和说话方式；不能单独保证每个任务都按流程执行 |
| Skill | 可复用步骤、模板和检查表 | 承载“研究→计划→三次完整审核→实施→验收→同步”的操作手册 |
| Plugin / Hook | 工具、事件和确定性策略边界 | 强制风险门、状态转换、输出清洗、去重和审计；不能只靠模型自觉 |
| Cron | 精确时间触发 | 晨报 06:00 触发；不承担每分钟轮询任务板 |
| Task / Task Flow / Lobster | 后台运行、持久步骤、暂停恢复、完成通知 | 作为工作流运行和完成状态的唯一事实来源 |
| Workboard | 项目与任务的可视化管理 | 只显示/控制任务，不另建一套运行真相，也不替代后台任务引擎 |
| Exec approvals | 主机执行许可控制 | 作为最后安全闸，不等于面向少主的风险分级，也不能把原生技术卡片当成角色沟通 |

官方资料：

- [Exec approvals](https://docs.openclaw.ai/tools/exec-approvals)
- [Exec tool](https://docs.openclaw.ai/tools/exec)
- [Exec approvals advanced](https://docs.openclaw.ai/tools/exec-approvals-advanced)
- [Standing Orders](https://docs.openclaw.ai/automation/standing-orders)
- [Skills](https://docs.openclaw.ai/skills)
- [Creating Skills](https://docs.openclaw.ai/tools/creating-skills)
- [Hooks](https://docs.openclaw.ai/automation/hooks)
- [Plugin Hooks](https://docs.openclaw.ai/plugins/hooks)
- [Background Tasks](https://docs.openclaw.ai/automation/tasks)
- [Task Flow](https://docs.openclaw.ai/automation/taskflow)
- [Lobster](https://docs.openclaw.ai/tools/lobster)
- [Workboard](https://docs.openclaw.ai/plugins/workboard)
- [Cron](https://docs.openclaw.ai/automation/cron-jobs)
- [Heartbeat](https://docs.openclaw.ai/heartbeat)

## 3. GitHub 与社群资料结论

与现场症状直接相关的官方仓库记录包括：

- [#58881：`ask=off` 仍出现审批弹窗](https://github.com/openclaw/openclaw/issues/58881)
- [#88385：默认审批策略可能压过 Agent 明确策略](https://github.com/openclaw/openclaw/issues/88385)
- [#59150：内部 commentary 与重复可见回复](https://github.com/openclaw/openclaw/issues/59150)
- [#59643：回复阶段分离修复](https://github.com/openclaw/openclaw/pull/59643)
- [#39469：投递镜像与重复记录](https://github.com/openclaw/openclaw/issues/39469)
- [#26867：子任务完成通知异常](https://github.com/openclaw/openclaw/issues/26867)
- [#38055：通道不可用时完成通知可能丢失](https://github.com/openclaw/openclaw/issues/38055)
- [#51818：父会话失效后完成通知可能丢失](https://github.com/openclaw/openclaw/issues/51818)
- [#44925：子任务完成结果丢失、超时无通知](https://github.com/openclaw/openclaw/issues/44925)
- [#101656：Telegram 后台子任务缺少可靠存活和终态通知](https://github.com/openclaw/openclaw/issues/101656)
- [#112616：完成投递失败与任务成功状态分裂](https://github.com/openclaw/openclaw/issues/112616)
- [#115063：2026.7.1-2 的 Codex 子任务完成恢复缺口](https://github.com/openclaw/openclaw/issues/115063)

社群公开讨论的共同实践是：人格/记忆文件用于上下文，Skill 用于可复用流程，Plugin/Hook 用于强制策略，持久任务状态用于恢复；审批泛滥时应缩小并结构化工具面，而不是让用户阅读原生命令卡片。社群内容只作实践参考，最终方案以官方机制和现场验证为准。

## 4. 生产现场基线

### 4.1 权限与审批

- `ops` 的 `tools.exec.mode=full`、host=`gateway`，主机审批为 `security=full`、`ask=off`。
- 同时启用了 `strictInlineEval=true`；`python -c`、`sed/awk`、`find -exec`、`xargs` 等内联形态仍会进入额外审查路径。
- 因此“full/off”不等于任意命令形态都不会弹原生审批；旧文档中相反表述不成立。
- 原生 exec 卡片在角色表达层之外，不能满足“仅高风险询问一次、自然中文说明”的产品要求。

### 4.2 工作流与通知

- 官方任务累计 21,220 个，其中约 20,128 个来自两个每分钟轮询 Cron；当前没有活动中的官方任务。
- Workboard 仍把晨报 `1-C` 标为 running，claim 为空；`1-D` blocked；父阶段却已标 done，和官方任务事实分裂。
- 52 个 Task Flow 中 13 个失败；晨报研究子任务存在 3 条 `delivery_failed` 审计告警。
- `WorkboardDispatchPump` 与 `WorkboardNotificationRelay` 每分钟执行，既制造任务噪音，又将 malformed 事件转成“通知解析异常”直接发给少主。
- `housekeeper-async-dispatch` 自建私有任务表和 15 秒定时器，但当前已禁用；继续保留两套状态模型会增加漂移。

### 4.3 晨报

- Phase 0、1-A、1-B 已完成；1-C 只完成部分修改，1-D、预览、真实发送和 06:00 Cron 均未完成。
- 34 个 Python 文件中 `sender.py` 和 `scheduler.py` 存在字面量 `\\n` 造成的语法错误，当前代码不可运行。
- 模拟 `_do_send()` 返回 `mock-msg-*`，在启用发送时可能被记录为真实 `sent`。
- 旧测试把“timeout 后允许自动重发”和“pending 不阻止重发”写成成功条件，会造成 Telegram 重复消息风险。
- 收据与熔断状态虽调用 `fsync`，但使用固定临时文件名、缺少跨进程状态锁与父目录同步；并发或断电时仍可能丢状态。
- 运行数据默认写进 coder workspace；自定义 `data_dir` 时 `template_dir` / `override_dir` 不随之派生。
- 默认时区与文档不一致，默认地点仍是北京占位坐标；生产启用前必须显式提供用户实际配置，不能静默使用占位值。
- 连续三日逻辑需使用可注入、时区明确的本地日期；“五次连续失败”也不能在同一天快速重试中误触发为长期停发。

## 5. 问题清单与处置边界

| ID | 发现的问题 | 直接影响 | 处置方向 | 当前可修复性 |
|---|---|---|---|---|
| P01 | 低/中风险仍被原生审批卡打断 | 频繁索权 | 固定安全工具/API、命令规范化、角色级高风险门 | 可修复 |
| P02 | 原生 Card/Task/Host/CWD/UUID 工业字段面向少主 | 无法理解与决策 | 用户通道禁止工业卡；高风险改为角色化完整说明 | 可修复 |
| P03 | `strictInlineEval` 与旧文档结论冲突 | 配置“已修复”但现场仍索权 | 保留安全边界，消除常用内联命令形态并纠正文档 | 可修复 |
| P04 | 内部分析/commentary 泄露 | 角色破坏、信息噪音 | 输出阶段隔离与通道级清洗 | 可修复并需回归 |
| P05 | 同一回复重复发送 | 约 45 组完全重复 | 按 run/event/channel 幂等去重 | 可修复并需真实验收 |
| P06 | `ANNOUNCE_SKIP`、`REPLY_SKIP`、审批警告等控制词泄露 | 工业语言外显 | 精确控制词抑制，保留审计不外发 | 可修复 |
| P07 | malformed relay 事件直接发“通知解析异常” | 无意义骚扰 | 内部隔离并记录，不向用户发错误占位 | 可修复 |
| P08 | 每分钟 dispatch/relay 轮询 | 任务爆炸、资源浪费 | 改成 Task/Flow 完成事件驱动 | 可修复，需先验收替代路径 |
| P09 | 官方任务、Task Flow、Workboard 三套状态分裂 | running/done/blocked 互相矛盾 | 官方任务/Flow 为唯一运行事实，Workboard 只投影 | 可修复 |
| P10 | 父卡早于子项标 done | 假完成 | 强制子项、证据、验收全部通过后才允许父项完成 | 可修复 |
| P11 | claim 为空、无 heartbeat、重复领取 | 幻影运行和重复派发 | 原子 claim、租约、心跳和终态校验 | 可修复 |
| P12 | 完成 Agent 未走 message-tool-only 投递 | 任务成功但通知失败 | 改为请求者/拥有会话的确定性终态投递 | 可修复，受上游已知缺口影响需降级路径 |
| P13 | Grok 测试多次派发但无 worker 会话 | 假测试 | 以真实 worker/session/产物证据验收 | 可修复 |
| P14 | 主 Agent 与 worker 工具面不一致 | 接单后无法执行 | intake 前能力预检和显式 blocked | 可修复 |
| P15 | “消息已投递”被当作“任务已开始” | 状态误报 | 分离 accepted/started/progress/completed | 可修复 |
| P16 | 绿色测试覆盖不足或目标错误 | 假阳性 | 重写危险旧断言，增加故障/并发/恢复/E2E 测试 | 可修复 |
| P17 | 主动进度依赖模型记得汇报 | 长时间沉默 | 从持久任务状态生成稀疏进度和终态通知 | 可修复 |
| P18 | 工作流只写在角色/记忆文件 | Agent 遗忘流程 | Standing Orders + Skill + Hook/Plugin + Task Flow 分层 | 可修复 |
| P19 | 三次审核被实现为三个不同关注面 | 单次遗漏无法被另外两次发现 | 三次均独立完整审核；任一修改即三审重置 | 可修复 |
| P20 | 部署报告、CurrentProgress、README 状态漂移 | 文档假完成 | 以生产证据重建当前状态和版本索引 | 可修复 |
| P21 | 晨报源代码语法损坏 | 无法运行 | 修复并建立编译门禁 | 可修复 |
| P22 | 模拟发送可记 sent；unknown/pending 可自动重发 | 重复或假成功 | 显式 transport、ambiguous fail-closed、人工核对 | 可修复 |
| P23 | 收据/熔断状态并发、断电和时区处理不完整 | 幂等与熔断失真 | 原子状态层、跨进程锁、注入时钟和时区 | 可修复 |
| P24 | 晨报真实参数、密钥和最终投递配置未齐 | 不能安全启用真实 06:00 发送 | 先完成离线与预览；缺失输入单列，不擅自填占位值 | 条件性阻塞 |
| P25 | 生产版本存在官方已知子任务完成恢复缺口 | 终态通知仍可能丢失 | 本地确认版本能力，加入持久 outbox/ack 降级，不假称上游已修 | 可缓解；完全根治依赖上游版本 |

## 6. 不能提前宣称的事项

- 配置校验通过不等于 Telegram 真实行为通过。
- Workboard 显示 done 不等于官方任务完成。
- 模拟 message id 不等于 Telegram 已发送。
- 单次测试绿不等于幂等、并发、断线恢复和重复抑制通过。
- 角色卡写了流程不等于运行时一定执行流程。
- 未取得真实用户参数前，不启用生产晨报 Cron，也不发送占位晨报。

## 7. 2026-08-09 增补：定稿、蕭觀音全模块控制与賈南風转交

### 7.1 新增现场证据

- 2026-08-04 11:54 已确认的华丽完整版与 11:55 实际扁平版存在结构性差异；不是 Telegram 字体或客户端渲染问题。
- 错误版 06:00 Cron 曾持续发送至 2026-08-09，最后一条已核实 message id 为 277；调查后已保持 disabled，修复验收前不得恢复。
- 2026-08-07 的 life 会话中，少主要求加入“8 月 8 日 9:15 技能考试”。蕭觀音实际只调用 `life_automation create`，把单独提醒设在事项发生时刻，没有写入晨报。
- 少主明确要求“所有日程进入晨报，非默认日程提前一小时单独提醒”后，蕭觀音用 remove/create 将单独提醒改到 08:15，但仍没有晨报写入调用；她随后只查询 `life_automation list`，据此把另一套 command Cron 晨报误判为 0 个。
- 现有 `morning-brief-owner-profile.json` 只在 `morning_briefing` 中记录发送时间、时区策略和失败通知；没有七个模块的动态输入结构。
- 现有晨报 `owner_profile.py` 只投影当日排班到 `custom_sections.schedule`，不读取用户新增日程、任务、偏好、模块备注或转交记录。
- 生产 life 的 `AGENTS.md`、`TOOLS.md`、`SOUL.md` 没有晨报系统名称、状态、输入文件、模块映射或写入工具说明。`life_files` 只是受限通用文件工具，不能保证字段级 schema、提醒联动、去重和模块回读。
- housekeeper 角色已有“正式委派包承载少主授权、life 为生活自动化唯一执行所有者”的原则，但没有晨报专用转交记录、应用确认和失败回告，因此“已转达”不等于“已录入”。

### 7.2 官方、GitHub 与社群增补结论

- OpenClaw 官方把 Tool 定义为结构化读写或外部操作能力，把 Skill 定义为已有工具的可复用操作说明，把 Plugin 定义为可增加工具、Skill、Hook 与运行时能力的扩展面；因此本问题不能只靠角色记忆文件或单独 Skill。
- 官方 `sessions_send` 说明明确：Agent 间消息在接收方上下文中标记为 inter-session data、`isUser=false`，不是直接终端用户指令；转交必须携带已认证来源与范围，并以持久记录和应用回执证明完成。
- 官方 Plugin Hook 可拦截工具、消息和 Agent 生命周期；本项目优先使用窄接口 Tool + 持久状态，Hook 只做路由/校验，不把自然语言提示当数据库事务。
- 官方 GitHub [#43735](https://github.com/openclaw/openclaw/issues/43735) 记录了 workspace Skills 未稳定进入既有 Agent 上下文的现场案例，进一步说明 Skill 只能辅助识别流程，不能作为唯一强制层。
- 社群对长流程和多 Agent 的反复经验是：仅靠 SOUL/角色提示和 Skills 仍会中途停滞或忘记；可靠性来自缩小自主步骤、使用持久队列/状态、固定工具和可核验回执。社群意见只作设计佐证，不替代官方契约与生产实测。

官方与主要资料：

- [Tools：如何选择 Tool、Skill 或 Plugin](https://docs.openclaw.ai/tools)
- [Skills](https://docs.openclaw.ai/tools/skills)
- [Plugins](https://docs.openclaw.ai/plugins)
- [Plugin hooks](https://docs.openclaw.ai/plugins/hooks)
- [Session tools 与 Agent 间消息来源语义](https://docs.openclaw.ai/session-tool)
- [OpenClaw GitHub tools index](https://github.com/openclaw/openclaw/blob/main/docs/tools/index.md)
- [OpenClaw GitHub skills 文档](https://github.com/openclaw/openclaw/blob/main/docs/tools/skills.md)
- [社群：长任务可靠性与持久工作队列讨论](https://www.reddit.com/r/openclaw/comments/1sltjrt/what_actually_makes_ai_agents_reliable_on_long/)
- [社群：多 Agent 工作流停滞与上下文丢失讨论](https://www.reddit.com/r/openclaw/comments/1rg1uud/openclaw_multiagent_workflow_why_i_cant_get_it_to/)

### 7.3 新增问题

| ID | 发现的问题 | 直接影响 | 处置方向 |
|---|---|---|---|
| P26 | 11:55 实现偏离 11:54 已确认定稿 | 华丽版式、称呼、日期、框饰和祝辞丢失 | 定稿 golden、失败样本反测、Telegram 视觉终验 |
| P27 | 晨报 command Cron 与 `life_automation` 是两个互不可见的调度视图 | 蕭觀音误报系统为 0 个 | 建立晨报专用状态查询和唯一系统登记，不用通用提醒列表推断 |
| P28 | 用户新增日程只建提醒，不写晨报 | 晨报遗漏事项 | 一个事件写入事务同时登记晨报事项和提前提醒策略 |
| P29 | 七个模块没有统一的受控数据输入接口 | 蕭觀音无法把对话映射到正确模块 | 专用 typed Tool、schema、日期范围、来源、回读与投影 |
| P30 | 賈南風转交没有晨报专用持久记录与应用回执 | 可能只“转达”未录入 | pending handoff → life apply → applied/blocked 回执与去重 |
| P31 | `life_automation update` 未在缺少 `schedule_kind` 时应用新的 `at` | 模型需 remove/create 补救，增加竞态和误删风险 | 晨报事件提醒由专用插件原子管理；同时补该工具回归测试 |
| P32 | 人工输入与自动事实未区分 | 可能手工伪造天气、AQI、在线状态或农历 | 人工只改偏好、地点、事项和备注；自动事实由可核验源生成 |
| P33 | 事项发生时刻被误当提醒时刻 | 提醒到达即迟到 | 非默认日程默认提前 60 分钟，事件与提醒分别显示和验收 |
