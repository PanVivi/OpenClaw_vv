# OpenClaw 全任务系统修复与生产验收报告｜v0.01

核验时间：2026-08-10 08:23 +08:00
生产版本：OpenClaw `2026.7.1-2`
冻结计划：`TaskSystemRepair正式修复计划-v0.01.md`
计划 SHA-256：`e11d58a41ceae6d5d459f3f156fef5ef241f3e99034536139496a993b9aa2921`

## 1. 结论

任务系统的已确认阻塞已在生产修正：三角色消息进入统一任务/模块目录；正式任务使用持久 intake、唯一父 Flow、真实 Workboard/Task 与收据；晨间玉简八模块归蕭觀音同一权威数据源，賈南風通过持久 handoff 转交；低风险自动，中风险内部预检，高风险在副作用前只用角色语言询问一次；两个每分钟空转的旧 Workboard 泵已停用。

晨报正式样式保持 2026-08-04 11:54 华丽定稿，没有使用 11:55 扁平列表。身份没有改名，生产 binding 仍为 `ops/default`、`housekeeper/housekeeper`、`life/life`。

## 2. 实施内容

- `task-system-control 1.0.0`：认证 owner 入站、确定性分流、正式任务持久登记、真实 Task/Workboard/Flow 关联、跨角色 handoff、晨报八模块目录、重复正文与工业字段终稿闸门、启动恢复。
- `workflow-governance 1.1.0`：计划哈希、三次独立完整审查、顺序阶段、真实完成证据、通知门，以及 ops `exec/process` 的低/中/高风险状态机。
- `housekeeper-workboard-control 1.1.0`：调用官方 Workboard 创建和读取接口，不再通过 shell 运行 CLI，也不再依赖一分钟调度泵。
- 三份角色 `AGENTS.md/TOOLS.md`：只负责入口判断和角色表达；持久状态、权限与完成门由插件负责。
- 部署与验收脚本：staging、备份、schema 校验、依赖恢复、迁移、切换、影子回滚校验和 30 分钟观察均为可重复命令。

## 3. 部署过程与安全恢复

生产备份：`/Volume3/OpenClaw/home/.openclaw/backups/task-system-repair-20260810-006`。

候选 001/002 在校验失败后自动回滚；003 因旧 Cron 活动而中止且未写生产；004/005 因候选配置状态目录解析不正确而在写入前失败并回滚。根因修正为校验候选配置时显式绑定生产 `OPENCLAW_STATE_DIR`。006 完成原子部署。插件依赖从备份中的已安装 `typebox 1.3.8` 恢复；随后只进行一次受控 Gateway 重启。conversation hook 的官方安全闸门通过仅对 `task-system-control` 和 `workflow-governance` 设置 `hooks.allowConversationAccess=true` 打开，配置热加载成功，没有第二次重启。

历史数据没有删除。迁移只关闭一张没有真实活动 Task 的 ready/running 自锁卡，保留其旧 run 证据；12 张 blocked 卡、既有 Task、Flow 和 Workboard 历史均未改写。

## 4. 计划与三次独立完整审查

三份审查都从同一冻结计划全文独立开始，覆盖完整需求、架构、权限、回滚、验收和资料一致性；不是把一次审查拆成三个角度。三份审查均核对相同计划 SHA-256 并给出通过结论：

1. `TaskSystemRepair正式修复计划-独立完整审查1-v0.01.md`
2. `TaskSystemRepair正式修复计划-独立完整审查2-v0.01.md`
3. `TaskSystemRepair正式修复计划-独立完整审查3-v0.01.md`

生产工作流夹具还验证：三审不足时执行被拒绝；重复 nonce/证据被拒绝；阶段越级被拒绝；文档和同步完成前不能进入通知。

## 5. 生产验收矩阵

| 目标 | 生产证据 | 结果 |
|---|---|---|
| 身份不变 | 三项 binding 逐项为真 | 通过 |
| 三角色入口 | 賈南風、魚玄機、蕭觀音真实会话分别读取同一八模块 catalog | 通过 |
| 八模块可录入 | header/weather/aqi/attire/tasks/disciples/schedule/folk_calendar 在 2099-12-31 完成创建、更新、回读、取消与清理 | 通过 |
| 日程提醒 | 事件与 reminder epoch 相差恰好 60 分钟 | 通过 |
| 賈南風转交 | housekeeper → life，目标 accept 且 `morning_brief_control` 成功后才从 applying 变为 applied | 通过 |
| 正式任务转交 | `task_handoff` 使用固定目标会话，应用收据后才完成；测试记录已清理 | 通过 |
| 晨报样式 | 2026-08-11 离线预览包含定稿抬头、纹饰、七框和结尾祝辞；旧扁平标题不存在 | 通过 |
| 晨报真实链 | 真实数据 dry-run：`success=true`、`degradedModules=[]`、`failedModules=[]`、`status=not_sent` | 通过 |
| 晨报实发 | 2026-08-10 06:00 经 life Telegram 发送，`messageId=279` | 通过 |
| 低风险 | ops 真实会话自动执行只读 `pwd`，无许可询问、无副作用 | 通过 |
| 高风险 | `openclaw gateway restart` 在副作用前 blocked；自然说明目标/影响/最坏情况/回退/替代并只问一次 | 通过 |
| 重复抑制 | 同一高风险指纹第二次触发只指向原决定，不再询问、不执行 | 通过 |
| 用户语言 | 高风险回复无 Card/Task/Host/CWD/UUID/session/run/claim/heartbeat 字段 | 通过 |
| 插件健康 | config valid、warnings 为空、`plugins doctor` 为 `No plugin issues detected` | 通过 |
| 30 分钟稳定性 | 30.3 分钟内旧 job `lastRunAt` 不变、旧来源 Task 增量 0、active 0、ready dispatch 变化 0、三插件仍 loaded | 通过 |
| 正常自动化隔离 | CodexResetWatcher 10 分钟任务正常运行 3 次，单列且未被暂停 | 通过 |
| 回滚材料 | 备份在生产侧影子恢复，配置与六份角色文件哈希一致，旧配置校验通过，活动状态未变 | 通过 |

## 6. 对话审计问题处置表

| 编号 | 原问题 | 本轮处置 | 状态 |
|---|---|---|---|
| C01 | 正式任务无确定性入站登记 | owner Telegram hook 建立 inbox；跨轮正式任务必须 start 并关联真实账本 | 已修 |
| C02 | 角色记忆被当作工作流保证 | Role/Skill 仅指导；Plugin hook、状态机和 official Task Flow 强制执行 | 已修 |
| C03 | 跨角色只传文字 | 持久 handoff、固定目标会话、accept 与专用工具收据 | 已修 |
| C04 | 賈南風看不见其他角色 Flow | controller 固定绑定统一控制会话，角色入口共享受管 Flow | 已修 |
| C05 | 蕭觀音不知道晨报 | 专用状态、控制工具、角色入口和唯一 06:00 生成链已接通 | 已修 |
| C06 | 晨报模块无统一目录 | 八模块 catalog 与同一投影、去重、revision、锁和回读 | 已修 |
| C07 | 同一正文重复 | 终稿 hook 检测重复段落并只允许一次修订 | 已修 |
| C08 | 用户可见工业语言 | 终稿闸门和角色说明共同禁止内部字段；生产高风险文本验收通过 | 已修 |
| C09 | 评论完成但状态仍运行 | 只有真实 Task/Workboard proof 与成功终态可推进父 Flow | 已修 |
| C10 | 完成通知丢失/误报/重复 | 通知需 pending → sent 与真实 message ID；unknown 不盲重发 | 已修，真实最终通知在 GitHub 同步后执行 |
| C11 | 风险分级未成执行闸门 | ops `exec/process` 低/中/高三层状态机、指纹和一次决定已落地 | 已修当前运维执行面；其他专用工具仍以各自 schema/allowlist 控制 |
| C12 | 报告过度宣称 | 本报告分开列出真实通过项与无法自动完成项 | 已修 |

## 7. 切换结果

已停用但未删除：

- `6c7eb802-d869-4ebc-b40b-b8b4f0c0e639`（WorkboardDispatchPump）
- `73146ddf-8366-4b9c-b40b-b8b4f0c0e639`（WorkboardNotificationRelay）

30.3 分钟起止 lastRunAt 分别固定为 `1786319290463` 与 `1786319324052`；旧来源新增 Task 为 0。旧定义、原 enabled 状态与备份清单仍可用于回滚。

## 8. 哈希与运行证据

| 对象 | SHA-256 |
|---|---|
| 生产 `openclaw.json` | `bdb7d079b0aaf06129a44596ddf64e0a80d070126d46c3f855dff97f16b1b8dc` |
| task-system-control dist | `3a5416f61d64f87c1d55b598dc7adf85e466ae37907e23aa9f7bda6d2182e84b` |
| workflow-governance dist | `56f05c2b750b8a11f560c7ac3d47f99c5abb8ab9ec74090a53ef82dd82fc0495` |
| housekeeper-workboard-control dist | `7f687d9698f32e9ef375e0d74b6af46c81ea71e1777470801fd60d85fc43997b` |
| housekeeper AGENTS | `58c2ea557be158d0cfce00cd7b7c5427d25c60ef932f1202c836a413f9b37e50` |
| ops AGENTS | `bf39ef88d7b9a7a231a9a244caa76a8e25f4759cf9dafa07920c67d952eb7358` |
| life AGENTS | `99af5fa1eacd131a239a950b50c7f71ecca01055214668331c475d8c1b43c99c` |
| 生产备份 manifest | `0d7854dbf8307d57137ce0480a786aa9b24cbd6ba86df8353a0c0c13b9e60834` |

## 9. 不能自动完成或条件不足

1. **真实 owner 入站 Telegram 更新不可由管理员伪造。** CLI agent RPC 没有真实 Telegram `senderId`，Bot API 也不能冒充用户。已验证 owner 过滤、三个真实角色会话、历史认证路由和真实出站回执；下一条由少主本人发给三个 Bot 的任务/模块消息才是最终自然入站观察。不能为验收而绕过 sender 校验。
2. **未执行第二次线上 Gateway 回滚重启。** 本轮已使用一次批准的安全重启；为了演练再主动中断 Telegram 会扩大风险。生产备份已在 NAS 隔离影子目录完整恢复、验哈希并校验配置，线上状态零改变。若需要完整在线回滚演练，应另开维护窗口并取得一次明确高风险同意。
3. **上游仍没有通用 Task/Flow mutation Hook。** 本轮用已存在的生命周期 hook、plugin controller、official Task Flow 与启动 reconcile 闭环，不把不存在的上游能力写成已有。升级 OpenClaw 后仍应评估原生事件接口是否可替代部分兼容层。

## 10. 回滚

如新链路出现核心失败：使用备份 006 的 manifest 恢复配置、三插件旧状态和六份角色文件；按 manifest 恢复两条旧 Cron enabled 状态；只在确认无活动任务后进行一次受控 Gateway 重启；随后复验 config、plugins、三个 binding、晨报 dry-run、Telegram 与旧任务读取。不得删除新旧 Task/Flow/Workboard 历史，也不得自动重发 unknown Telegram 投递。
