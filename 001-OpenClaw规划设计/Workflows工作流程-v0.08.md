# 001 OpenClaw架设部署｜Workflows 工作流程｜v0.08

## 一、普通直接交流

- 用户可直接联系任意 Agent。
- 当前 Agent 能可靠直接处理的简单、单一、无副作用事项直接完成。
- 不因领域标签机械转交。

## 二、生活流程

```text
简单生活问题对賈南風提出
→ 賈南風直接回答

需要提醒/日历/Cron/未来投递/持续跟踪/生活工具/companion 协调
→ 賈南風向蕭觀音发送一次结构化请求
→ 蕭觀音核对真实工具
→ 成功则返回真实任务标识；不可用则 blocked
```

life 是生活自动化唯一执行所有者；housekeeper 不创建副本。转交状态不明时先查询，不重复发送。

## 三、基础工程流程

```text
housekeeper 整理目标和范围
→ ops 只读调查并出方案
→ reviewer.Review
→ coder 实现
→ ops 对照方案核对
→ reviewer.Review 产物
→ 只交付则停止
→ 需执行时 reviewer.Risk
→ housekeeper 决策
→ ops 执行与自检
→ reviewer.Test
→ housekeeper 汇总
```

Task ID、材料版本、Review/Risk 结论和下一角色可先记录在当前正式会话。没有专用持久化时不得跨重启自动续跑。

## 四、companion

三位 companion 可直接与用户独立交流并同时运行。life 协调不可用时不影响直接会话。housekeeper 只有用户直接要求时才直达指定 companion。

## 五、取消与故障

取消后停止未开始步骤；在途操作先核对。工具不可用只阻塞对应分支。状态不明不自动重复副作用。高级能力未部署不得虚构，但不冻结基础 Agent。
