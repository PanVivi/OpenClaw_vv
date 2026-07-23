# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.17

- 现场核验：2026-07-23 18:20 +08:00
- 本轮分支：`agent/lossless-content-update`
- 现场版本：OpenClaw `2026.7.1-2`（`0790d9f`），Gateway Node `v22.22.3`

## 当前真实状态

- system-level `openclaw.service` 为 `active/running`，PID `1716722`，本次启动时间 18:16:07，`NRestarts=0`。
- 八个 Agent、独立 workspace 和基础五文件均存在。
- 当前设计版本：賈南風 v1.10、蕭觀音 v0.07、魚玄機 v0.11、步非煙 v0.07、夏姬 v0.05、三位 companion v0.04。
- NAS 实际角色卡：賈南風 v1.10、蕭觀音 v0.07、魚玄機 v0.10、步非煙 v0.06、夏姬 v0.04、三位 companion v0.03。
- Telegram 已配置八个 account，并存在八条 account-scoped binding：
  - `default` → ops / 魚玄機
  - `housekeeper` → housekeeper / 賈南風
  - `life` → life / 蕭觀音
  - `coder` → coder / 步非煙
  - `reviewer` → reviewer / 夏姬
  - `companion-dugu` → companion-dugu / 獨孤伽羅
  - `companion-wu` → companion-wu / 武曌
  - `companion-lv` → companion-lv / 呂雉
- 八个 Bot 的 probe 均已通过。
- 当前 connected 正常六条：default、housekeeper、life、reviewer、companion-wu、companion-lv。
- coder 与 companion-dugu 因连续配置热重载触发 `channel stop timed out after 5000ms`，当前 `running=false`、`restartPending=true`；需完整 Gateway 重启后复验。

## 当前运行能力

- `life-automation` 1.0.0、`housekeeper-async-dispatch` 1.0.0 已加载。
- `ops-telegram-admin` 1.0.0 已停用，扩展文件保留但未激活、未暴露工具。
- 魚玄機保留 workspace 写入和受审 Gateway `exec/process`；Telegram 后续改走原生 `channels add` 与 `agents bind`。
- A2A：`enabled=true`，allowlist 包含全部八个 Agent；`tools.sessions.visibility=all`；`sessions_history` 仍按各 Agent 策略拒绝。
- Sandbox：仅 coder 为 `mode=all`，容器 `openclaw-sbx-agent-coder-ff01e048` 正在运行且镜像匹配；其他七个 Agent 为 `off`。
- Docker：active，Server `28.2.2`，镜像 `openclaw-sandbox:bookworm-slim` 存在。
- CodexResetWatcher：唯一 Cron，life 所有，每 30 分钟运行；最近一次 `status=ok`、连续错误 `0`。

## 本轮修复与验证

1. 停用过度复杂的 `ops-telegram-admin`，从 ops allowlist 移除工具。
2. 保留四个 Telegram account、四条 binding、Token、session、transcript、memory 和恢复包。
3. 配置校验通过后只重启一次 Gateway。
4. 插件停用完成时的四个既有 Telegram account 均 `running/connected/probe ok`；此后另一活动会话在 18:09—18:16 继续新增四个账号并重启 Gateway。
5. 后续凭据最终均通过 probe，但连续原生配置写入仍触发 OpenClaw channel stop 超时；该问题不是已停用插件执行。
6. 当前 session 相关文件为 `567`、其中 JSONL `267`，与插件停用前总数一致；过程中曾因临时/新增文件短暂显示 `568`，没有据此推断聊天被删除。
7. 魚玄機角色卡升级为 v0.11 设计版，仅替换 Telegram 绑定流程；NAS 五文件尚未部署 v0.11。

## 已知非阻塞项

- 已禁用插件仍保留历史 config，`config validate` 因而返回一条 warning，但配置有效、插件未加载。
- plugin registry 的持久化策略索引提示过期，运行时已使用 derived index；本轮未扩大范围刷新。
- 魚玄機 v0.11、步非煙 v0.07、夏姬 v0.05 和三位 companion v0.04 尚待按无损更新任务部署。
- coder 与 companion-dugu 需要一次完整 Gateway 重启清理 `restartPending`，随后逐个复验八 Bot 真实收发；在完成前不得声明八 Bot 全部上线。

## 证据

- 原生绑定修复报告：`002-OpenClaw部署进度/OpsTelegramNativeBinding鱼玄机原生Telegram绑定修复报告-v0.01.md`
- 魚玄機权限报告：`002-OpenClaw部署进度/OpsRuntimePermissions鱼玄机运行权限修复报告-v0.01.md`
- 本轮备份：`/Volume3/OpenClaw/home/.openclaw/backups/disable-ops-telegram-admin-20260723T175706+0800`
