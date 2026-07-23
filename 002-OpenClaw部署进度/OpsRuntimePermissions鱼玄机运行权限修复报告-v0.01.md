# 魚玄機运行权限修复报告 v0.01

- 日期：2026-07-23
- OpenClaw：2026.7.1-2（0790d9f）
- 范围：仅核对八角色现行职责与运行权限，补齐 ops / 魚玄機的工程执行能力并验证无回退

## 结论

已修复。原运行配置只给魚玄機只读、Web、Memory、A2A 和 `ops_telegram_admin`，却拒绝 `write/edit/apply_patch/exec/process`，与既有“工程调查、配置、服务、部署执行者”职责及 PERMISSIONS 分级矩阵矛盾。

现已向 ops 开放：

- 自身 workspace 内的 `write/edit/apply_patch`；
- 固定在 NAS Gateway 的 `exec/process`；
- `exec.mode=auto`、`strictInlineEval=true`、自动审查超时 45 秒；
- host approvals：`security=allowlist`、`ask=on-miss`、`askFallback=deny`、`autoAllowSkills=false`。

仍拒绝任意 `gateway`、`message`、`cron`、`sessions_history` 和 `sessions_spawn`。生产文件、配置、服务和部署通过受审 `exec` 完成；工具开放不代替现实授权、当前处理权、一次性 Risk、备份、回滚和 reviewer.Test。

## 官方依据

- OpenClaw 配置 Schema 是配置字段的权威来源；Gateway 监视配置文件并对大多数设置热加载，非法配置拒绝应用：<https://docs.openclaw.ai/gateway/configuration>
- `exec` 在 Sandbox 关闭时可固定到 Gateway；`mode=auto` 对允许项直接执行，对 miss 使用原生单次自动审查，再回退人工：<https://docs.openclaw.ai/tools/exec>
- Gateway/Node 执行的实际权限是请求策略与 host approvals 的交集；无界面回退应为拒绝：<https://docs.openclaw.ai/tools/exec-approvals>
- Sandbox 与工具策略是两层机制；工具被 deny 时不能靠 Sandbox 恢复：<https://docs.openclaw.ai/sandboxing>

## 八角色对照

| Agent | 设计所需能力 | 现场结论 |
| --- | --- | --- |
| housekeeper / 賈南風 | 接单、拆分、异步委派、状态汇总；无工程副作用 | 配置一致，未修改 |
| life / 蕭觀音 | Web、消息、生活自动化；无工程 shell/文件/服务 | 配置一致，未修改 |
| ops / 魚玄機 | 调查、方案、workspace 记录、受审配置/服务/部署执行 | 原配置缺失执行能力；本轮修复 |
| coder / 步非煙 | Sandbox 内实现、测试、构建；无生产执行 | 配置一致，未修改 |
| reviewer / 夏姬 | 只读 Review/Risk/Test；无生产副作用 | 配置一致，未修改 |
| 三位 companion | 陪伴与最小 A2A；无工程权限 | 配置一致，未修改 |

非 ops 的 `agents.list[1:]` 修复前后规范化 SHA-256 均为 `69b7159a87bdcc89cc123959aa0fdb4e8f03e0890ebd7091c98926b58c087464`。

## 实际变更

1. 备份 `openclaw.json`、`exec-approvals.json`、原 ops 五文件和 session manifest 哈希。
2. 经 `openclaw config set --dry-run` 验证后，只修改 `agents.list[0].tools.allow/deny/exec`。
3. 只增加 ops 的 host approvals 策略；其他 Agent approvals 未改。
4. 将 ops 五文件无损更新到 v0.10；五个 NAS SHA-256 与仓库逐项一致。
5. 未覆盖或删除任何既有 session、transcript、memory、binding、自动化或其他 Agent workspace。

备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-runtime-permissions-20260723T180500+0800`

## 正向与负向验收

### 正向

- reviewer 生成一次性 Risk：`RISK-OPS-PERMISSION-SMOKE-20260723-01-G1`。
- ops 真实执行 `/usr/bin/pwd`，自动审查单次放行，退出码 0，路径为 ops workspace。
- ops 真实执行 `/usr/local/sbin/openclaw --version`，自动审查单次放行，退出码 0，版本为 2026.7.1-2。
- ops 使用 `write/read` 创建并回读固定测试文件，内容一致；测试后按回滚计划由维护入口精确删除。
- reviewer 生成 `RISK-OPS-PROCESS-SMOKE-20260723-01-G1-01`；ops 后台运行 `/usr/bin/sleep 2`，`process` 返回 session `amber-shoal`、退出码 0。

### 负向

在没有 Risk、固定命令、配置 diff、备份与回滚的独立会话中，请求 ops 修改配置并重启。ops 明确拒绝，且没有调用副作用工具。

## Telegram 回归与恢复

验收期间，刚新增的 coder Telegram account 以及 default account 出现 `channel stop timed out after 5000ms`、`restartPending=true`。官方渠道 probe 仅验证 Bot Token，并不等同 polling 循环存活；官方同类问题说明超时可能留下僵尸任务，完整 Gateway 进程重启是可靠恢复路径：<https://github.com/openclaw/openclaw/issues/71412>。

执行一次 `openclaw gateway restart` 后：

- Gateway PID 更新为 `1698406`，状态 active，版本不变；
- coder、default/魚玄機、housekeeper/賈南風、life/蕭觀音均 `running=true`；
- 四个 account 均 probe `ok=true`，`restartPending=false`，无 `lastError`；
- 原 Telegram session ID 与 transcript 文件仍存在。

## 安全审计与范围

`openclaw security audit --deep` 的 Gateway 深度连接检查通过。审计仍报告既有 Control UI 无认证、危险调试开关、全局默认工具面和插件静态 `child_process` 模式等问题。这些不是本轮新增，也不阻塞 ops 权限修复；按“不扩大范围”要求只记录，不在本轮修改。

## 可回滚

如需回滚，仅恢复备份中的：

- `openclaw.json`
- `exec-approvals.json`
- `workspace-v0.09/` 下五个 ops 文件

然后执行配置校验和一次 Gateway 重启，再核验四个 Telegram account、A2A、Sandbox 与原 session。不得回滚或覆盖 `sessions/`、transcript、memory、Telegram secret 或 binding。
