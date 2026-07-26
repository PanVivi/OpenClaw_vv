# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.10

这份文档以 v1.02 全文为不可删减底稿，供后续 AI 快速接手。先读本页，再按仓库根目录 README 的明确版本路径读取具体文档；文末“v1.09 增量状态”覆盖已经过时的版本号和运行状态，其余原文继续有效。

## 项目目标

为薇的 OpenClaw 搭建长期运行的多 Agent 系统。组织名为“合欢宗”，支持 Telegram Bot、任务调度、代码与部署、内部审查、生活娱乐和陪伴分支。

基础身份：

- 主人/用户名：薇。
- 下级 Agent 对薇的称呼：少爷、少主、公子。
- housekeeper 正式人格名：賈南風。

## v2.1 Agent 结构

```text
agents/
├── housekeeper       # 賈南風：大总管、决策与协调中心
├── ops               # 魚玄機：工程方案、调试和执行主力
├── coder             # 步非煙：代码与脚本产出
├── reviewer          # Review / Risk / Test
├── life              # 蕭觀音：生活与陪伴分支主控
├── companion-dugu    # 獨孤伽羅
├── companion-wu      # 武曌
└── companion-lv      # 呂雉
```

薛濤、文薑不再作为独立 Agent；Review / Risk / Test 职责合并到 `reviewer`，当前 reviewer 人格名称为夏姬。

## 当前部署进度

已完成：

- `Change-0003` 和 `INC-2026-0001` 已关闭。
- Gateway 和 Telegram Provider 正常。
- `ops agent + Telegram accounts + bindings` 基础配置已生效。
- Step 1 Workspace Initialization 已创建八个 Agent 目录和基础目录。

当前下一步：

```text
Step 2：迁移魚玄機配置到 agents/ops
```

NAS 上的 housekeeper、coder、reviewer、life 和 companions 尚未完成正式配置。

## 賈南風最新设定

当前角色包：

```text
AgentCards角色卡-v0.04/
└── housekeeper-賈南風-v1.02/
```

核心原则：

- 賈南風是大总管和跨 Agent 决策协调中心，不是逐项请示的传话人。
- 简单、日常、低风险、影响范围明确且容易回退的事项，由她自行判断、推进并在完成后汇报。
- 只有可能显著影响整体系统稳定性、持续运行、重要数据、核心权限、重大成本、公开影响或难以回退的重大高风险事项，才在执行前上报薇。
- 她不直接持有 shell、项目写入、删除、服务控制或 `sessions_spawn`，但可以决定并调度有权限的 Agent 执行。
- 局部依赖不可用时，只阻塞受影响任务分支；不依赖该能力的工作继续推进。
- 默认使用日常管家模式；严肃现实任务自动进入事实优先的工作模式。
- 强烈羞辱性或占有性称呼可在任何模式下作为语言修饰，不得影响事实、风险判断、权限边界或实际操作。
- 当前主要模型计划使用 GPT Luna，后续可替换为其他经过验证的高能力、稳定、平价模型。

## Companion 路由

正常流程：

```text
賈南風 / housekeeper
→ 蕭觀音 / life
→ companion
```

賈南風可以读取 companion 会话和必要历史，用于协调、判断和执行薇的要求。薇直接要求时，賈南風可以绕过 life，直接联系并向指定 companion 下达陪伴、对话或情绪价值相关指令。

Companion 不持有工程执行权限，也不得接收无关工程凭据和生产敏感数据。

## 工程工作流

```text
薇提出目标
→ 賈南風判断范围、风险和所需 Agent
→ ops 制定或确认技术方案
→ reviewer.Review
→ coder 按需实现
→ reviewer.Risk
→ 賈南風按风险边界决定推进或上报薇
→ ops 执行并自检
→ reviewer.Test
→ 賈南風汇总
```

说明：

- 低风险、范围明确、容易回退的步骤可由賈南風自主决定。
- 重大高风险操作必须先上报薇。
- 只交付任务不得自动进入运行、部署或应用。
- 文件写入成功不等于角色规则完整加载；新会话必须检查 bootstrap 完整性。
## v1.09 增量状态（2026-07-23）

- 当前权威总设计：`FinalDesign最终设计-v1.08.md`，由被删的完整 v1.02 原文恢复并增量合并，不再用摘要版覆盖原设计。
- 当前角色版本：賈南風 v1.11、魚玄機 v0.14、步非煙 v0.08、夏姬 v0.06、蕭觀音 v0.08、獨孤伽羅/武曌/呂雉 v0.05；共同协议 v0.05。
- 八个 Agent均保留独立 workspace、Telegram binding、session/transcript 和个人记忆边界。武曌账号已恢复健康。
- 八个 Telegram 主会话都启用同角色隔离子 Agent：具体长任务后台执行，主会话先回执后继续接收消息。A2A 常驻角色委派、life 持久自动化和子 Agent各自独立，不互相冒充。
- 明确任务只授权一次：低风险自动执行，中风险内部 Risk/备份/回滚/Test，高风险才由 housekeeper集中请示一次。
- `sessions_history` 继续默认拒绝，不能用并发或恢复为理由重新开放全局历史。
- 部署必须先备份角色卡、配置、session/transcript/记忆和路由清单，再最小更新、validate、真实 Smoke Test 和可回滚验证。
- GitHub 远端没有 `mina` 分支；当前工作分支是 `agent/lossless-content-update`，完成验收后同步该分支并快进 `main`。
- 賈南風的跨角色派发由 `housekeeper-async-dispatch 1.2.2` 立即返回并持久跟踪；超过首次回报期限或收到 blocked 时主动向原会话报告，不等少主追问。超期只证明未收到回报，不能擅自说成卡死或失败。
- Telegram Bot Token 不经过模型复制、A2A 转发、日志或配置回显；`ops-token-intake 1.0.1` 在模型脱敏前保存为安全 `tokenFile`，魚玄機只取得 opaque handle，绑定继续走 OpenClaw 原生命令。

## v1.10 增量状态

- 正式任务权威源：官方 Workboard + 原生 Tasks/Task Flow。
- 賈南風：负责建卡、拆分、依赖、分派、风险升级和汇总；长任务在责任角色独立 worker 中执行，主 Telegram 会话不阻塞。
- 自动续办：`WorkboardDispatchPump` 每分钟推进依赖、超时和 ready 卡；普通授权范围内不重复询问。
- 主动汇报：`WorkboardNotificationPump` 每两分钟消费 completed/failed/stale 事件，无事件静默，终态通过賈南風 Telegram 发送。
- 旧 `housekeeper-async-dispatch 1.2.2` 已 disabled；两条历史终态已只读迁入 `production` 工作板，原 `tasks.json` 继续保留。
- 当前窄适配插件：`housekeeper-workboard-control 1.0.3`，只允许固定 dispatch 与按 UUID 只读 show，不授予 shell。
- 生产已通过并发、自动条件续办、超时失联、重启恢复、A2A、Telegram、权限负向、数据无损和审计验收。
