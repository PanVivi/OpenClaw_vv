# 晨报接手、全模块控制与 Telegram 工作流修复｜生产验收报告｜v0.01

验收日期：2026-08-09（Asia/Shanghai）  
生产版本：OpenClaw `2026.7.1-2` / Node `22.22.3`  
冻结计划包 SHA-256：`FFB32E2A2775DCB6AE435E1ED955FC6A28F0B6705419EC870E994D373F4FE4C6`  
受管 Task Flow：`d33f7fad-fa0d-4351-b1be-31c8d02e0578`

## 1. 结论

晨报任务已完成并启用：输出恢复为 2026-08-04 11:54 确认的华丽版式；蕭觀音可以查询晨报状态，并能把所有允许人工输入的模块信息写入正确位置；賈南風可以代收相关信息，经持久转交由蕭觀音应用，只有 `applied` 才算录入成功。2026-08-09 的纠正版已由 life Telegram account 真发，message ID `278`；同日幂等重跑没有产生第二条。唯一正式 Cron 为每天 06:00、`Asia/Shanghai`，下一次为 2026-08-10 06:00。

系统工作流修复已完成到当前 OpenClaw 版本可安全实现的边界：低风险和中风险不再向少主索要逐命令权限；高风险通用执行在副作用前被拦下，由角色自然说明并只问一次，不生成原生审批卡；通知控制词、解析异常和不确定发送均已 fail-closed。OpenClaw 2026.7.1-2 没有 Task/Flow 状态变化 Hook，因此两个旧 Workboard 分钟轮询暂不能安全停用；这是本轮唯一影响架构完全收口的上游条件，详见第 8 节。

## 2. 资料与机制依据

- 官方 Tools：Tool 是带 schema 的确定性动作边界，适合校验、权限和持久写入：<https://docs.openclaw.ai/tools>
- 官方 Skills：Skill 是按需注入的工作指引，不是强制执行器：<https://docs.openclaw.ai/tools/skills>
- 官方 Plugins / Hooks：Plugin 承担运行时工具与 Hook；本轮以生产安装包类型声明校验当前版本真实 Hook：<https://docs.openclaw.ai/plugins>、<https://docs.openclaw.ai/plugins/hooks>
- 官方 Session Tool：A2A 是会话间传递，不自动等同于少主授权或最终落库：<https://docs.openclaw.ai/session-tool>
- 官方 GitHub issue `#43735` 记录 workspace Skill 可能没有稳定进入上下文，支持“不靠角色记忆保证工作流”：<https://github.com/openclaw/openclaw/issues/43735>
- 社群关于长任务遗忘、停滞和提示文件不足的讨论只作为现象参考；实现结论仍以官方文档、生产 SDK 和真实行为为准。

## 3. 三次独立完整审查

三份审查都从完整需求起点核对同一冻结计划包，不是按不同角度拆分；旧审查在计划变化后已作废。

| 次序 | 审查文件 | 证据 SHA-256 | 结论 |
|---|---|---|---|
| 一 | `MorningBriefAndWorkflowRepair全模块修订独立完整审核一-v0.02.md` | `DCB8854E...C755C` | 通过 |
| 二 | `MorningBriefAndWorkflowRepair全模块修订独立完整审核二-v0.01.md` | `19F39128...C39E6` | 通过 |
| 三 | `MorningBriefAndWorkflowRepair全模块修订独立完整审核三-v0.01.md` | `A5CD6F84...75ED2` | 通过 |

生产 `workflow_governance` 已把同一计划哈希、三份独立证据、不同 nonce 和 `validation` 阶段写入官方 Task Flow。计划哈希变化会清空三审；少于三审不能进入实施；存在未终结或失败子任务时不能进入最终通知。

## 4. 晨报与全模块输入验收

| 目标 | 结果与证据 |
|---|---|
| 11:54 定稿版式 | 2026-08-04 golden 固定验证标题、称呼、日期、农历六月廿二、晨辞、七个框、分隔线与结尾祝辞；11:55 扁平样本为负例 |
| 数据准确性 | 2026-08-04 月相为亏凸月；天气、空气、农历、在线和系统状态不得由人工覆盖 |
| 全模块录入 | `morning_brief_control` 覆盖抬头/祝语、地点与天气关注、空气敏感、衣行偏好、生活待办、门人备注、日程和小签偏好；写后回读并按日期投影 |
| 日程与提醒 | 事件时刻与提醒时刻分存；非默认事件默认提前 60 分钟；修改和取消同步处理提醒 |
| 蕭觀音认知 | 新会话真实查询后准确回答晨报已启用、每天 06:00、下一次时间和可录入类别；2 次晨报工具调用，0 失败 |
| 賈南風转交 | `morning_brief_handoff` 只允许 housekeeper 提交/查询/取消；真实自然语言转交形成 applied 回执并投影到 life 输入文件 |
| 权限隔离 | life 可写，housekeeper 只转交，其他 Agent 不可见；人工不能伪造自动事实 |
| 真发与幂等 | 旧扁平消息为 `277`；纠正版为 `278`；同键重跑零新增；运行数据不入 Git |
| Cron | `hehuan-morning-brief` 已启用，表达式 `0 6 * * *`，时区 `Asia/Shanghai`，无第二个正式晨报 Cron |
| 清理 | 验收事件、任务、模块备注、地点和偏好均已归档/清除，当前 active 数均为 0 |

本地晨报测试共收集 `279` 项，最终为 `278 passed, 1 skipped, 0 failed`，全源码 compile 通过。`morning-brief-control 1.0.2` 集成测试通过，生产依赖审计 0 漏洞。

## 5. 风险、通知与可靠工作流验收

- `ops-controlled-exec 1.0.0` 只向 ops 暴露参数化只读状态、诊断、哈希和有限日志，不接受任意命令文本。
- `workflow-governance 1.0.2` 只对 housekeeper/ops 暴露受管 Flow；冻结计划、三审、阶段、验收和最终 message ID 是持久状态，不靠角色记忆。
- 高风险 `exec/process` 不再返回 `requireApproval`；通用路径直接 blocked，并要求角色说明目标、最坏影响、回退、替代和一次决定。生产新会话要求重启 Gateway 时，魚玄機只核对状态并给自然建议，没有重启、没有审批卡。
- `WorkboardNotificationRelay` 在外发前写 `sending`；发送异常写 `unknown` 并停止自动重发；只有真实 message ID 才写 `sent`。`ANNOUNCE_SKIP`、`REPLY_SKIP`、`NO_REPLY` 和 malformed 事件只进审计。
- 通知中继 22 个发送失败、重放、控制词、解析异常和 advance 失败样本通过；生产 staging 运行同一自测通过。
- `life_automation 1.1.0` 生产真实回归：创建 10:00 临时提醒 → update 只传新 `at=11:00`、省略 `schedule_kind` → get 确认为 11:00 → remove；6 次工具调用、0 失败，临时提醒已删除。

## 6. P01—P33 验收汇总

| 问题 | 状态 | 结论 |
|---|---|---|
| P01—P03 | 通过（受控能力边界） | 低中风险不索权；常用只读运维走 typed Tool；不关闭 `strictInlineEval`；未覆盖通用命令不降级成审批卡 |
| P04—P07 | 通过 | 用户输出与内部字段分离；去重、控制词精确隔离；malformed 只审计 |
| P08 | 条件不足 | 当前版本无 Task/Flow mutation Hook，两个分钟轮询保留；禁止在替代链未通过时停用 |
| P09 | 部分收口 | 新正式流程以 Task Flow 为唯一事实；旧 Workboard 历史仍受 P08 约束，不能假称已全部迁移 |
| P10—P11 | 通过 | 失败/活动子任务阻止父项通知；既有 Workboard claim/lease/heartbeat 保持 |
| P12 | 已缓解 | Relay 与治理 Flow 均有持久待通知/ack；上游 announce 缺口仍受 P25 约束 |
| P13 | 通过 | 可用性测试以真实 worker/session/调用结果为准，不以派发成功冒充模型成功 |
| P14 | 已缓解 | Skill 要求能力预检，受控 Tool 缩小能力；没有专用能力的高风险动作明确 blocked |
| P15—P16 | 通过 | accepted、started、terminal 分离；正例、反例、并发、崩溃、重放和真实 E2E 共同验收 |
| P17 | 已缓解 | 终态与通知进入持久状态；完全事件驱动的稀疏进度仍依赖 P08/P25 上游接口 |
| P18—P20 | 通过 | Standing Orders + Skill + Plugin + Task Flow；三审门和文档版本索引已落地 |
| P21—P24 | 通过 | 语法、幂等、unknown、原子状态、时区、真实参数、真发和 Cron 全部通过 |
| P25 | 上游条件 | 本地 outbox/ack 降级已做；完全根治需升级到提供可靠终态事件/恢复接口的版本后重验 |
| P26—P33 | 通过 | 华丽定稿、唯一状态、全模块、正式转交、自动化 update、事实边界和提前 60 分钟均通过 |

## 7. 无损与回滚

- 身份没有改名：`ops/default`、`housekeeper/housekeeper`、`life/life` 三条 Telegram binding 原样保留。
- Gateway 重载后四个目标插件均 `loaded`；晨报 Cron 仍启用；active 验收输入为 0。
- 生产备份位于 `backups/morning-brief-repair-*`、`backups/workflow-governance-repair-20260809-2220` 和 `backups/workflow-governance-repair-20260809-2235`；配置、角色、插件、晨报程序和旧中继均可恢复。
- 任何 `unknown` 消息不得因重启或回滚自动重发。

## 8. 不能完全修复或暂不具备条件

1. **分钟轮询不能安全移除。** OpenClaw 2026.7.1-2 的公开 Plugin Hook 列表没有 Task/Flow mutation 事件。当前 `WorkboardDispatchPump` 与 `WorkboardNotificationRelay` 仍每 60 秒运行，已累计制造超过 2.1 万条 cron task 记录。完全修复需要上游事件接口或升级后重新验证；在此之前直接停用会丢派发/终态通知。
2. **上游子任务完成恢复缺口不能由角色文件根治。** 本地已用持久待通知状态和 message ID ack 缓解，但升级到含官方修复的版本前不能承诺所有断线窗口都由上游自动恢复。
3. **Telegram ambiguous 无法自动判定。** 超时或连接断开可能发生在平台已接收之后；系统必须进入 `unknown` 并人工核对，不能为了“自动恢复”冒险重发。
4. **未建专用能力的高风险动作保持 blocked。** 这是消除工业审批卡后的安全边界；需要执行时应先为该动作建立固定 schema、范围、回滚和一次授权消费，不能开放任意 shell 绕过。

这些项目不影响晨报、全模块录入或賈南風→蕭觀音转交的正常使用，但影响旧 Workboard 的完全事件化和所有高风险操作的覆盖面。
