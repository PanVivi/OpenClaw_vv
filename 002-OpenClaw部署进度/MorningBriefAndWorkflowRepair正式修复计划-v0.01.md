# 晨报接手与 Telegram 工作流修复｜正式修复计划｜v0.01

计划日期：2026-08-04（Asia/Taipei）  
计划状态：第一次完整审核发现缺口后已修订，三次通过审核重新计数  
依据：`MorningBriefAndWorkflowRepair资料汇编与问题基线-v0.01.md`

## 1. 目标与完成定义

本计划同时完成两项任务：

1. 接手并核验“晨报”已完成部分，修复当前代码，完成安全预览；在真实参数、真实发送条件齐备后，完成一次可核验的 Telegram 真实发送和 06:00 Cron 验收。
2. 修复问题基线 P01—P25。无法本地根治或缺少必要条件的项目必须单列，不得用“基本完成”“配置已写”替代。

总完成条件：

- 同一最终计划连续通过三次相互独立的完整审核；
- 计划版本或内容一旦因审核发现而修改，前三次审核全部作废，从审核一重新开始；
- 实施、生产验收、回滚验证、文档和 GitHub 同步全部完成；
- 賈南風使用 `housekeeper` Telegram account 向少主发送一条自然、清楚、不含工业字段的最终通知；
- 若 P24 或上游 P25 阻塞真实启用，则仅能宣布“已完成到安全边界”，并在通知中明确剩余条件，不能宣布整项完成。

## 2. 不可破坏边界

1. 不改名，不改变 `ops` / `housekeeper` 的身份与现有 Telegram binding。
2. 不提交 token、私聊 transcript、session 数据、个人记忆、密钥或可复用凭据。
3. 不整份覆盖生产配置；配置只按明确键增量变更。
4. 不先停旧轮询再验证新事件链；替代链验收通过后才切换。
5. 不把 `strictInlineEval` 直接关闭作为消除弹窗的捷径；优先缩小、固定和审计工具面。
6. 低风险自动执行；中风险内部完整检查、可回滚后执行；只有高风险在副作用前向少主询问一次。
7. 用户通道永不出现原生工业审批卡、路径、主机、任务 UUID 或控制词。高风险询问必须由角色说明目标、风险、最坏影响、回滚、替代和需要的决定。
8. 在三次审核通过前不修改生产。

## 3. 三次独立完整审核规则

三个审核文档均从零开始，完整检查同一计划的全部内容：

- 需求和范围；
- 证据与官方机制一致性；
- 身份、权限和风险分级；
- 数据安全、并发、失败恢复和回滚；
- 每个问题 ID 的处置闭环；
- 晨报实现、真实投递与 Cron；
- 工作流状态机、通知和输出边界；
- 测试、E2E 验收、反例和假阳性；
- 文档、GitHub 同步和最终 Telegram 通知；
- 不能修复项与外部依赖。

每次审核都必须记录：计划文件 SHA-256、完整检查清单、逐项结论、发现、是否修改计划、最终通过/不通过。任何发现导致计划改变时：提高计划版本或更新内容，重新计算 SHA-256，作废已完成审核，重新执行审核一、二、三。

## 3.1 计划实施产物与边界

| 产物 | 仓库权威路径 | 生产位置 | 最小职责与边界 |
|---|---|---|---|
| 晨报程序 | `001-OpenClaw规划设计/Automation自动化/hehuan-daily/` | OpenClaw state 下独立应用目录 | 生成、闸门、receipt、transport、Cron 入口；不存 token 和真实个人数据 |
| 工作流 Skill | `001-OpenClaw规划设计/Skills技能/workflow-execution/SKILL.md` | OpenClaw shared skills 目录 | 给 Agent 提供完整生命周期操作手册；不执行越权动作，不作为状态真相 |
| 工作流治理 Plugin | `001-OpenClaw规划设计/Plugins插件/workflow-governance/` | OpenClaw extensions 目录 | intake、状态门、审核 hash、能力预检、outbox、投影、输出策略和审计；仅向获准 Agent 注册最小工具 |
| 魚玄機受控执行 Plugin | `001-OpenClaw规划设计/Plugins插件/ops-controlled-exec/` | OpenClaw extensions 目录 | 仅 `agentId=ops` 可见；参数化执行固定能力、确定性风险分类、回滚元数据和高风险拒绝；不向其他 Agent 暴露通用 shell |
| 工作流状态 | 不进 Git | OpenClaw state 下 `workflow-governance/`，0700/0600 | 官方 task/flow 标识、计划 hash、步骤、claim、lease、证据索引、outbox；不保存 secret 和完整私聊正文 |

治理 Plugin 的最小接口：

- `workflow_intake`：建立任务、来源、目标、风险上下文和所需能力；
- `workflow_plan_bind`：绑定计划文件、SHA-256 和问题清单；
- `workflow_review_record`：每次完整审核写入独立证据；计划 SHA 改变时自动清零三审；
- `workflow_transition`：按状态机和前置证据转换，拒绝越级和父项假完成；
- `workflow_claim` / `workflow_heartbeat`：原子租约和存活；
- `workflow_outbox_enqueue` / `workflow_outbox_ack`：幂等终态通知；
- `workflow_project`：把官方 task/flow 状态投影到 Workboard，不反向制造运行事实。

`ops-controlled-exec` 的最小接口按能力拆分，不接受任意 shell 字符串。第一批覆盖本次日志中出现的安全读写、配置查询、服务状态、文件校验、受控原子替换和已备案重启；每个动作有参数 schema、允许根目录、风险级别、前置检查、回滚和审计。未覆盖动作不得偷偷退回内联 shell：先进行能力预检，再使用仍受主机审批保护的 fallback；若 fallback 会出现原生工业卡，则不执行并回到角色化高风险决定或明确 blocked。

## 4. 阶段 A：冻结基线与恢复点

### A1. Git 与源码归一

- 在独立工作树 `codex/repair-morning-workflow-20260804` 实施。
- 以 GitHub 最新提交 `88659057...` 为起点。
- 将 NAS 上晨报源码复制到仓库 `001-OpenClaw规划设计/Automation自动化/hehuan-daily/`，保留原始 SHA-256 manifest 和只读基线记录。
- 不把运行数据、密钥、receipt、state 或个人模板带入 Git。

### A2. 生产备份

- 备份允许变更的脚本、插件、Cron 定义、角色当前文件和配置明确键。
- 单独记录不可破坏对象计数和哈希：sessions、transcripts、memory、Telegram accounts/bindings、secrets 文件元数据。
- 备份文件权限不宽于原文件；生成 SHA-256 manifest。

### A3. 基线验收

- 记录 OpenClaw 版本、配置校验、Agent/account/binding、插件状态、Cron、Task、Task Flow、Workboard、Gateway 健康和相关日志窗口。
- 记录当前 Telegram 问题样本的事件键、重复数量和泄露类型，敏感内容只保留摘要/哈希。
- 直接读取生产安装包的 Plugin SDK、类型声明和官方当前版本文档，列出 `2026.7.1-2` 实际支持的工具注册、Hook 名称、事件参数和加载方式；用一个无副作用最小探针验证，而不是按新版本文档猜接口。
- 若所需 Hook 在当前版本不存在，改用当前版本已支持的注册工具、Task/Flow 入口和结构化投递边界；不得热补丁 OpenClaw 核心，也不得以角色提示词冒充强制执行。

## 5. 阶段 B：完成晨报代码

### B1. 修复可运行性与配置

- 修复 `sender.py`、`scheduler.py` 语法损坏。
- 把运行数据默认目录迁到独立 OpenClaw state 区；`template_dir`、`override_dir`、receipt、circuit、lock 全部从 `data_dir` 派生。
- 生产模式要求显式 chat/account、时区、地点和必要个人参数；北京坐标等占位值只能用于 fixture，不能静默进入真实发送。
- 使用 `zoneinfo` 和可注入 Clock 计算目标本地日期、旅行覆盖和连续日；所有测试不依赖机器当前日期。

### B2. 幂等、状态和熔断

- 建立一个共享原子 JSON 状态层：同目录唯一临时文件、0600、文件 `fsync`、`os.replace`、父目录 `fsync`、跨进程 `flock`、损坏文件 fail-closed 与隔离副本。
- receipt 状态至少为 `pending`、`sent`、`failed_safe_to_retry`、`unknown_needs_reconcile`、`not_sent`；只有明确未提交到 Telegram 的失败才可重试。
- timeout、断线、响应解析失败等“可能已发送”一律进入 `unknown_needs_reconcile`，自动任务不得重发。
- 幂等键只由显式 `brief_date` 构建，不从字符串脆弱切分恢复日期。
- “连续三日同根因”按目标时区的三个不同且连续自然日计算；同日多次失败只计一天。
- 停发阈值按明确策略记录，禁止同一天快速失败触发跨日长期停发；人工解除需审计。

### B3. 发送适配器

- 定义明确 Transport 协议和结构化结果：`sent(message_id)`、`definite_failure`、`ambiguous`。
- dry-run/preview transport 永远返回 `not_sent`，不能生成可被记为 sent 的 mock message id。
- 真实 transport 只在生产配置完整、闸门通过和显式 enable 时加载；优先调用当前 OpenClaw 的结构化 message CLI/API，并明确指定 `channel=telegram`、`account=life` 和已核实的目标 chat，复用现有安全 account，不让晨报代码读取或管理 Bot token。
- transport 必须解析结构化返回；只有返回可核验的 Telegram message id 才记 `sent`。非零退出、缺少 message id、超时、连接中断或返回无法解析一律按 definite/ambiguous 分类，不能把 stdout 文本或模拟 id 当成功。
- Telegram 发送成功必须保存真实 message id、chat/account、内容哈希和时间；不得保存 token。

### B4. 预览与测试

- 修订旧测试中“timeout 可自动重发”“pending 不阻止重发”等危险断言。
- 增加：编译、schema、golden、HTML 安全、数据源降级、占位阻断、时区/DST、三连续自然日、同日多失败、跨进程并发、进程崩溃、状态损坏、磁盘写失败、unknown 人工核对、dry-run 不记 sent、真实适配器契约和 Cron 渲染测试。
- 完成离线端到端预览：真实代码路径、禁止外发、输出一条完整角色化晨报、附数据源/降级说明，不含内部字段。

## 6. 阶段 C：确定性工作流与风险门

### C1. 分层实现

- Standing Orders / `AGENTS.md`：保留角色、低中高风险原则、自然语言要求和授权边界。
- Workflow Skill：完整写入研究、计划、三次独立完整审核、实施、验收、文档同步和最终通知操作手册；Skill 自身不拥有绕过权限。
- Workflow Governance Plugin/Hook：执行 intake、风险判定结果校验、计划三审门、状态转换、能力预检、输出清洗、去重、审计和最终通知门。
- Task Flow / Tasks：作为运行、步骤、暂停、恢复、终态和完成证据的唯一事实来源。
- Workboard：只接收官方状态投影和人工控制，不再主动每分钟制造运行任务。

### C2. 统一状态机

固定状态：

`accepted → researched → planned → review_1_passed → review_2_passed → review_3_passed → implementing → validating → documented → synced → notified → done`

另有 `blocked`、`failed`、`cancelled`，必须带原因、恢复条件和证据。规则：

- 计划 hash 改变，三个 review 状态全部清零。
- 没有三次审核绑定同一 hash，不允许进入 implementing。
- 父任务只有所有必需子步骤通过、产物存在、验收证据通过后才可 done。
- Workboard `done/running/blocked` 只由状态投影产生；不允许模型自由写父项完成。
- claim 使用原子租约、拥有者、开始时间、最后心跳和到期时间；无 worker/session 证据不得标 started。

### C3. 风险与工具边界

- 输入风险结果为结构化 `low | medium | high`，并记录理由，但不把结构体直接发给用户。
- low：自动执行并记审计。
- medium：内部第二遍完整检查、备份/回滚就绪后自动执行；不向少主索权。
- high：在任何副作用前，由当前角色发一次完整中文决定请求；批准证据绑定动作、范围、时效和会话。
- 为魚玄機提供固定、参数化、审计的常用运维工具/脚本，替代 `python -c`、`sed/awk`、`find -exec`、`xargs` 等内联命令形态。
- 保留主机最后安全闸；若 native approval 仍产生技术卡，动作不得直接进入执行工具，先回到角色高风险决定流程。
- 执行前做 worker 能力预检；工具不具备时进入明确 blocked，不重复派发。

## 7. 阶段 D：事件驱动通知与角色化输出

### D1. 去重与 outbox

- 每个用户可见事件使用稳定键 `workflow/run/phase/channel/audience/revision`。
- 持久 outbox 记录 `pending → sending → sent/unknown`；只有确认 sent 才 ack。
- 同一键最多一条用户可见消息；重放只更新审计，不重复发。
- `unknown` 不自动重发，进入核对队列。

### D2. 输出边界

- 精确抑制 `ANNOUNCE_SKIP`、`REPLY_SKIP`、`NO_REPLY`、审批内部警告、tool commentary 和 Card/Task/Host/CWD/UUID 工程字段。
- malformed 内部事件只写诊断/审计，不向少主发送“通知解析异常”。
- 不对普通角色文本做大范围替换；只处理结构化内部事件和精确控制词，避免误删正常表达。
- 状态通知来自确定性状态，角色层只负责把事实转成自然中文；不让模型猜任务是否运行。

### D3. 完成投递

- 不要求一个没有 message 工具的 completion agent 走 `message-tool-only`。
- 终态先写持久 outbox，再由拥有原 Telegram 会话/账号的投递器发送并 ack。
- 若 OpenClaw 上游完成 announce 失败，outbox 仍能恢复；同时把上游任务终态和投递终态分开记录，禁止“succeeded 但已通知”的假设。

## 8. 阶段 E：切换生产工作流

1. 在隔离环境和生产 staging 路径部署新 Skill、Plugin/Hook、固定工具脚本和状态映射；先禁用用户可见投递。
2. 跑结构、配置、权限、负面和恢复测试。
3. 用测试任务验证：低风险不索权、中风险内部检查、高风险只问一次；无工业卡；started 必须有 worker 证据；终态只发一次。
4. 验证事件驱动 dispatch/notification 可恢复后，禁用两个每分钟轮询 Cron；保留备份和一键回滚。
5. 清理旧 Workboard 漂移：不删除历史证据，只把当前卡按官方任务/Flow 事实纠正，并记录迁移说明。
6. 保持 `housekeeper-async-dispatch` 禁用；确认无调用后在文档中标为历史组件，不贸然删除。

### E1. Gateway 重新加载门

- 先确认没有活动中的官方 Task/Task Flow 和正在发送的 outbox 项；有活动任务时等待安全终态，不强杀。
- 在重启前完成 `config validate`、插件 manifest/schema 校验、生产暂存目录 hash 校验和回滚包解包验证。
- 仅在当前版本确认必须重新加载 Gateway 时执行一次受控重启；不为每个组件分别重启，也不在未知投递状态中重启。
- 重启后按固定顺序验收：Gateway 进程与版本 → 配置校验 → 插件/Skill 注册 → Agent 身份与工具面 → session/transcript/memory 数量 → Telegram account/binding → 只读状态 → 受控任务 → 用户可见消息。
- 任一不可破坏对象减少、Bot 失联、插件加载异常或配置漂移时立即回滚；回滚后也不自动重发 `unknown` 消息。

## 9. 阶段 F：晨报真实验收与 Cron

### F1. 启用前输入门

先只读搜索 2026-08-03 起相关 Telegram 对话、life 当前角色资料、现有安全配置和晨报恢复记录，复用已经明确给出的信息，不重复询问。随后核实：接收 chat、固定时区或旅行时区策略、默认地点/坐标、需要展示的个人字段与日程来源、密钥管理方式、失败通知偏好。确实找不到的项目才列为缺失条件，不猜测，也不从其他 Agent 私人记忆推断。

### F2. 真实发送

- 先生成当日 preview，检查一条消息、标题、长度、转义、占位和数据源。
- 真实发送属于对外副作用；在现有明确授权范围内执行一次。若涉及未明确的私人数据或新接收方，按高风险门询问一次。
- 验收 Telegram 真实 message id、账号、chat、内容哈希、只出现一次；随后以同一幂等键重跑，必须跳过且不产生第二条消息。
- 模拟超时/unknown，确认不重发并生成内部核对项。

### F3. Cron

- 建立 `0 6 * * *`，时区使用经确认的目标时区，Agent/account 与真实投递路径一致。
- 禁止用每分钟轮询代替 06:00 Cron。
- 做一次受控的立即运行或时间窗口测试，验证 run、receipt、outbox、Telegram 和终态一致；然后确认下一次计划时间。

## 10. 阶段 G：完整验收矩阵

| 目标 | 必须证据 | 失败判定 |
|---|---|---|
| 低风险自动 | Telegram 下达低风险任务，实际执行完成且无审批卡/索权 | 任一 native 卡或重复询问 |
| 中风险内审 | 审计含完整检查与回滚准备，用户侧无索权 | 用户被要求逐命令批准 |
| 高风险一次决定 | 一条角色化完整说明，批准后仅执行绑定范围 | 工业卡、重复询问、批准范围漂移 |
| 工作流不遗忘 | 任意入口都产生同一状态链，三审 hash 门生效 | 仅靠角色记忆、可跳过步骤 |
| 三次审核 | 三份独立完整审核绑定同一 SHA，均检查全计划 | 分角度、复制结论、hash 不同 |
| 状态一致 | Task/Flow、Workboard 投影、outbox、Telegram 可互相追溯 | running/done/blocked 冲突 |
| 无重复/泄露 | 重放、重连、并发后每个事件最多一条；无控制词/工业字段 | 任一重复或泄露 |
| 后台终态 | 成功、失败、timeout、blocked 都有持久终态与一次通知 | 静默丢失或假成功 |
| 晨报幂等 | 首次真实发送一条；同键重跑零新增 | 第二条 Telegram 消息 |
| 晨报 unknown | 不重发，进入人工核对 | 自动再发 |
| 晨报 Cron | 06:00 时区正确，3 小时上限，状态可恢复 | 错时区、重复触发、无终态 |
| 无损 | sessions/transcripts/memory/bindings/secrets 基线不减少不漂移 | 任一非授权变化 |
| 回滚 | staging 和 production 回滚演练可恢复旧脚本/Cron/插件 | 无法恢复或丢状态 |

## 11. 阶段 H：文档、GitHub 与最终通知

- 更新 `CodexTaskExecutionPolicy`，把“不同关注面”纠正为三次独立完整审核和 hash 重置门。
- 更新 Workflows、FinalDesign、QuickBrief、ImplementationRoadmap、Agent 部署状态、CurrentProgress、README 和相关部署/事故文档；历史版本不改写，只新增当前版本或纠正当前权威入口。
- 明确旧部署报告中的未完成字段和现场漂移，不能保留“将补写”却宣称已完成。
- 运行 `git diff --check`、测试、配置校验、secret scan、文档链接/版本索引检查。
- 有意提交并推送分支到 GitHub；核对远端 commit 与本地一致。
- 所有可完成项通过后，由賈南風发一条最终 Telegram：说明晨报状态、系统性问题修复、验收结果、不能修复/条件不足项和下一步。不得包含 Card/Task/Host/CWD/UUID、路径、token 或内部控制词。

## 12. 回滚顺序

1. 停止新投递入口，但保留 outbox 和审计。
2. 恢复旧 Cron 启用状态与旧通知脚本。
3. 恢复插件/Hook 旧版本和配置明确键。
4. 恢复晨报旧代码但保持真实发送 disabled，防止未知状态重发。
5. 校验 Gateway、Agent/account/binding、session/transcript/memory 数量和 Telegram 连通性。
6. 若任何消息处于 unknown，先人工核对，不因回滚自动重发。

## 12.1 P01—P25 追踪矩阵

| 问题 | 实施闭环 | 验收证据 | 阻塞/回滚条件 |
|---|---|---|---|
| P01 低中风险索权 | C3 受控工具与风险门 | 低/中风险 Telegram 实测零索权 | 出现原生卡即停止该路径 |
| P02 工业卡 | C3、D2 用户输出边界 | 用户侧无 Card/Task/Host/CWD/UUID | 任一泄露即回滚投递层 |
| P03 inline 审批 | C3 固定参数化工具 | 既有触发命令改走工具后零弹窗 | 未覆盖动作 blocked，不关安全闸 |
| P04 内部分析泄露 | D2 阶段隔离 | 重放样本无 commentary | 误删正常正文即回滚过滤规则 |
| P05 重复回复 | D1 event key/outbox | 并发、重连、重放各一条 | 重复即停新投递器 |
| P06 控制词泄露 | D2 精确抑制 | 控制词回归样本零外显 | 误伤角色词即缩小规则 |
| P07 解析异常骚扰 | D2 malformed 隔离 | malformed 只进审计 | 向用户发占位错误即失败 |
| P08 每分钟轮询 | E4 事件链替代后停 Cron | Cron 列表无两条轮询且终态仍到达 | 新链未通过不得停旧链 |
| P09 状态分裂 | C2、E5 单一事实与投影 | Task/Flow/Workboard 状态一致 | 无法映射则 blocked，不猜 done |
| P10 父项假完成 | C2 前置门 | 缺任一子项/证据时父项拒绝 done | 越级成功即回滚治理插件 |
| P11 幻影 claim | C2 claim/lease/heartbeat | started 有 worker/session/lease | 无心跳到期转 blocked/failed |
| P12 completion 投递失败 | D3 owner outbox | 四种终态各一次通知并 ack | 上游失败走 outbox 降级 |
| P13 Grok 假派发 | C2 能力和 worker 证据 | worker/session/产物三者齐 | 任一缺失不得称测试通过 |
| P14 工具面不一致 | C3 能力预检 | 缺工具任务立即明确 blocked | 禁止重复派发 |
| P15 投递当 started | C2 状态拆分 | accepted 与 started 证据不同 | 无 worker 证据不进 started |
| P16 假绿色测试 | B4、G 反例矩阵 | 危险旧断言已改，故障测试通过 | 只跑正例不得上线 |
| P17 进度不持久 | C2、D3 状态驱动通知 | 重启/恢复后仍能报真实状态 | 模型猜测状态即失败 |
| P18 只靠记忆 | C1 Skill+Plugin+Task Flow | 从多个入口均强制同一门 | 可跳过三审即回滚 |
| P19 三审分角度 | 第 3 节 hash 重置 | 三份完整审核同一 SHA | 任一计划改动三审归零 |
| P20 文档漂移 | H 文档重建 | CurrentProgress/README/部署状态与生产一致 | 无证据字段写待核验 |
| P21 晨报语法损坏 | B1 编译门 | 全源码 AST/compile 通过 | 任一语法错不进入预览 |
| P22 mock/unknown 重发 | B2、B3 | dry-run 不 sent，unknown 不重发 | ambiguous 时人工核对 |
| P23 状态原子/时区 | B1、B2 | 并发、断电、DST、连续日测试 | 状态损坏 fail-closed |
| P24 必要输入不足 | F1 输入门 | 现有资料先查，缺项单列 | 不用占位启用真实 Cron |
| P25 上游完成缺口 | D3 durable outbox | 上游 announce 失败仍可恢复通知 | 完全根治等待含修复版本 |

版本兼容与 Gateway 重新加载是所有 P01—P25 的共同发布门：当前 SDK/Hook 探针或重启后无损验收不通过时，停止生产切换，保留离线成果并进入明确 blocked。

## 13. 预期不能本地完全根治或可能缺条件的项目

- OpenClaw `2026.7.1-2` 的上游子任务完成恢复缺口：本地以 durable outbox/ack 缓解，完全根治需升级到包含官方修复的版本并重新验收。
- 晨报真实个人参数、地点、日程和密钥：若仓库/现有 Telegram 对话中不存在，不能猜测；只完成离线预览并单列等待输入。
- Telegram 网络返回 ambiguous 时无法仅凭客户端确定是否已送达：必须 fail-closed 并人工核对，不能承诺自动判断。
