# 002 OpenClaw架设部署｜Life Automation Plugin 萧观音自动化插件部署报告｜v0.01

- 部署时间：2026-07-23
- 目标环境：OpenClaw 2026.7.1-2 / Node.js 22.22.3
- 插件版本：`life-automation` 1.0.0
- 状态：`VERIFIED`

## 目标

让 `life` / 萧观音直接拥有生活自动化的创建、查询、更新、暂停、恢复、立即运行和删除能力，并接受 `housekeeper` / 贾南风从少主认证会话生成的正式委派包。运行时不依赖 Codex、ops 或其他管理员在线，不向角色开放 shell、Gateway 配置或任意 Agent 执行权限。

## 联网与源码核验结论

- OpenClaw Tool Plugin 可按 Agent 上下文条件注册专用工具。
- OpenClaw 2026.7.1-2 会在非 owner/A2A 接收轮次移除 owner-only `cron` 工具。
- 当前版本的第三方插件不能调用受信任 Gateway Cron RPC；公开的 `scheduleSessionTurn` 在当前安装源码中只接受 bundled origin。
- 因此采用插件私有的最小持久调度器，通过 OpenClaw Agent runtime 执行到期任务，不修改 OpenClaw Cron 数据库，也不绕过角色工具边界。

来源：

- https://docs.openclaw.ai/plugins/tool-plugins
- https://docs.openclaw.ai/plugins/building-plugins
- https://docs.openclaw.ai/plugins
- https://docs.openclaw.ai/cli/cron
- https://github.com/openclaw/openclaw/issues/29921
- https://www.npmjs.com/package/cron-parser

## 权限边界

- 工具 `life_automation` 仅在 `agentId=life` 时出现。
- 支持 `list/get/create/update/pause/resume/remove/run_now`。
- 只执行 `life` 自己的 Agent 任务；不接受任意 Agent ID、shell command、脚本、Webhook 或 Gateway 配置修改。
- 状态原子写入插件私有 `jobs.json`，文件权限 `0600`。
- 通知目标固定为已配置的 life Telegram 会话，不能由任务参数改发其他目标。
- Cron 表达式由 `cron-parser` 按 IANA 时区计算；Gateway 重启后从状态文件恢复。

## 部署变更

- 安装目录：`/Volume3/OpenClaw/home/.openclaw/extensions/life-automation`
- 配置：启用插件，固定 `agentId=life`、`timezone=Asia/Taipei`、life Telegram account 和少主 chat。
- life 的工具 allowlist 增加 `life_automation`。
- 非 bundled 插件 allowlist 固定包含现有插件和 `life-automation`。
- 部署前备份：`/Volume3/OpenClaw/home/.openclaw/backups/life-automation-20260723T152546`

未修改 transcript、session、个人记忆、Telegram routing 和既有 OpenClaw Cron。

## 验收结果

1. 插件编译、配置校验、插件 doctor 和 Gateway 启动通过。
2. life 新会话可见 `life_automation`；其他 Agent 不获得该工具。
3. `housekeeper → life` 主动 A2A 委派成功，life 直接创建任务，无需少主重复授权。
4. 创建、查询、更新、暂停、恢复、立即运行、删除完整生命周期全部成功。
5. Gateway 重启后任务仍可查询和操作。
6. 一次性真实定时任务到点自动触发，`lastRunStatus=ok`，随后成功清理。
7. 测试结束后插件任务列表为空；未向 Telegram 发送测试噪音。
8. 原 `CodexResetWatcher` 保持健康，未被插件替换或修改。

## 回滚

如插件自身发生故障：

1. 先暂停或删除插件私有任务；
2. 从 life 工具 allowlist 移除 `life_automation`；
3. 禁用 `plugins.entries.life-automation`；
4. 校验配置后重启 Gateway；
5. 必要时从上述备份恢复插件部署前配置。

回滚不得删除 Agent workspace、session、transcript、memory 或 Telegram binding。
