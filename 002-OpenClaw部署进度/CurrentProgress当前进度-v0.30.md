# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.30

核验时间：2026-08-10 19:36 +08:00

生产版本：OpenClaw `2026.7.1-2 (0790d9f)`

Git 基线：`origin/codex/repair-task-system-20260809` @ `84a3d64`

## v0.30 生产现场复核

- Gateway systemd user service 为 `active/running`，RPC connect 成功，运行版本与 CLI 一致，插件版本无漂移，当前服务重启计数为 0。
- `config validate --json` 返回 `valid=true`、`warnings=[]`；`plugins doctor` 返回 `No plugin issues detected`。
- `task-system-control 1.0.0`、`workflow-governance 1.1.0`、`housekeeper-workboard-control 1.1.0` 均为 `loaded`。
- 生产 binding 仍为 `ops/default`、`housekeeper/housekeeper`、`life/life`，身份没有改名。
- 生产配置、三插件 dist 和备份 006 manifest 的 SHA-256 均与 v0.29 原始验收报告一致。
- `WorkboardDispatchPump` 与 `WorkboardNotificationRelay` 均为 disabled；真实 Relay ID 是 `73146ddf-8366-4b9c-9b81-0a8ae860f842`。原报告第 7 节的另一个 Relay ID 是文档笔误，不是生产对象。
- `CodexResetWatcher` 为 enabled，最近一次状态为 `ok`；生产脚本已显式固定 `--model custom-3/LongCat-2.0`。GitHub 源码此前漏掉这两项参数，本版同步补齐。
- 当前 Cron 筛选结果不存在 `OpenClaw Codex Task Panel Scanner`。该 standalone Scanner 维持永久停用，不得按旧计划恢复；`CodexResetWatcher` 与它是不同自动化。

## 本地与 GitHub 差异处置

- 旧主工作区基于已合并的历史分支，落后 `origin/main` 345 个提交；其中同名未跟踪文档比 GitHub 当前同版本文件更旧，未提交。
- 另一工作树中三处有效差异已核实：Watcher 模型固定与生产一致；两份 Task Panel 文档追加的停用警示事实有效。为遵守历史版本不可原地改写规则，警示改由独立稳定性门禁文档承接。
- 私钥、`pw.txt`、浏览器 trace、Mini Muse 生成中间件和一次性诊断脚本保留在本地，不进入 Git；`.gitignore` 增加对应高风险/临时产物规则。

## 条件边界

- v0.29 所列真实 owner Telegram 入站自然观察仍未由本轮伪造；管理员 CLI 不能代替真实 owner 消息。
- 本轮没有执行线上回滚或 Gateway 重启；备份 006 仍存在且 manifest 哈希一致，但完整在线回滚演练仍需独立维护窗口。
- 本轮是当前状态复核和资料同步，不重复制造任务、晨报消息或高风险副作用来证明既有验收。

## v0.29 及以前完整继承

全任务系统、晨间玉简、life 专属资料区、角色表达、Telegram、Workboard、A2A、自动化和无损恢复历史结论继续保留；与本版现场事实冲突时，以本版和现场证据为准。
