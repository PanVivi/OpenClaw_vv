# Codex Task Panel 停用与稳定性门禁｜v0.01

核验时间：2026-08-10 19:36 +08:00

## 当前结论

`OpenClaw Codex Task Panel Scanner` 的 standalone Scheduled/Cron 方案已停用并永久删除。2026-08-10 的生产 Cron 筛选中不存在该 Scanner；当前只允许人工触发客户端检查。

此结论取代以下历史文档中关于 Scanner active、每小时运行或部署通过的结论，但保留历史文件用于复盘：

- `CodexTaskPanel任务面板部署计划-v0.01.md`
- `CodexTaskPanel任务面板部署报告-v0.01.md`

## 原因

旧 Scanner 会先创建独立 Codex 任务和 WebView，之后客户端脚本才有机会取得 `scanner.lock`。因此锁只能限制脚本内部并发，不能限制已经创建的任务/WebView。高频或积压运行会扩大桌面进程与 GPU 子进程压力，旧方案不能恢复。

## 重新启用门禁

若未来恢复自动扫描，必须另行设计并同时满足：

- 单一长驻任务或同一任务 heartbeat，不为每次轮询创建新任务；
- 最大并发 1；
- 明确的积压上限和丢弃/合并策略；
- 失败退避和熔断；
- 任务复用与崩溃恢复；
- 受控连续稳定性验收通过。

在这些条件完成前，不得恢复 1 分钟、2 分钟、每小时或其他 standalone Scheduled 扫描。

## 与 CodexResetWatcher 的区别

`CodexResetWatcher` 是额度重置双源监控，不是 Task Panel Scanner。现场核验显示它仍为 enabled、最近状态 `ok`，生产脚本固定使用 `custom-3/LongCat-2.0`；本门禁不要求停用该独立自动化。
