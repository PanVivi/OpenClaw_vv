# LifeOwnerFiles｜萧观音少主专属资料区修复与验收报告｜v0.01

时间：2026-07-28 21:55 +08:00
状态：`COMPLETED`

## 结论

萧观音现可在自己的 workspace 内管理少主 Vivi 的专属生活资料。生产固定根目录为：

`/Volume3/OpenClaw/home/.openclaw/agents/life/users/Vivi`

首个真实文件已由 life Agent 创建并回读：

`备忘录/Vivi.md`

## 根因

原配置虽然声明 `workspaceAccess=rw`，但 `life` 的有效工具 allowlist 没有任何文件能力，同时明确 deny 通用 `read/write/edit/apply_patch/exec/process`。因此模型所见工具中不存在可完成创建与回读的入口；此前只改声明、未做 Agent 真实调用的修复不能成立。

## 修复

- 新增 `life-memo` 1.1.0 插件，工具名 `life_files`，仅在 `agentId=life` 时注册。
- 固定根目录，不接受调用方传入绝对根路径。
- 支持 `list/get/mkdir/create/update/append`。
- 允许 `.md/.txt/.json/.csv/.ics`，单文件最大 256 KiB，最大深度 6。
- 拒绝绝对路径、反斜线、`.`、`..`、控制字符、符号链接和越界解析。
- 不提供删除、移动、重命名、shell、脚本或任意工程文件写入。
- life 的通用高风险工具 deny 保持不变；`life_automation` 保持可用。
- 角色卡由 v0.11 升级到 v0.12，五个生产 workspace 文件按固定提交 `7eaaaa2` 后原子同步。

## 生产变更与备份

- 基线备份：`/Volume3/OpenClaw/home/.openclaw/backups/life-memo-permission-20260728T132528Z`
- 1.1.0 升级前备份：`/Volume3/OpenClaw/home/.openclaw/backups/life-memo-permission-20260728T133533Z`
- 插件版本：1.1.0，状态 `loaded`
- 配置：`valid=true`，warnings 为空
- Gateway：2026.7.1-2，service active，connectivity probe ok

## 验收证据

1. 本地集成测试：`LIFE_OWNER_FILES_TEST_OK`；覆盖非 life 不注册、创建、重复创建拒绝、读、改、追加、列目录、路径穿越、绝对路径、反斜线、非法扩展名和符号链接拒绝。
2. 首次真实创建：run `15770efd-a67d-4921-b5c9-031ded305c45`，3 次 `life_files`、0 失败；创建并回读 `备忘录/Vivi.md`。
3. v0.12 同步后真实回读：run `c9d377a8-50b6-42d9-8ee2-e08542c392bf`，回复 `LIFE_V012_OWNER_FILES_OK`；1 次 `life_files`、0 失败。
4. 两次 life 验收均使用 `custom-3/LongCat-2.0`，无 fallback。
5. `life_files` 与 `life_automation` 同时出现在 life 的真实系统提示；ops 的真实系统提示不含 `life_files`。
6. 文件权限 `0600`、专属根与子目录 `0700`；文件 SHA-256 为 `2bf3ae498d0676c2e6a31218711a81182163bce67740a30add511c3e831c8492`。
7. 部署前 160 个 life session 文件全部保留；验收只新增 session，没有删除既有记录。
8. Gateway event loop 未降级；8 个 Telegram account 均 enabled、running、probe ok。

## 临时密钥

本轮 SSH 临时私钥按用户要求继续保存在本地临时目录，仅用于受控 NAS 连接；未写入插件、文档正文中的密钥内容或 Git 提交，也未在收尾时删除。
