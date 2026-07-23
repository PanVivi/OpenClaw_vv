# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.15

- 状态时间：2026-07-23 17:20 +08:00
- 本轮分支：`agent/lossless-content-update`

## 当前版本与部署

- 賈南風 v1.10、魚玄機 v0.09 已与 NAS 五文件逐字同步。
- 蕭觀音运行版本 v0.07；`life-automation` 已生效，但 NAS 的 `AGENTS.md/TOOLS.md` 仍待同步插件部署后文本。
- coder 运行 v0.06；reviewer 运行 v0.04；三位 companion 运行 v0.03，均低于仓库当前设计一版。
- `life-automation` 1.0.0、`housekeeper-async-dispatch` 1.0.0、`ops-telegram-admin` 1.0.0 已部署。

## 本轮修复

1. 为 ops / 魚玄機部署专用工具 `ops_telegram_admin`。
2. 魚玄機可直接完成五个固定未绑定 Agent 的 Telegram account 与 account-scoped binding，不依赖 Codex或管理员在线。
3. Token 经 Telegram 验证后写入固定 `0600` secret；不得进入 A2A、长期记忆、报告或工具输出。
4. 工具自动备份、设置少主 allowlist、校验配置并执行真实 probe；失败回滚。
5. 通用宿主 `exec/write/gateway` 继续拒绝，不扩大到任意 NAS 运维。

## 验收

- 插件 doctor 通过；ops 新会话真实看见并调用 `ops_telegram_admin`。
- `status` 调用成功；负向验证没有生成 coder account 或 binding。
- Gateway active、`NRestarts=0`、服务 Node 22.22.3。
- 原三条 Telegram account 均 running、connected、probe `ok=true`。
- coder Sandbox、八 Agent A2A、历史拒绝和 CodexResetWatcher `ok` 未回退。
- ops v0.09 五文件 NAS/仓库 SHA-256 一致。

## 当前待办

1. 第一次提供的 coder Bot Token 已被 OpenClaw 脱敏，旧 transcript 无完整值；少主需向魚玄機重新发送一条包含完整 Token、目标 coder/步非煙和立即绑定意图的新消息。
2. 完成首次真实 `configure` 后，追加 coder account、binding、Bot 身份和 probe 的无凭据验收结果。
3. 按无损更新任务同步 life 的两份插件后角色文本，以及 coder/reviewer/三位 companion 的下一版角色卡。
4. 其余四个 Bot 继续等待各自真实 Token。

## 保留边界

- 本轮没有读取或输出 Bot Token，没有从恢复包或其他 Agent 获取凭据。
- 不修改既有三个 Telegram account/binding、session、transcript、memory、A2A、Sandbox 或自动化任务。
- 不开放通用 shell、任意配置、删除、Gateway 或服务控制。
