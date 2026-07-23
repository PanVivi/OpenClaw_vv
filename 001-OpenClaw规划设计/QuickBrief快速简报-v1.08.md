# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.08

## 当前目标

八 Agent 五文件已完成基础部署。当前目标是按无损增量方式部署仓库新版本，保留 transcript、session、个人记忆和现有 Telegram routing；不建设新的任务控制服务或扩大权限。

## 当前角色

```text
housekeeper       賈南風 v1.10
life              蕭觀音 v0.07
ops               魚玄機 v0.11（NAS v0.10）
coder             步非煙 v0.07（NAS v0.06）
reviewer          夏姬（合并审查）v0.05（NAS v0.04）
companion-dugu    獨孤伽羅 v0.04（NAS v0.03）
companion-wu      武曌 v0.04（NAS v0.03）
companion-lv      呂雉 v0.04（NAS v0.03）
```

## 当前运行

- Telegram：八条 account/binding 与八个有效 Bot probe 均存在。ops、housekeeper、life、reviewer、companion-wu、companion-lv 六条 connected 正常；coder 与 companion-dugu 因连续热重载触发 `channel stop timed out`，等待一次完整 Gateway 重启后复验。
- A2A：八 Agent 主动双向消息已开放，visibility 为 `all`；不开放 `sessions_history`。
- Sandbox：仅 coder 开启且容器运行；其他七个关闭。
- 自动化：life 的 CodexResetWatcher 每 30 分钟运行，最近一次成功。
- 插件：`life-automation` 与 `housekeeper-async-dispatch` 已加载；`ops-telegram-admin` 已停用。
- 魚玄機：保留受审 Gateway `exec/process`，Telegram 后续使用 OpenClaw 原生 `channels add` 与 `agents bind`。

## 生活入口

- 少主对賈南風说简单生活问题时，賈南風直接回答。
- 需要提醒、日历、Cron、未来投递、持续跟踪、生活工具或 companion 协调时，转蕭觀音。
- life 是生活自动化唯一执行所有者，但不是所有生活对话的唯一入口。

## 后续最小工作

1. 按无损更新任务部署魚玄機 v0.11 及其他尚未同步的角色卡。
2. 完成一次完整 Gateway 重启，复验 coder 与 companion-dugu，并逐个完成八 Bot 真实收发。
3. 高级任务持久化、精细历史授权、技术子 Agent 和完整记忆保持后续增强。

任何角色内容更新按 `LosslessContentUpdate无损内容更新任务-v0.01.md` 执行。通用部署摘要不得作为个人记忆。
