# Codex Task Panel 计划审核一：架构与需求 v0.01

- 审核日期：2026-07-26
- 审核对象：`CodexTaskPanel任务面板部署计划-v0.01.md`
- 关注面：是否符合角色设计、用户目标、官方产品边界和范围控制
- 结论：有条件通过；下列约束纳入计划后通过本轮审核

## 1. 需求逐项映射

| 需求 | 计划对应 | 结论 |
| --- | --- | --- |
| Telegram 向賈南風交代 | housekeeper 只登记已认证少主消息 | 通过 |
| 专属于 Codex | 独立 `codex` board，不进 production dispatcher | 通过 |
| 每小时轻量扫描 | Codex Desktop standalone Scheduled；空队列立即结束 | 通过 |
| 发现更新后执行 | reserve 后创建独立 Codex thread | 通过 |
| 固定研究与修复标准 | versioned execution policy | 通过 |
| 三次审核 | 三个不同关注面和独立记录 | 通过 |
| 验收、文档、同步 | card 完成门禁和 Git 证据 | 通过 |
| 賈南風最终通知 | 独立真实 Telegram 验收 | 通过 |

## 2. 发现一：不能把 Workboard 的 `engine=codex` 当成桌面 Codex

现场虽然存在 `@openclaw/codex`，但生产 ops 没有 OpenAI auth profile，现有 Workboard worker 使用角色默认模型。仅凭卡片 execution 字段不能证明是当前 Codex Desktop 任务。

修订要求：

- 本次明确使用 Codex Desktop Scheduled；
- NAS 原生 Codex 作为以后单独授权、单独 OAuth、单独验收的替代方案；
- 不修改八角色默认模型。

结果：计划已明确，问题关闭。

## 3. 发现二：賈南風不得成为执行者

原设计规定賈南風接单、调度、催办、汇总，不写代码、不部署。本方案若让她通过 shell 启动 Codex，会扩大权限。

修订要求：

- 賈南風只用现有 Workboard 工具建卡、查询、取消；
- Scheduled 在 PC 侧独立运行；
- 凭据不进入 housekeeper workspace 或工具面。

结果：计划已明确，问题关闭。

## 4. 发现三：独立 board 必须与 production pump 隔离

现有 `WorkboardDispatchPump` 固定 `--board production`，这是可复用的天然隔离。不得改成 all boards，也不得新增 OpenClaw `dispatch --board codex`。

结果：列为部署与回归硬门禁。

## 5. 发现四：PC 离线边界必须直说

Codex 官方说明本地项目 Scheduled 依赖电脑开机、项目可用和桌面应用运行。用户“不在电脑旁”可以实现，“电脑关机仍执行”不属于本方案能力。

结果：计划、文档和最终汇报必须明确；不得称为 NAS 24/7 Codex。

## 6. 范围审核

- 未新增第九角色：通过。
- 未修改 production Workboard：通过。
- 未改 Telegram/A2A/记忆：通过。
- 未引入第三方任务系统：通过。
- 未把原角色设计重写成摘要：通过。

## 7. 本轮判定

上述四项约束已经进入正式计划。本轮审核通过，允许进入安全与回滚审核。

## 8. 部署反馈复审

真实 Scheduled 验收确认：每次 Codex Scheduled 已是官方 standalone 独立任务，调度环境内再创建第二层 Codex task 不可靠且没有必要。方案已改为“Scheduled 空扫；命中后本次独立 run 直接执行”，仍不占用賈南風或任何 OpenClaw 主会话，也满足少主要求的独立长任务。领取改用 Workboard 原生 claim，架构更贴合官方状态机。复审通过。
