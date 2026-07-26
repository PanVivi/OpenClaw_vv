# Codex Task Panel 定时领取与嵌套任务误区 v0.01

- 日期：2026-07-26
- 影响：仅本次只读验收卡；未影响 `production` board、八 Agent 会话、Telegram、记忆或 NAS 配置

## 现象

第一次真实 Scheduled 验收安全失败在领取前：客户端假定 card 顶层有 `boardId`，但当前 OpenClaw 的 board 位于 `metadata.automation.boardId`，CLI `show --json` 还会返回 `{card: ...}` 包装。

修正解析后，初版把 `ready → scheduled` 当成二阶段 reserve。当前 OpenClaw 源码规定 scheduled 卡必须有有效 `scheduledAt`；没有时，进入 ready/running/review 的状态保持检查会返回 `card is scheduled for later`。

第二次真实 Scheduled 能领取卡，但在调度任务内尝试再建立第二层 Codex thread 不可靠。Codex Scheduled 每次本来已经是 standalone 独立任务；嵌套第二层并不是完成少主目标的必要条件。

## 根因

1. 设计时把官方文档的 Card 概念字段当成当前 CLI JSON 顶层字段，未先以真实返回 schema 固化解析。
2. 自行借用了 `scheduled` 业务状态，没有使用 Workboard 已提供的 claim/release/heartbeat/complete/block 协议。
3. 把“Scheduled 每次独立运行”错误地理解成“Scheduled 还要创建另一个独立运行”，增加了没有官方必要性的层级。

## 正确修复

- 同时兼容顶层 `boardId` 与 `metadata.automation.boardId`，并解包 `show.card`。
- 使用 `workboard.cards.claim` 原子领取；领取自动进入 running，并返回仅本机保存的 claim token。
- 执行未开始用 `cards.release(status=ready)`；执行中用 heartbeat；结束用 complete 或 block。
- 每次 Codex Scheduled 自身就是独立执行任务：无卡时轻扫静默，有卡时在本 run 内完整执行；下一小时由 claim 和 ready 过滤去重。
- 真验收中先接受受控 blocked，不能为了得到绿色结果伪造 done。仓库完成 commit/push 后，再使用一张满足同步条件的低副作用卡验证 done。

## 预防规则

1. Workboard 状态转换必须优先使用官方语义方法，不自行挪用状态名当锁。
2. 文档能力、工具暴露和 Scheduled 运行时工具是三件事；必须分别实测。
3. 临时高频验收调度必须先确认单次运行时长，避免一分钟周期形成重叠。
4. 任何解析器至少测试当前真实 list/show 两种 JSON 包装。
5. 任务 claim token 与 SSH 凭据均不得出现在输出、Git、卡片或 automation prompt。
