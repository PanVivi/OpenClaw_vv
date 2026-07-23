# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.16

- 状态时间：2026-07-23 18:25 +08:00
- 本轮分支：`agent/lossless-content-update`

## 当前版本与部署

- 賈南風 v1.10、魚玄機 v0.10 已与 NAS 五文件逐字同步。
- 蕭觀音运行 v0.07；coder 运行角色卡 v0.06、reviewer v0.04、三位 companion v0.03，后五者仍低于仓库设计一版。
- `life-automation`、`housekeeper-async-dispatch`、`ops-telegram-admin` 1.0.0 已部署。
- Telegram 已配置 default/魚玄機、housekeeper/賈南風、life/蕭觀音、coder/步非煙四个 account。

## 本轮修复

1. 完整对照现行架构、工作流程、八角色 AGENTS/TOOLS/PERMISSIONS/DeploymentStatus。
2. 修正 ops 职责与运行权限矛盾：开放自身 workspace 写入及受审 NAS Gateway `exec/process`。
3. `exec` 使用 `mode=auto` 与 host `allowlist/on-miss/deny fallback`；不使用无审批 `full`。
4. 任意 Gateway、message、Cron、history、spawn 继续拒绝。
5. 更新魚玄機角色卡为 v0.10 并无损部署；其他七角色权限未改变。

## 验收

- ops 正向真实调用 `exec/write/read/process` 全部通过。
- 无 Risk 的配置修改/重启请求被 ops 拒绝，未调用副作用工具。
- 非 ops 配置修复前后哈希一致。
- 配置 validate 通过；Gateway deep probe 通过。
- 一次 Gateway 重启清理 Telegram `channel stop timed out` 僵尸状态；四个已配置 Bot 均 running、probe ok、restartPending false。
- A2A 八 Agent allowlist 保持；原 Telegram session/transcript 保留。

## 当前待办

1. 按无损更新任务同步 life 的插件后文本，以及 coder/reviewer/三位 companion 的下一版角色卡。
2. reviewer 与三位 companion 的 Bot 仍等待真实 Token。
3. Control UI 认证与危险调试开关等既有安全问题另立任务处理，本轮未扩大范围。

## 证据

- 权限修复报告：`002-OpenClaw部署进度/OpsRuntimePermissions鱼玄机运行权限修复报告-v0.01.md`
- NAS 备份：`/Volume3/OpenClaw/home/.openclaw/backups/ops-runtime-permissions-20260723T180500+0800`
