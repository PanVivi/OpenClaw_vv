# Workboard Task Control 工作板任务控制升级计划 v0.01

- 计划日期：2026-07-24
- 目标环境：OpenClaw 2026.7.1-2 / Node.js 22.22.3 / 单 Gateway / 八个常驻 Agent / Telegram
- 目标：把正式任务从聊天回报驱动的自定义看门狗迁移到 OpenClaw 官方 Workboard、Tasks 与 Task Flow；保持贾南风为唯一用户侧总调度者，长任务由角色所属子 Agent 执行，低中风险按原授权自动闭环，高风险才集中询问。
- 非目标：不改变角色人格、身份、Agent 数量、Telegram binding、私人 transcript、个人记忆或既有业务自动化；不引入 n8n、LangGraph、CrewAI 或第三方 Mission Control。
- 执行原则：逐阶段准入；每一步完成后核对本计划；任何硬门不通过立即停止下一阶段并按回滚节恢复。

## 1. 资料核对与架构结论

### 1.1 官方资料

1. Workboard 是单 Gateway 本地工作控制面，提供持久卡片、Agent 指派、父子依赖、claim、heartbeat、run attempt、proof、artifact、protocol violation、stale detection、reassign/reclaim 和可重放通知：
   - https://docs.openclaw.ai/plugins/workboard
   - https://docs.openclaw.ai/cli/workboard
2. Tasks 是后台执行事实账本；Task Flow 是跨步骤、跨重启且带 revision 的持久编排状态：
   - https://docs.openclaw.ai/automation/tasks
   - https://docs.openclaw.ai/automation/taskflow
3. 子 Agent 非阻塞执行并返回 runId；announce 是 best-effort，不能单独作为任务完成事实：
   - https://docs.openclaw.ai/tools/subagents
4. Standing Orders 定义长期授权、触发、审批闸门和升级条件：
   - https://docs.openclaw.ai/automation/standing-orders
5. Lobster 用于确定性多步骤、审批和 resume token；不是所有自然语言任务的默认入口：
   - https://docs.openclaw.ai/tools/lobster
6. OpenProse 适合显式编写的多 Agent 并行程序，但底层仍映射到 sessions_spawn；本轮不作为正式任务控制面的依赖：
   - https://docs.openclaw.ai/prose

### 1.2 GitHub 与社群交叉核对

1. OpenClaw Agent Teams RFC 被关闭为不进入核心；维护方向是插件、Task Flow 与 OpenProse，而不是再造核心团队框架：
   - https://github.com/openclaw/openclaw/issues/56482
2. 社群已反复报告仅依赖 spawn/announce 无法可靠区分慢、卡住、失败和静默完成：
   - https://github.com/openclaw/openclaw/issues/8995
3. 社群报告并发会话锁、凭据刷新竞争和脱管后台进程，证明并发必须受控而非无限放大：
   - https://github.com/openclaw/openclaw/issues/43367
4. 社群报告 delivery 状态与 Telegram 实际送达可能不一致，验收必须核对真实 Telegram 出站证据：
   - https://github.com/openclaw/openclaw/issues/43177
5. 主流实践是一 Gateway、一用户侧 orchestrator、多个有真实工具和受限权限的 worker，所有工作留下证据或产物：
   - https://www.reddit.com/r/openclawsetup/comments/1she1fa/how_to_set_up_a_maincontrolled_multiagent/

### 1.3 结论

采用以下分层，且各层只承担一种权威：

| 层 | 权威内容 | 采用组件 |
|---|---|---|
| 用户决策面 | 用户目标、任务解释、分解、风险判断、最终汇报 | 贾南风主会话 |
| 长期任务面 | 原始授权、任务卡、父子依赖、指派、历史、证据、产物 | Workboard |
| 运行事实面 | queued/running/succeeded/failed/timed_out/cancelled/lost、runId、session | Tasks / Task Flow |
| 执行面 | 具体长任务 | 指派角色的 Workboard 子 Agent |
| 授权面 | 低/中/高风险、一次授权、条件续办、升级条件 | Standing Orders / AGENTS.md |
| 确定性流程 | 固定步骤、审批、恢复 | Lobster（按需） |
| 时间触发 | 日程、定时运行 | Cron；不得替代任务状态监控 |

旧 `housekeeper-async-dispatch` 的自有 `tasks.json` 不再作为任务事实源。迁移验收完成后停用插件；旧文件只读留档。

## 2. 当前环境已验证基线

- OpenClaw：`2026.7.1-2 (0790d9f)`。
- 官方 `openclaw tasks`、`openclaw tasks flow` 可用。
- Workboard 2026.7.1 已随 OpenClaw 安装，但当前为 disabled，且不在 `plugins.allow`。
- Workboard 合约列出全部 33 个 `workboard_*` 工具。
- OpenProse 当前 disabled；本轮不启用。
- 当前 `housekeeper-async-dispatch` 1.2.2 enabled。
- 当前插件任务状态文件包含 `TEST-DELEGATE-004` 和 `PURELOVE-STATUS-20260724`。
- `PURELOVE-STATUS-20260724` 的两个 ops 子 Agent 已由官方 Tasks/Task Flow 记录为 `failed / OPENCLAW_DIRECT_ABORT`，但旧看门狗未读取真实状态。
- 八个 Agent 使用显式工具 allow/deny；因此启用 Workboard 后仍须按角色增量加入所需工具。
- Housekeeper 明确 deny `exec/process/write/edit/apply_patch/message`；本轮保持这些边界。
- Telegram、session、transcript、memory、A2A 配置属于不可破坏项。

## 3. 目标工作流

1. 用户向贾南风下达任务。
2. 贾南风按 Standing Orders 生成任务合同：目标、范围、完成标准、来源、风险、授权、续办条件、重试预算、最长运行时间和首次回报要求。
3. 贾南风使用 `workboard_create` 建立父卡；需要分工时使用 `workboard_decompose` 建立子卡并指定 Agent。
4. 贾南风调用专用窄工具触发官方 Workboard Gateway dispatch；不得获得通用 exec。
5. Workboard 创建 `agent:<agentId>:subagent:workboard-<boardId>-<cardId>` 后台 worker，并绑定 taskId、runId 和 sessionKey。
6. worker 认领卡片，长任务定期 heartbeat；完成时提交 summary、proof 和 artifacts，失败时提交结构化 blocker。
7. Workboard 从官方任务账本同步真实执行状态；只有 failed/killed/timed_out/aborted 才进入 blocked。无 heartbeat 进入 stale/诊断，不直接伪装成执行失败。
8. 贾南风使用 Workboard 可重放通知订阅接收 completed/failed/stale 等事件，推进验收、恢复或对用户汇报。
9. 用户说“没问题就继续”时，条件授权写入父卡；核查子卡通过后自动提升后续执行卡，不重新索取同一授权。

## 4. 权限设计

### 4.1 Housekeeper

新增：

- `workboard_list`
- `workboard_read`
- `workboard_create`
- `workboard_link`
- `workboard_specify`
- `workboard_decompose`
- `workboard_runs`
- `workboard_stats`
- `workboard_notify_subscribe`
- `workboard_notify_list`
- `workboard_notify_events`
- `workboard_notify_advance`
- `workboard_promote`
- `workboard_reassign`
- `workboard_reclaim`
- `workboard_unblock`
- `workboard_comment`
- `workboard_proof`
- `housekeeper_workboard_start`（本项目窄工具，仅触发官方 Workboard dispatch）

保持 deny：

- `exec`
- `process`
- `write`
- `edit`
- `apply_patch`
- `gateway`
- `message`
- `sessions_history`

迁移完成后移除：

- `housekeeper_task_watch`

### 4.2 执行角色

ops、coder、reviewer、life、companion-dugu、companion-wu、companion-lv 增加：

- `workboard_list`
- `workboard_read`
- `workboard_claim`
- `workboard_heartbeat`
- `workboard_complete`
- `workboard_block`
- `workboard_release`
- `workboard_comment`
- `workboard_proof`
- `workboard_worker_log`
- `workboard_protocol_violation`
- 按需 `workboard_attachment_add/read`

不得借此改变各 Agent 原有 shell、网络、消息、Sandbox 或文件权限。

## 5. 专用调度适配器

建立新插件 `housekeeper-workboard-control`，只承担缺失的启动桥接，不建立第二套任务数据库：

1. 只向 `agentId=housekeeper` 注册 `housekeeper_workboard_start`。
2. 输入只接受可选 boardId；不接受任意命令、路径、环境变量或 shell 字符串。
3. 内部仅调用当前生产版支持的官方 `openclaw workboard dispatch --board <id> --json` 或等价的官方 Gateway RPC。
4. 并发由官方 Workboard 配置控制；遵守每 owner/agent 一个活动卡片的受控并发，不在适配器中伪造生产版不存在的 `--max-starts` 参数。
5. 返回官方 dispatch JSON，不自行推断启动成功。
6. 不保存 task 状态，不扫描 transcript，不发送 Telegram，不改写 sessions_send。
7. 所有失败原样返回，禁止降级为本地假启动。

若版本匹配的官方 SDK/RPC 能直接从插件调用 Workboard dispatch，则优先直接调用；固定 CLI 仅作为官方支持面的兼容实现。实施时必须用生产版本实际编译和运行验证决定，不凭猜测。

## 6. Standing Orders 增量

对共同协议及八个 Agent AGENTS.md 只做增量添加，不重写人格与既有职责：

- 正式任务以 Workboard cardId 为唯一业务标识。
- 低风险自动执行；中风险在一次任务授权、备份、回滚和验证范围内自动闭环；高风险才暂停并由 housekeeper 集中询问一次。
- 子卡继承父卡授权但不得扩大范围。
- “查询后无问题继续”是同一父任务的条件授权，不得在只读核查阶段丢失。
- worker 必须 claim；长任务 heartbeat；终态必须 complete 或 block。
- 完成必须提交可核对 proof/artifact；自称完成不等于验收。
- worker 不直接向用户解释全局状态；由 housekeeper 汇总。
- A2A 可用于咨询，不作为正式任务状态事实源。
- 主 Telegram Agent 不等待后台执行；创建/派发后立即回执并结束当前轮次。

## 7. 部署阶段、准入和回滚

### 阶段 A：计划与基线

动作：

1. 固定 Git commit、生产版本和资料来源。
2. 导出配置、插件列表、Agent/binding/channel 状态、Tasks/Task Flow、旧看门狗状态、session/transcript/memory 数量。
3. 生成 SHA-256 manifest。

硬门：

- 基线导出完整。
- Telegram 三个既有账号 running/probe ok。
- Gateway active。
- Git worktree 无未知修改。

回滚：无生产变更。

### 阶段 B：Workboard 基础启用

动作：

1. 只增量把 `workboard` 加入 `plugins.allow` 与 `plugins.entries.workboard.enabled=true`。
2. 验证配置。
3. 按 Gateway 要求执行一次受控重启。
4. 检查 plugin runtime、CLI、SQLite 存储、Workboard UI/RPC 和 Telegram。

硬门：

- Workboard loaded/activated，无 runtime error。
- `openclaw workboard list --json` 成功。
- Gateway、八 Agent、Telegram、既有 cron、memory 均无回退。

回滚：

- 恢复配置备份并重启；不得删除 Workboard 数据库。

### 阶段 C：工具权限与适配器

动作：

1. 编译、测试 `housekeeper-workboard-control`。
2. 安装插件并加入 allow。
3. 增量加入 4.1、4.2 工具权限。
4. 保持旧看门狗暂时启用，但不用于新测试卡；形成并行观察期。

硬门：

- Housekeeper 能 create/read/decompose/start。
- Housekeeper 仍无法 exec/write/message/gateway。
- 每个执行角色能 claim/heartbeat/complete/block，但不能越过原工具权限。
- 一个测试卡能启动并绑定官方 task/run/session。

回滚：

- 禁用新适配器，恢复配置；Workboard 保留只读。

### 阶段 D：Standing Orders 与角色文档

动作：

1. 归档每个 Agent 当前文件。
2. 在稳定基线上增量加入第 6 节。
3. 暂存、逐文件 diff、原子替换 NAS workspace。
4. 不覆盖 transcript、session、memory、binding 或 secret。

硬门：

- 八套五件套数量不减。
- 旧人格、身份、职责、风险条款全部保留。
- 新条款在共同协议和各 AGENTS.md 可直接加载，不依赖未自动加载的相对路径。

回滚：

- 恢复八个 workspace 文件备份，不触碰运行态数据。

### 阶段 E：真实迁移与切换

动作：

1. 创建生产任务板。
2. 把仍有意义的旧看门狗任务导入为历史卡，标注原状态和证据；不重新执行。
3. 建立 housekeeper 的 replay-safe 通知订阅并保存 cursor。
4. 新任务只进入 Workboard。
5. 观察期通过后禁用 `housekeeper-async-dispatch`，从 housekeeper allow 移除 `housekeeper_task_watch`。
6. 旧 `tasks.json` 和插件目录保留只读备份。

硬门：

- 新任务不再写旧 tasks.json。
- Workboard 卡、Task/Flow 和通知事件一致。
- 禁用旧插件后 Telegram 与 A2A 无回退。

回滚：

- 重新启用旧插件只用于恢复 fire-and-forget，不允许其覆盖 Workboard 状态；新卡保持不删除。

### 阶段 F：端到端验收

必须全部通过：

1. **基础创建**：housekeeper 创建低风险测试卡，指派 ops，后台 worker 启动，取得 cardId/taskId/runId/sessionKey。
2. **前台响应**：worker 运行期间连续向 housekeeper Telegram 发第二条消息，主会话正常回复，不等待 worker。
3. **成功链路**：worker heartbeat、提交 proof、complete；卡片进入 review/done，housekeeper 主动汇报。
4. **失败链路**：专用测试 worker 明确 block 或受控失败；卡片进入 blocked，错误与官方 task 一致，housekeeper 主动汇报。
5. **迟报链路**：暂停 heartbeat 但保持任务运行；只产生 stale/diagnostic，不误判 failed。
6. **条件续办**：父卡写入“核查无问题继续”，第一子卡通过后第二子卡自动 ready/dispatch，不重复索权。
7. **并发链路**：至少 ops 与 life 两个独立卡并行；housekeeper Telegram 保持响应；不得用同 session key 强行并发写。
8. **重启恢复**：建立 waiting/running 测试卡，受控重启 Gateway，恢复后卡、claim、Task/Flow、通知 cursor 可核对；不得重复执行副作用。
9. **通知可靠性**：completed/failed/stale 事件从 Workboard 订阅读取并 advance；重复读取不重复上报，漏读后可继续。
10. **Telegram 真实送达**：用户实际 Telegram 收到主动消息；Gateway Telegram 出站日志有对应成功记录。
11. **权限负向**：housekeeper 无法调用 exec/write/message；worker 无法使用原本 deny 的工具。
12. **数据无损**：session/transcript/memory 数量不低于基线；既有三 Bot、bindings、A2A、CodexResetWatcher 和其他自动化不变。
13. **审计**：`openclaw tasks audit`、配置 validate、plugin inspect、channel probe 无新增错误。

任一项失败不得宣称部署成功。

## 8. 计划核对记录格式

每完成一个阶段记录：

```text
阶段：
计划动作：
实际动作：
计划外动作：无 / 说明
准入检查：
证据：
结果：PASS / FAIL / ROLLED BACK
下一阶段许可：YES / NO
```

## 9. 最终文档与同步

验收通过后：

1. 新建正式部署报告，记录版本、配置差异、插件版本、卡片/Task/Flow/Telegram 证据和回滚点。
2. 新建事故经验，说明旧看门狗为何会误判、丢失续办授权及未读取官方 task 状态。
3. 更新 FinalDesign、ImplementationRoadmap、DeploymentPlan、QuickBrief、SourceIndex、CurrentProgress 和相关 DeploymentStatus。
4. 角色卡按文档规则建立新版本并保留旧文档；不得原地删减稳定基线。
5. 运行 secret/transcript 扫描，确认 Git 无凭据与私人记录。
6. 提交到当前 `agent/lossless-content-update` 分支并 push。
7. 最终汇报只写真实验证结果；未完成项明确标为 blocked/not verified。

## 10. 实际执行核对记录

### 阶段 A：只读基线与备份

- 计划动作：核对版本、配置、插件、角色文件、任务状态和 Telegram；建立完整备份与 SHA256 清单。
- 实际动作：确认 OpenClaw 2026.7.1-2 / Node.js 22.22.3；备份至 `/Volume3/OpenClaw/home/.openclaw/backups/workboard-task-control-20260724T191932`，1437 文件哈希通过。
- 计划外动作：无。
- 准入检查：transcript/session/memory 基线分别为 381/766/201；旧看门狗状态可读。
- 证据：备份目录及清单。
- 结果：PASS。
- 下一阶段许可：YES。

### 阶段 B：官方 Workboard 基础

- 计划动作：启用官方 Workboard，建立生产板和只读验证。
- 实际动作：建立 `production` 工作板，官方 CLI 与插件工具均能读取。
- 计划外动作：无。
- 准入检查：配置有效，插件诊断无错误。
- 证据：工作板 ID `production`。
- 结果：PASS。
- 下一阶段许可：YES。

### 阶段 C：受限适配器与权限

- 计划动作：housekeeper 只获控制面和固定派发；worker 只获任务状态工具。
- 实际动作：部署 `housekeeper-workboard-control 1.0.3`；housekeeper 继续拒绝 exec/write/message/gateway，八角色 worker 按职责获 claim/heartbeat/proof/complete/block 等工具。
- 计划外动作：无。
- 准入检查：适配器不接受任意命令、路径、环境、文件、配置或消息参数。
- 证据：插件 doctor 无问题；负向权限实测通过。
- 结果：PASS。
- 下一阶段许可：YES。

### 阶段 D：Standing Orders 与角色文档

- 计划动作：从既有版本增量更新共同协议和八套角色卡，保留人格、职责、风险与工具边界。
- 实际动作：共同协议升级 v0.06；housekeeper v1.12、ops v0.15、coder v0.09、reviewer v0.07、life v0.09、三 companion v0.06；40 个运行文件经远端门禁部署。
- 计划外动作：最终核对发现 housekeeper v1.12 仍残留旧看门狗执行段，已在同一候选版内纠正并重新部署 AGENTS.md/TOOLS.md，远端 SHA256 与仓库一致。
- 准入检查：八套五件套数量不减；旧版本全部归档；角色属性未改变。
- 证据：远端 housekeeper AGENTS SHA256 `ff2d25ff...add2f27`，TOOLS SHA256 `33383cf0...526ac`。
- 结果：PASS。
- 下一阶段许可：YES。

### 阶段 E：迁移与生产切换

- 计划动作：迁移有意义的旧记录、建立可重放通知、切换新任务、停用旧插件。
- 实际动作：两条旧任务只读迁移；建立派发泵与通知泵；禁用 `housekeeper-async-dispatch`，移除 `housekeeper_task_watch` allow，保留旧目录和数据。
- 计划外动作：保留一次早期测试订阅；其过滤条件只匹配已结束测试 run，不参与生产通知。
- 准入检查：新任务只写 Workboard；旧 `tasks.json` 未被删除或覆盖。
- 证据：派发 job `6c7eb802-d869-4ebc-b40b-b8b4f0c0e639`；通知 job `deac91f2-13b3-4319-9409-fa18c08b328b`；生产订阅 `9fb9d472-1880-4170-ba9e-1aa333d24696`。
- 结果：PASS。
- 下一阶段许可：YES。

### 阶段 F：端到端验收

- 计划动作：逐项完成第 7 节 13 项真实验收。
- 实际动作：全部执行；结果见下表。
- 计划外动作：迟报测试揭示官方当前版本在超过 `maxRuntimeSeconds` 后把 execution/card 置 blocked 并发 failed 通知，不是只产生 stale。按官方真实语义验收并写入报告。
- 准入检查：所有关键链路均有 cardId、Task/run/session、proof、Telegram 或审计证据。
- 结果：PASS。
- 下一阶段许可：YES。

## 11. 最终验收对照

| 计划项目 | 实际证据 | 结果 |
| --- | --- | --- |
| 1. 基础创建 | `3ec44f63-319d-448d-8507-cbc3c82fffb5` → Task `adf9d06f-ab13-4ab5-8407-e928c6b301c2` → run/session | PASS |
| 2. 前台响应 | worker 并发运行时 housekeeper Telegram 实际送达 | PASS |
| 3. 成功链路 | heartbeat、`WORKBOARD_OPS_OK` proof、done | PASS |
| 4. 失败链路 | `74d85d4a-382f-47e9-886c-00a39d1c140b` / `CONTROLLED_BLOCK_OK` | PASS |
| 5. 迟报链路 | `e9569ddb-635e-461d-bc01-13c748fd06b7` 超时后按官方语义 blocked + failed 通知，原因精确保留 | PASS（语义按官方实测修正） |
| 6. 条件续办 | 父 `f41f8ab5-...` 完成后子 `fd979e51-...` 自动 ready/dispatch/done，无重复授权 | PASS |
| 7. 并发链路 | ops `1606d140-...` 与 life `b7a43b5e-...` 同时运行且前台可回复 | PASS |
| 8. 重启恢复 | `d543ee85-...` 重启前后保留、只执行一次、`RESTART_PERSIST_OK` | PASS |
| 9. 通知可靠性 | 生产订阅事件可重放并 advance；无事件返回 `NO_REPLY` | PASS |
| 10. Telegram 送达 | `e621cdc8-...` 标题/cardId/status/摘要 delivered；主会话 status=sent | PASS |
| 11. 权限负向 | housekeeper `EXEC_UNAVAILABLE`，reviewer `WRITE_UNAVAILABLE`，测试文件不存在 | PASS |
| 12. 数据无损 | 最终计数 455+/869+/233，不低于 381/766/201；八 Bot probe 正常 | PASS |
| 13. 审计 | tasks audit 0；config valid；plugin doctor 无问题 | PASS |

## 12. 计划完成判定

- 部署顺序与本计划一致；没有引入第三方任务控制平台，没有改变角色属性，也没有处理本轮范围外的历史安全配置。
- 官方 Workboard、Tasks/Task Flow、Standing Orders 和 Cron 的分工已落地；Lobster 保留为以后确有确定性多步流程时使用，本轮未盲目引入。
- 本计划的生产变更、验收证据、已知差异、回滚点和文档同步均已完成，可以进入 Git 提交与分支同步。
