# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.04

## 项目目标

为薇搭建长期运行的 OpenClaw 多 Agent 系统，组织名为合欢宗，支持 Telegram、任务调度、工程部署、独立审查、生活管理和独立陪伴分支。

## 常驻 Agent

```text
housekeeper       賈南風：大总管、任务所有者与跨 Agent 调度
ops               魚玄機：工程调查、方案、执行与自检
coder             步非煙：隔离代码、脚本与技术产物实现
reviewer          合并审查：Review / Risk / Test
life              蕭觀音：生活主控、提醒和 companion 日常管理
companion-dugu    獨孤伽羅
companion-wu      武曌
companion-lv      呂雉
```

## 当前设计版本

- 賈南風 v1.06；实际部署最后已知仍为 v1.02。
- 蕭觀音 v0.03；尚未部署。
- 魚玄機 v0.05、步非煙 v0.05、reviewer v0.03；均待实际验收。
- 三位 companion 各 v0.01。

## 三个必须区分的对象

1. **Assignment Generation**：当前 Active Handler 的处理权租约；每次交接、改派或恢复递增。
2. **Stage Record**：reviewer 对特定材料和哈希的审查事实；正常预期交接不会抹去它。
3. **Gate Record**：Review/Risk 通过后，只允许一次指定下一角色/阶段和目标 Generation 的凭证；接收确认后消费，不能复用。

材料、命令、配置、权限或环境变化，取消、错误下一跳、过期、已消费或非预期改派都会使 Gate 不可用。

## 工程主线

housekeeper 登记任务并分配 ops → ops 调查和方案 → reviewer.Review → 一次性 coder 实现 Gate → coder 实现 → ops 核对 → reviewer.Review 产物 → 只交付则停止；需执行则 ops 准备执行包 → reviewer.Risk → 一次性 ops 执行 Gate → ops 执行/自检 → reviewer.Test → housekeeper 汇总。

## 生活主线

life 直接主控生活事务、日历、提醒、周期任务、06:00 晨间消息和 companion 日常管理。housekeeper 不重复创建生活自动化，只拥有项目/工程协调和跨域父级自动化。

提醒必须支持持久化、IANA 时区、DST/misfire 策略、幂等 occurrence、有限重试、失败通知和重启恢复；未真实配置前不得声称可靠运行。

## 运行事实

本轮仅修改 GitHub 设计文档，没有连接或修改 NAS。A2A、sandbox、Gate/Stage 持久化、life 会话代理、天气、日历、Telegram、Cron 和提醒可靠性均待真实部署测试。
