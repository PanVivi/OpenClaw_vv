# CodexResetWatcher 双源监控修复计划 v0.01

- 日期：2026-07-26
- 分支：`agent/lossless-content-update`
- 目标环境：OpenClaw 2026.7.1-2 / Node.js 22.22.3
- 唯一目标：补齐“Tibo 的 X 最新动态 + codexreset.org”双源监控，缩短额度重置通知延迟
- 明确不做：不修改角色人格、A2A、Workboard、Telegram binding、个人记忆、其他 Cron 或其他 Agent 权限

## 1. 已核实的问题

2026-07-26 的重置事件时间线：

| 节点 | 时间（Asia/Taipei） | 事实 |
| --- | --- | --- |
| Tibo 发布 X 动态 | 03:17:12 | `2081096447718723984` |
| Watcher 运行 | 03:42:16 | 正常执行，但网站尚未收录，返回 `NO_REPLY` |
| Watcher 再运行 | 04:12:16 | 从网站发现事件 |
| Telegram 送达 | 04:12:34 | life account，messageId `117` |

根因不是 Cron 漏跑，而是旧脚本只读取 `codexreset.org`。该独立网站公开说明 X 采集周期为 1 小时；本地再每 30 分钟轮询一次，理论发现延迟可接近 90 分钟。旧验收只证明网站链路和 Telegram 链路可用，没有证明 X 最新动态被直接核查。

## 2. 网络资料结论

### 官方

- X User Posts API `/2/users/{id}/tweets` 是获取指定用户最新动态的正式接口，需要开发者 App、Bearer Token，并按当前 X API 规则计费：
  - https://docs.x.com/x-api/users/get-posts
  - https://docs.x.com/x-api/posts/timelines/introduction
  - https://docs.x.com/x-api/getting-started/pricing
- X 官方 oEmbed `https://publish.x.com/oembed` 无需认证、无公开速率限制，可按已知 Post URL 返回作者和正文，适合验证候选事件，但不能单独可靠发现最新 Post：
  - https://docs.x.com/x-for-websites/oembed-api
- OpenClaw `schedule.kind=every` 是固定间隔；Cron 运行记录与 SQLite 持久化可用于核对每次实际执行：
  - https://docs.openclaw.ai/cron
  - https://docs.openclaw.ai/cli/cron

### GitHub / 社群

- Nitter 官方项目提供公开时间线和 RSS；其公开实例状态会变化，不能作为唯一事实源：
  - https://github.com/zedeus/nitter
  - https://github-wiki-see.page/m/zedeus/nitter/wiki/Instances
- 社群反馈确认免费 X RSS 服务存在反爬、实例故障和缓存问题，因此必须做来源健康记录、官方 oEmbed 验证和网站降级，不能静默假装正常。

## 3. 方案选择

### 最终部署结构

1. **官方 API 预留入口**
   若以后配置只读 `X_BEARER_TOKEN_FILE`，优先使用 X API v2 User Posts；Token 只从 `0600` 文件读取，不进入参数、日志、状态或消息。本轮现场没有 X API 凭据，不虚构已启用。
2. **X 最新动态发现**
   当前无凭据运行时，从 Nitter 官方实例 `nitter.net` 的 `@thsottiaux` RSS 获取最新公开 Post ID、正文和发布时间。
3. **X 官方验证**
   对未见过且命中高精度规则的候选 ID 调用 X 官方 oEmbed，验证 `author_url=https://x.com/thsottiaux`、返回 URL 的 Post ID 和正文一致；验证失败不发送。
4. **网站交叉核查**
   同时读取 `codexreset.org` 的高可信 `confirmed-reset/reset-intent`。网站已收录同一 ID 时标记 `corroborated`；网站尚未收录时，不阻塞已经通过 X 官方 oEmbed 的直接事件。
5. **统一去重**
   所有来源共享 Post ID 去重；只有 Telegram 成功后才把 ID 写入 `notifiedIds`。抓取失败或发送失败不得把事件吃掉。
6. **来源健康状态**
   分别记录 X discovery、X oEmbed、网站的最后成功、最后错误和连续失败；两条发现路径同时失败时退出非零，让 Cron 记录真实失败。
7. **调度**
   从 30 分钟调整为 10 分钟。该频率与 Nitter RSS 常见缓存量级匹配，不进行无意义的分钟级高频抓取。

### 为什么不直接部署 X API

官方 X API 是长期最优源，但当前 NAS 没有 X Developer Bearer Token，X 官方当前又采用预付费按量计费。擅自注册、付费或要求聊天传 Token 都超出授权。本次实现官方 API 兼容入口，但实际生产用“RSS 发现 + X 官方 oEmbed 验证 + 网站交叉核查”，并把运行源如实标注。

## 4. 风险与回滚

| 风险 | 控制 |
| --- | --- |
| RSS 实例失效或缓存 | 网站独立降级；状态记录真实错误；两源同败时 Cron 失败 |
| RSS 伪造或错作者 | 必须经过 X 官方 oEmbed 验证作者、ID 和正文 |
| 误报普通“reset”讨论 | 必须同时命中 Codex/ChatGPT Work、usage/limit/quota 和明确 reset 动作；仅接受 Tibo |
| 重复通知 | 统一 Post ID；成功发送后原子写状态 |
| 发送成功但状态写入失败 | 保存前保留 Telegram 返回；测试检查重复风险；状态文件原子替换 |
| 新脚本异常 | 恢复备份脚本、状态和 Cron 定义；恢复 30 分钟周期 |

## 5. 部署阶段与硬门

### 阶段 A：基线与备份

- 保存脚本、状态、Cron 定义及 SHA256。
- 记录现有 run history、Telegram 最新送达和其他 Cron 状态。
- 硬门：备份可读，原文件不减少。

### 阶段 B：离线实现与测试

- 将抓取、解析、分类、合并、状态更新拆为可测试函数。
- 增加 fixture：目标 X 事件、普通非重置 Post、网站同 ID、来源失败、重复 ID。
- 硬门：所有测试通过；测试不得真实外发。

### 阶段 C：生产候选探测

- 用 `--probe` 同时访问 X discovery、X oEmbed 和网站，不写生产状态、不发 Telegram。
- 硬门：识别目标 ID `2081096447718723984`；作者、正文、时间和 sourceUrl 正确；报告每个来源健康。

### 阶段 D：原子部署与调度更新

- 原子替换脚本；保留现有 `seenIds` 并迁移到新 schema。
- Cron 改为每 10 分钟，其他字段不变。
- 硬门：config valid、Cron get 正确、其他三个现有任务不变。

### 阶段 E：真实验收

必须全部通过：

1. X RSS 能发现目标事件。
2. X 官方 oEmbed 验证作者、ID、正文。
3. 网站能独立解析同一事件。
4. 直接 X 事件在网站缺席 fixture 中仍可形成待通知事件。
5. X discovery 故障时网站路径仍工作。
6. 网站故障时经过 oEmbed 的 X 路径仍工作。
7. 两条发现路径同时失败时明确失败，不返回假 `NO_REPLY`。
8. 普通 Post 不误报。
9. 已通知 ID 不重复发送。
10. 旧 schema 状态无损迁移。
11. `--test-notify` 由 life Bot 实际送达 Telegram。
12. Cron 手动运行与下一次计划运行均成功。
13. Gateway 重启后 Cron、脚本、状态和 Telegram probe 保持正常。
14. CodexResetWatcher 之外的 Cron、Workboard、八 Bot、session/transcript/memory 不回退。

任一硬门失败不得宣称修复完成。

## 6. 执行核对格式

```text
阶段：
计划动作：
实际动作：
计划外动作：
证据：
结果：PASS / FAIL / ROLLED BACK
下一阶段许可：YES / NO
```

## 7. 文档与同步

验收通过后：

1. 在本计划追加逐阶段执行记录和最终验收表。
2. 新建部署报告与事故经验。
3. 增量更新 CurrentProgress、SourceIndex、自动化脚本入口和 life DeploymentStatus。
4. 扫描凭据、Token 与 transcript，运行 `git diff --check`。
5. 提交并推送 `agent/lossless-content-update`，核对本地与远端 commit 一致。

## 8. 实际执行记录

### 阶段 A：基线与备份

```text
阶段：A
计划动作：备份脚本、状态、Cron、运行历史、通道基线和数据计数。
实际动作：写入 codex-reset-watcher-dual-source-20260726T094353+0800。
计划外动作：首次 SHA256 清单误把清单自身纳入；在未修改源文件的前提下重建清单。
证据：7 个备份对象逐项 sha256sum -c 通过。
结果：PASS
下一阶段许可：YES
```

### 阶段 B：离线实现与测试

```text
阶段：B
计划动作：实现双源、分类、合并、状态迁移和测试。
实际动作：脚本拆分为纯函数；新增 12 项 node:test。
计划外动作：无。
证据：node --check 通过；12/12 test pass；git diff --check 通过。
结果：PASS
下一阶段许可：YES
```

### 阶段 C：生产候选探测

```text
阶段：C
计划动作：从 /tmp 运行候选 --probe，不写生产状态、不外发。
实际动作：完成双源 live probe、已知 Post 显式验证、单源故障和双源故障注入。
计划外动作：NAS SCP 提前断开，改用同一 SSH 通道压缩 Base64 传输；未改生产。
证据：目标 ID、作者、时间、正文、URL 正确；RSS/website/oEmbed 均 ok；探测状态文件不存在。
结果：PASS
下一阶段许可：YES
```

### 阶段 D：原子部署与调度

```text
阶段：D
计划动作：原子替换脚本、迁移状态、Cron 调为 10m。
实际动作：按本地 SHA256 核对候选后替换；everyMs 1800000→600000；schema 1→2。
计划外动作：第一次临时文件 .new 不被 node --check 识别为 ESM；替换前停止，改为 .new.mjs 后通过。
证据：生产 SHA256 一致；旧 8 个 seenIds 均进入 notifiedIds；首次正常运行 NO_REPLY。
结果：PASS
下一阶段许可：YES
```

### 阶段 E：验收明细

| 序号 | 项目 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | X RSS 发现目标 | PASS | ID `2081096447718723984`，时间 `2026-07-25T19:17:12Z` |
| 2 | X 官方 oEmbed | PASS | Tibo、ID、正文一致 |
| 3 | 网站独立解析 | PASS | 同 ID，confirmed-reset，confidence 100 |
| 4 | 网站缺席时 X 事件可用 | PASS | fixture + 网站故障注入 |
| 5 | X discovery 故障降级 | PASS | 网站独立成功，degraded=true |
| 6 | 网站故障降级 | PASS | RSS + oEmbed 成功，degraded=true |
| 7 | 双发现源同时失败 | PASS | 退出码 1，两个来源错误均输出 |
| 8 | 普通 Post 不误报 | PASS | node:test |
| 9 | 已通知 ID 不重复 | PASS | 生产正常运行 NO_REPLY |
| 10 | 旧 schema 迁移 | PASS | 8/8 ID 保留并进入 notifiedIds |
| 11 | Telegram 真实测试 | PASS | life 固定 account 调用成功 |
| 12 | 手动 Cron | PASS | status=ok，NO_REPLY，5970ms |
| 13 | Gateway 重启恢复 | PASS | active/running、RPC ok、8/8 Telegram probe ok、Watcher probe ok |
| 14 | 非目标数据不回退 | PASS | session `2135=2135`、jsonl `1296=1296`、memory `217=217`；三个启用中的非目标 Cron 配置不变 |

备份时另有一个已经 disabled 的 `WorkboardNotificationPump` 历史对象；本轮后续列表不再返回该禁用对象。本轮没有恢复或启用它，避免把 Watcher 修复扩大成 Workboard 改造，原定义仍在备份。

## 9. 最终验收状态

- 10 分钟自动计划运行：`2026-07-26 10:02:16 +08:00` 自动启动，10:02:22 完成，`status=ok`、`NO_REPLY`、duration 5542ms；下一次为 10:12:16。
- Gateway 重启后事件循环稳定性：预热后 `degraded=false`，P99 delay 20.8ms；八账号 8/8 running、8/8 probe ok、0 error。
- 最终状态：阶段 A–E 与 14 项验收全部通过。
- 文档与 GitHub 同步：已提交并推送 `agent/lossless-content-update`；本地与远端 HEAD 一致，草稿 PR 已建立。
