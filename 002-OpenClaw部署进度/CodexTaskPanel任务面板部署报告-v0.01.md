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

## 最终验收清单

| 项目 | 结果 |
| --- | --- |
| 配置、Gateway、插件、Tasks | 待最终复核 |
| production dispatcher 未变 | 待最终复核 |
| 八 Telegram / A2A / transcript / memory 无回退 | 待最终复核 |
| 客户端离线测试 | 通过 |
| 空扫描静默 | 通过 |
| claim / release / heartbeat / blocked | 通过 |
| 完成卡 done + proof | 待最终卡 |
| 正式每小时 Scheduled active | 待最终切换 |
| Git secret scan / commit / push | 待最终完成 |
| 賈南風 Telegram 最终通知 | 待最终完成 |

只有所有“待最终”完成后，本报告才作为部署完成证据。

## 运行前提

需要本地项目时，Windows 电脑必须开机、Codex Desktop 必须运行。电脑离线期间不会执行本地 Scheduled；Workboard 卡仍持久保存，恢复后由下一小时继续。
