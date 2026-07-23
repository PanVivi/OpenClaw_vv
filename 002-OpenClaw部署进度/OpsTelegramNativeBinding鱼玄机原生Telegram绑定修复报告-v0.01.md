# 002 OpenClaw架设部署｜魚玄機原生 Telegram 绑定修复报告｜v0.01

- 日期：2026-07-23
- 现场环境：OpenClaw `2026.7.1-2`（`0790d9f`）/ Gateway Node `v22.22.3`
- 范围：停用 `ops-telegram-admin`，保留魚玄機原生执行权限、现有 Telegram 账号、binding、session、transcript 与 memory
- 运行状态：`completed`
- 角色卡状态：魚玄機 v0.11 已形成，NAS 五个 workspace 文件仍为 v0.10，待单独无损部署

## 结论

原插件把一次 Telegram 绑定拆成账号写入、策略写入、binding 写入、重复在线 probe 和失败回滚，多次触发 Telegram provider 热重载。短时 probe 未就绪会被插件误判为整个事务失败，恢复整份配置又触发额外热重载。

NAS 日志确认：

- `17:25` 首次写入 coder account；
- `17:26` 插件因运行态 probe 未及时通过判定失败并回滚；
- `17:29` coder provider 已启动；
- 随后的策略写入再次触发重载；
- `17:30` coder 与 default/魚玄機同时出现 `channel stop exceeded 5000ms`；
- 后续尝试 companion 账号时重复出现 probe 失败、回滚与 channel stop 超时。

该问题与 OpenClaw 已记录的 `stopChannel` 超时/僵尸 polling 现象一致。插件是重复热重载的直接触发器和放大器；底层停止超时属于 OpenClaw channel runtime 问题。

## 官方依据

- `openclaw channels add` 是官方账号新增入口；非交互模式不自动建立 binding：
  <https://docs.openclaw.ai/cli/channels>
- `openclaw agents bind --agent <id> --bind telegram:<account>` 是官方 account-scoped 路由入口：
  <https://docs.openclaw.ai/cli/agents>
- channel stop 超时可能留下无法由健康监控恢复的旧任务：
  <https://github.com/openclaw/openclaw/issues/71412>

## 实际变更

1. 备份生产配置与修复前 session 文件数量。
2. 一次性设置 `plugins.entries.ops-telegram-admin.enabled=false`。
3. 从 ops 的 `tools.allow` 移除 `ops_telegram_admin`。
4. 保留 ops 的 `read/write/edit/apply_patch/exec/process/web/memory/sessions_list/send/status`。
5. 保留插件源码与扩展目录，仅作为历史与回滚证据，不再加载。
6. 配置校验通过后只重启一次 system-level Gateway。

备份：

`/Volume3/OpenClaw/home/.openclaw/backups/disable-ops-telegram-admin-20260723T175706+0800`

## 验收

- `openclaw.service`：`active/running`，`NRestarts=0`；
- Gateway PID：`1706187`；
- 插件：`enabled=false`、`activated=false`、`status=disabled`，运行工具列表为空；
- Gateway 启动插件行不再包含 `ops-telegram-admin`；
- ops allowlist 不再包含 `ops_telegram_admin`，原生 `exec/process` 保留；
- default/魚玄機、housekeeper/賈南風、life/蕭觀音、coder/步非煙四个 account 均：
  - `running=true`
  - `connected=true`
  - `probe.ok=true`
  - `restartPending=false`
  - `lastError=null`
- 四条 account-scoped binding 保持不变；
- session 相关文件修复前后均为 `567`，没有删除或覆盖。

## 后续原生流程

1. 魚玄機先核对现有 account、Bot 身份与 binding。
2. Token 写入固定 `0600` secret 文件，不经 A2A、报告或长期记忆传播。
3. 使用 `openclaw channels add --channel telegram --account <agent-id> --name <display-name> --token-file <path>`。
4. 使用 `openclaw agents bind --agent <agent-id> --bind telegram:<agent-id>`。
5. 配置结果与运行态结果分开判断，不因刚写入后的短时 probe 未就绪回滚整份配置。
6. `openclaw config validate` 后，必要时只重启一次 Gateway。
7. 使用 `channels status --probe`、`agents bindings` 和真实收发验收。

## 非阻塞现场提示

- `plugins.entries.ops-telegram-admin` 仍保留历史 config，因此 CLI 显示“plugin disabled but config is present” warning；插件没有加载，不影响 Gateway 或 Telegram。
- plugin registry 提示持久化索引策略过期，当前使用 derived index；本轮只记录，不擅自刷新。

## 18:09 后的并发外部变更

本报告前述插件停用验收在四个既有账号范围内完成。随后另一活动会话继续通过原生配置入口新增 reviewer 与三位 companion，并在 18:16 重启 Gateway；这不是已停用插件执行。

截至 18:20：

- reviewer / 夏姬、companion-dugu / 獨孤伽羅、companion-lv / 呂雉、companion-wu / 武曌的最终凭据 probe 均已通过；
- 八条 binding 与八个有效 Bot probe 均存在；
- 连续热重载后 coder 与 companion-dugu 出现 `channel stop timed out`、`restartPending=true`，其余六条 connected 正常；
- session 相关文件总数回到 `567`，其中 JSONL `267`；过程中短暂的 `568` 属于文件集合变化，不能单独证明记忆增减。

该增量再次证明：账号/binding 写入成功不能替代逐账号凭据和 polling 验收。

## 魚玄機 v0.11 继承矩阵

| 文件 | v0.10 继承 | v0.11 变化 |
| --- | --- | --- |
| `IDENTITY.md` | 人格、身份、称呼、风格全部保留 | 仅版本号 |
| `SOUL.md` | 工程原则、Risk、回滚与证据规则全部保留 | 仅版本号 |
| `USER.md` | 用户偏好与停止规则全部保留 | 仅版本号 |
| `AGENTS.md` | 职责、处理权、Gate、工程流、A2A 全部保留 | Telegram 绑定改为官方 CLI，禁止短时 probe 失败触发整份回滚 |
| `TOOLS.md` | workspace 与受审 Gateway `exec/process` 全部保留 | 移除插件工具，增加原生 CLI 流程 |
| `PERMISSIONS.md` | 既有权限与门控全部保留 | 插件权限项替换为受审原生 CLI |

本次没有改变魚玄機的人物属性、工程职责、Task/Generation、Review/Risk/Test、A2A、Sandbox 或其他 Agent 权限。
