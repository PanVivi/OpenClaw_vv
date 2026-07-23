# 002 OpenClaw架设部署｜Ops Telegram Admin 鱼玄机 Telegram 运维插件部署报告｜v0.01

- 部署时间：2026-07-23
- 目标环境：OpenClaw 2026.7.1-2 / Node.js 22.22.3
- 插件版本：`ops-telegram-admin` 1.0.0
- 角色卡版本：魚玄機 v0.09
- 状态：`DEPLOYED`；只读与拒绝路径已验证，首次真实新增等待少主重新发送完整 Token

## 问题

魚玄機的角色设计要求她负责配置、服务和部署执行，但 NAS 为安全而拒绝了通用 `exec/write/gateway`。少主直接要求她为 `coder` / 步非煙新增 Telegram Bot 时，她只能确认任务，无法写入账号、建立 binding 和执行探测。

仅开放 `gateway` 不能解决该问题：OpenClaw 对 Agent 驱动的敏感配置写入默认 fail-closed。直接开放宿主机 `exec` 又会扩大到超出 Telegram 绑定的任意命令。

## 联网核验

- OpenClaw 官方配置写入应经过 schema、增量 patch/set 和校验；大多数配置支持热加载，插件新增需要重启加载。
- Telegram 多账号使用 `channels.telegram.accounts.<accountId>`，通过 account-scoped binding 路由到 Agent。
- CLI 正式提供 `channels add`、`agents bind`、`config validate` 和 `channels status --probe`。
- 宿主 `exec` 应使用严格 allowlist/approval；对单一业务动作更适合专用受限工具。

来源：

- https://docs.openclaw.ai/gateway/configuration
- https://docs.openclaw.ai/channels/telegram
- https://docs.openclaw.ai/cli/channels
- https://docs.openclaw.ai/cli/agents
- https://docs.openclaw.ai/tools/exec-approvals
- https://docs.openclaw.ai/gateway/security

## 最小修复

1. 部署 Tool Plugin：`ops-telegram-admin` 1.0.0。
2. 工具 `ops_telegram_admin` 只向 `agentId=ops` 注册。
3. 目标只允许：
   - `coder` / 步非煙；
   - `reviewer` / 夏姬；
   - `companion-dugu` / 獨孤伽羅；
   - `companion-wu` / 武曌；
   - `companion-lv` / 呂雉。
4. 账号 ID 固定等于 Agent ID，显示名使用项目正式名称。
5. Token 先通过 Telegram `getMe` 验证，再写固定 `0600` secret 文件；输出和日志不返回 Token。
6. 新账号固定为少主 Telegram user ID 的私聊 allowlist，群组保持 allowlist。
7. 工具自动完成配置备份、账号新增、binding、配置校验和真实 probe；任一步失败回滚本次新增。
8. 已存在账号、冲突 binding 或重复 Bot 默认拒绝；不提供覆盖、删除和任意配置入口。
9. 保持 ops 的通用 `exec/process/write/edit/apply_patch/gateway/message/cron` 拒绝。

## 验收

- 插件加载和 `plugins doctor` 通过，无插件错误。
- ops 新会话真实获得 `ops_telegram_admin`；其他通用写入工具仍不存在。
- 魚玄機本人调用 `action=status` 成功，工具调用数 1、失败数 0。
- 负向验证后 `coder` account 与 binding 仍不存在，没有误写。
- Gateway `active`，`NRestarts=0`。
- 原 default/housekeeper/life 三条 Telegram account 均 running、connected、probe `ok=true`。
- A2A 八 Agent allowlist、`sessions.visibility=all`、coder Sandbox 和 CodexResetWatcher `ok` 均未回退。
- ops v0.09 五个 workspace 文件与仓库 SHA-256 一致。

## 凭据连续性结论

少主第一次发送的 Token 已被 OpenClaw 在持久化前脱敏；旧 ops transcript 中没有可恢复的完整 Token。插件部署后无法从历史提取它，也不应绕过脱敏保护。

首次真实新增需要少主在 ops Telegram 中重新发送一条同时包含完整 Token、目标 `coder / 步非煙` 和“立即绑定”的新消息。该消息进入当前轮次时，魚玄機即可直接调用专用工具；无需 Codex、管理员或 reviewer 再次代办。

## 备份与回滚

- 部署前备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-telegram-admin-20260723T171408`

回滚时禁用插件、从 ops allowlist 移除 `ops_telegram_admin`、恢复 ops v0.08 五文件和备份配置。不得删除既有 Telegram session、transcript、memory、三条原 binding 或其他插件状态。
