# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.07

## 当前目标

八 Agent 五文件已完成基础部署。当前目标是用无损增量方式更新角色内容，保留原 transcript、session、个人记忆和 Telegram routing；高级持久化、精细历史授权、跨重启自动续跑、完整记忆和技术子 Agent 后续逐项增强。

## 当前角色

```text
housekeeper       賈南風 v1.09
life              蕭觀音 v0.06
ops               魚玄機 v0.07
coder             步非煙 v0.07
reviewer          夏姬（合并审查）v0.05
companion-dugu    獨孤伽羅 v0.04
companion-wu      武曌 v0.04
companion-lv      呂雉 v0.04
```

## 生活入口

- 少主对賈南風说简单生活问题时，賈南風直接回答。
- 需要提醒、日历、Cron、未来投递、持续跟踪、生活工具或 companion 协调时，转蕭觀音。
- life 是生活自动化唯一执行所有者，但不是所有生活对话的唯一入口。

## 最小部署

八个 Agent、独立 workspace、五文件、模型和最小权限已存在。Telegram 目前只有 ops、housekeeper、life 三条真实 account/binding；其余五个缺 Bot token，不能虚构完成。

工程流程先使用当前会话中的结构化 Task/Review/Risk/Test 记录；没有专用持久化时不跨重启自动续跑。三位 companion 先直接独立陪伴，life 协调和记忆后续增加。

## 后续增强

- Task/Stage/Gate 专用持久化与硬单次消费；
- A2A 消息投递已启用；后续只增强精细历史授权/受限代理；
- life 自动化 DST/misfire/幂等/重试/恢复；
- 技术子 Agent；
- 完整记忆。

增强未完成只限制对应能力，不阻塞八 Agent 基础上线。

任何角色内容更新按 `LosslessContentUpdate无损内容更新任务-v0.01.md` 执行。`sessions.visibility=all` 只用于解析八个固定 Agent 目标，`sessions_history` 保持拒绝；通用部署摘要不得作为个人记忆。
