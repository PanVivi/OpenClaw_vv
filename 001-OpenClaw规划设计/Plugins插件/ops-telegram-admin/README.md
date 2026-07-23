# Ops Telegram Admin Tool Plugin

OpenClaw 2026.5.17 及以上的原生 Tool Plugin。它只向 `ops` / 魚玄機暴露 `ops_telegram_admin`，用于为尚未绑定 Telegram 的固定 Agent 增量配置账号和 account-scoped binding。

## 权限边界

- 只允许 `coder`、`reviewer`、`companion-dugu`、`companion-wu`、`companion-lv`。
- 不提供通用 shell、Gateway、文件写入或任意配置修改。
- 新账号 ID 固定等于 Agent ID；显示名来自插件内固定映射。
- Token 先通过 Telegram `getMe` 验证，再原子写入固定 `0600` secret 文件；工具输出、日志和部署报告不返回 Token。
- 新账号固定为仅允许插件配置中的 owner Telegram user ID 私聊，群组默认拒绝。
- 配置前备份 `openclaw.json`；账号、binding、配置校验或真实 probe 任一步失败时恢复备份并删除本次新建 secret。
- 已存在账号或冲突 binding 默认拒绝，不提供覆盖或删除动作。

## 工具动作

- `status`：查看五个目标 Agent 的账号、binding 和无凭据通道状态。
- `configure`：验证 Token，新增固定账号，绑定对应 Agent，校验配置并执行真实 Telegram probe。

## 配置

```json
{
  "agentId": "ops",
  "ownerUserId": "<固定 Telegram user ID>"
}
```

该插件解决的是 ops 角色设计允许受审运维执行，但生产配置为安全而关闭通用 `exec/write/gateway` 后，无法完成低范围 Telegram Bot 增量绑定的问题。
