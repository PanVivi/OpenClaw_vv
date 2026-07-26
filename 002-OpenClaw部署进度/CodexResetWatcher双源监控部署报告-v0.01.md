# CodexResetWatcher 双源监控部署报告 v0.01

- 部署日期：2026-07-26
- 目标环境：OpenClaw `2026.7.1-2` / Node.js `22.22.3`
- 生产任务 ID：`59432519-c6fc-43f7-8efd-a3cf38230259`
- 业务所有者：life / 蕭觀音
- 范围：只修复 CodexResetWatcher 的 X 最新动态与网站双源监控

## 1. 修复结论

旧脚本只读取 `codexreset.org`，没有直接核查 Tibo 的 X 最新动态。2026-07-26 事件中，Tibo 于 03:17:12 发布 Post，网站路径到 04:12:16 才发现，Telegram 于 04:12:34 送达。

生产脚本现已升级为：

1. 默认从 `nitter.net/thsottiaux/rss` 发现 Tibo 最新公开 Post；
2. 命中高精度重置规则后，使用 X 官方 oEmbed 验证 Post ID、作者和正文；
3. 独立读取 `codexreset.org`，同 ID 标记为网站交叉核查；
4. 网站尚未收录时，不阻塞已通过 X 官方验证的直接事件；
5. 两条发现路径共用 Post ID 去重，只有 Telegram 发送成功后才写入 `notifiedIds`；
6. 分别记录 X discovery、X verification、website 的健康状态；
7. 两条发现路径同时失败时退出非零，不返回虚假 `NO_REPLY`；
8. Cron 周期由 30 分钟改为 10 分钟。

生产没有配置 X Developer Bearer Token，因此本轮没有虚构“官方 X API 已启用”。脚本已支持从权限为 `0600` 的 `X_BEARER_TOKEN_FILE` 读取凭据，并在配置后优先使用 X API v2；当前实际运行路径是“RSS 发现 + X 官方 oEmbed 验证 + 网站交叉核查”。

## 2. 备份与回滚

备份目录：

`/Volume3/OpenClaw/home/.openclaw/backups/codex-reset-watcher-dual-source-20260726T094353+0800`

备份对象包括旧脚本、状态、Cron 定义、Cron 列表、运行记录、通道基线和数据计数。`SHA256SUMS` 共 7 项，全部校验通过。

回滚顺序：

1. 恢复备份脚本和状态；
2. 将目标 Cron 调回 `everyMs=1800000`；
3. 运行 `node --check`、`--probe`、手动 Cron 和 Telegram probe；
4. 不覆盖 session、transcript、memory、binding 或其他自动化。

## 3. 实际验收

| 验收项 | 结果 | 证据摘要 |
| --- | --- | --- |
| 离线语法与单元测试 | PASS | `node --check`；12/12 test pass |
| X RSS 发现目标事件 | PASS | ID `2081096447718723984`，时间 `2026-07-25T19:17:12Z` |
| X 官方 oEmbed 验证 | PASS | 作者 `Tibo`、`@thsottiaux`、ID、正文一致 |
| 网站独立解析 | PASS | 同一 ID，`confirmed-reset`，confidence 100 |
| 网站未收录时直接 X 路径 | PASS | fixture 与生产故障注入均通过 |
| X discovery 故障时网站降级 | PASS | X 指向拒绝端口，probe 成功且 `degraded=true` |
| 网站故障时 X 路径降级 | PASS | 网站指向拒绝端口，RSS + oEmbed 成功 |
| 两源同时故障 | PASS | 退出码 1，输出两个真实错误 |
| 普通 Post 不误报 | PASS | fixture 被分类器拒绝 |
| 去重与旧状态迁移 | PASS | schema 1 → 2；8 个旧 `seenIds` 迁入 `notifiedIds`；正常运行 `NO_REPLY` |
| Telegram 真实测试 | PASS | life Bot 实际调用成功，测试文案明确不是重置事件 |
| Cron 手动运行 | PASS | `status=ok`，`NO_REPLY`，duration 5970ms |
| Gateway 重启恢复 | PASS | service active/running；RPC ok；脚本 probe 通过；预热后 event loop degraded=false |
| 八 Telegram account | PASS | 8/8 running，8/8 probe ok，lastError null |
| 配置与插件 | PASS | `config validate` 通过；`plugins doctor` 无问题 |
| 数据无损 | PASS | session files `2135→2135`、jsonl `1296→1296`、memory files `217→217` |
| 10 分钟自动周期 | PASS | 10:02:16 自动运行，status=ok，NO_REPLY，5542ms；next 10:12:16 |

14 项验收与重启后的自动周期全部通过，完整逐阶段证据见计划书执行记录。

## 4. 非目标差异

备份列表中存在一个已禁用的旧 `WorkboardNotificationPump`（ID `deac91f2-...`）；后续现场列表不再返回该禁用对象。三个当时仍启用的非目标 Cron 配置保持不变。本轮没有恢复或启用该历史泵，避免把 CodexResetWatcher 修复扩大为 Workboard 改造；其原定义仍保存在本轮备份中。

## 5. 网络依据

- OpenClaw Cron：<https://docs.openclaw.ai/cron>
- OpenClaw Cron CLI：<https://docs.openclaw.ai/cli/cron>
- X User Posts API：<https://docs.x.com/x-api/users/get-posts>
- X timeline：<https://docs.x.com/x-api/posts/timelines/introduction>
- X API pricing：<https://docs.x.com/x-api/getting-started/pricing>
- X oEmbed：<https://docs.x.com/x-for-websites/oembed-api>
- Nitter GitHub：<https://github.com/zedeus/nitter>
- Nitter 实例列表：<https://github-wiki-see.page/m/zedeus/nitter/wiki/Instances>

## 6. 未改变

- 角色人格、身份、核心职责和角色卡版本；
- A2A、Workboard 业务流程、Telegram binding；
- session、transcript、memory；
- 其他 Agent 权限和其他启用中的 Cron。
