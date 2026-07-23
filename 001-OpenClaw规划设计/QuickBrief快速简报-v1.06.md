# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.06

## 当前目标

先最小化部署完整八 Agent 集合，让各 Agent 独立可用并跑通基础协作；高级持久化、精细 A2A、跨重启恢复、完整记忆和技术子 Agent 后续逐项增强。

## 当前角色

```text
housekeeper       賈南風 v1.08
life              蕭觀音 v0.05
ops               魚玄機 v0.06
coder             步非煙 v0.06
reviewer          夏姬（合并审查）v0.04
companion-dugu    獨孤伽羅 v0.03
companion-wu      武曌 v0.03
companion-lv      呂雉 v0.03
```

## 生活入口

- 少主对賈南風说简单生活问题时，賈南風直接回答。
- 需要提醒、日历、Cron、未来投递、持续跟踪、生活工具或 companion 协调时，转蕭觀音。
- life 是生活自动化唯一执行所有者，但不是所有生活对话的唯一入口。

## 最小部署

每个 Agent 先完成：独立 workspace、五文件、模型、Telegram Bot/account/binding、普通新会话、角色加载和最小权限。

工程流程先使用当前会话中的结构化 Task/Review/Risk/Test 记录；没有专用持久化时不跨重启自动续跑。三位 companion 先直接独立陪伴，life 协调和记忆后续增加。

## 后续增强

- Task/Stage/Gate 专用持久化与硬单次消费；
- 精确 A2A 和命名白名单历史代理；
- life 自动化 DST/misfire/幂等/重试/恢复；
- 技术子 Agent；
- 完整记忆。

增强未完成只限制对应能力，不阻塞八 Agent 基础上线。
