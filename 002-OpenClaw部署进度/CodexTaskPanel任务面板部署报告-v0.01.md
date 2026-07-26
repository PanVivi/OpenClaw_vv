# Codex Task Panel 任务面板部署报告 v0.01

- 日期：2026-07-26
- 分支：`agent/lossless-content-update`
- 目标：少主通过賈南風 Telegram 登记 Codex 专属任务，Codex Desktop 每小时检查并按强制治理流程执行

## 已部署结构

1. 官方 Workboard 独立 board：`codex`。
2. 賈南風 v1.15：只登记、查询、取消、催办和最终通知，不新增 shell。
3. Windows 客户端：`CodexTaskPanelClient.ps1`。
4. 固定政策：`CodexTaskExecutionPolicy-v0.01.md`。
5. Codex Desktop standalone Scheduled：`OpenClaw Codex Task Panel Scanner`。
6. 仓库外 DPAPI 凭据与本机状态目录：仅当前 Windows 用户 ACL。

现有 `WorkboardDispatchPump` 继续固定 `--board production`；`codex` 不经过普通 OpenClaw dispatcher。

## 备份

- 路径：`/Volume3/OpenClaw/home/.openclaw/backups/codex-task-panel-20260726T134626+0800`
- 覆盖：`openclaw.json`、八角色五件套、Automation、Cron 清单、Workboard SQLite。
- SQLite：使用原生 `.backup` 在线备份；`pragma integrity_check=ok`。
- SHA256：备份清单复核通过。

## 真实验收中发现并修正

1. 当前 card JSON 的 board 位于 `metadata.automation.boardId`，`show` 含 `card` 包装；解析已兼容。
2. `scheduled` 不是领取锁；无 `scheduledAt` 会被官方状态保持拒绝。已改为官方 claim/release/heartbeat/complete/block。
3. 每次 Codex Scheduled 本身已是 standalone 独立任务，不再依赖嵌套创建第二层 Codex task。
4. 临时一分钟验收产生重叠风险后立即暂停；正式周期不使用高频设置。

## 已取得的真实证据

- 空面板 Scheduled run：quiet=true，无领取、无 Telegram、无文件修改。
- 合规卡 discovery：正确识别固定 board、labels、policy 和认证来源。
- 官方 claim：卡从 ready 原子进入 running，claim 事件存在。
- release：执行未开始时从 running 恢复 ready，claim 清除。
- heartbeat：事件和 comment 实际写入。
- 受控失败：只读验收发现仓库未提交状态后写 blocked，没有伪造 done；NAS、Telegram 和仓库均未修改。
- 三面审核：需求/架构、安全/恢复、可部署/真实验收分别给出结论。

## 最终验收结果

| 项目 | 结果 |
| --- | --- |
| 配置、Gateway、插件、Tasks | 通过：OpenClaw `2026.7.1-2`；config valid/warnings 为空；service active、RPC ok；Workboard `2026.7.1` 与 Codex `2026.7.1-1` 均 enabled/activated/loaded；Tasks 0 error，保留 1 条既有 Cron lost warning |
| production dispatcher 未变 | 通过：`WorkboardDispatchPump` 仍每 60 秒固定执行 `workboard dispatch --board production --json`，最后运行 ok、0 start failure；没有 `codex` dispatch |
| 八 Telegram / A2A / transcript / memory 无回退 | 通过：8/8 account enabled/configured/running/connected/probe ok；8 条 binding；A2A enabled 且 allowlist 为原八角色；session 1316→1332、memory 219→219、credentials/secrets 10→10 |
| 客户端离线测试 | 通过：七个契约与负向 case 全部 true |
| 空扫描静默 | 通过：真实 Scheduled run 返回 `quiet=true`，未领取、未通知、未改文件 |
| claim / release / heartbeat / blocked | 通过：真实事件链已核对 |
| 当前最终卡 Scheduled 执行 | 通过：本次每小时 Scheduled 完成 Discover、官方 claim、Bind 与两次 heartbeat；board=`codex`，claim token 对外保持 redacted |
| 正式每小时 Scheduled active | 通过：automation TOML 为 `ACTIVE`、`FREQ=HOURLY;INTERVAL=1`、local project、`gpt-5.6-sol`、失败运行才通知 |
| Git secret scan / commit / push | 由本次执行在最终 diff 与秘密检查通过后提交，并以本地/远端 HEAD 相等作为门禁 |
| 完成卡 done + proof | 由同一本次执行在文档 commit/push 成功后调用 Complete，客户端会同时写 passed proof |
| 賈南風 Telegram 最终通知 | 由同一本次执行在 Complete 成功后调用 Notify；通知失败只重试通知，不重复验收或提交 |

本表的生产与 Scheduled 验收数据核验时间为 2026-07-26 14:20—14:34 +08:00。最后三项依固定顺序在本报告首轮同步后闭环，并在下方追加实际 commit、done/proof 与 Telegram 结果。

## 最终同步记录

- 执行卡：`CODEX-PANEL-ACCEPTANCE-002`（Workboard UUID 在内部证据保留）。
- 执行前 Git 锚点：`05ede8965f7847d1d7c65506e9d86d2a806b998f`，当时与远端分支一致且工作树干净。
- 本轮只修改 CodexTaskPanel 计划/审核/报告、賈南風部署与版本状态、CurrentProgress；未修改生产配置、服务、通道或数据。
- 最终 commit、push、done/proof 与 Telegram 请求结果见本节后续追加记录。

## 运行前提

需要本地项目时，Windows 电脑必须开机、Codex Desktop 必须运行。电脑离线期间不会执行本地 Scheduled；Workboard 卡仍持久保存，恢复后由下一小时继续。
