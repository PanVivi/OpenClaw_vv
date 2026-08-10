# OpenClaw 最终设计｜v1.12｜任务系统收口增量

本文件完整继承 v1.11，以下内容为新的权威增量。

## 1. 确定性入口

owner Telegram 消息先由插件 hook 建立持久 inbox，再按内容进入普通会话、晨报模块、简单任务、受治理变更或研究/计划/三审工作流。角色记忆与 Skill 只帮助理解，不再承担“记得触发工作流”的责任。

跨轮正式任务建立一个 managed 父 Task Flow；执行工作使用真实 Workboard 卡和 OpenClaw 自动生成的 Task/mirrored Flow，不复制第二条 Task。父项只有在真实终态、proof、验收、文档和同步都满足后才能等待最终通知。

## 2. 晨间玉简与转交

2026-08-04 11:54 华丽定稿仍是唯一输出合同。八模块使用同一 owner 输入状态与日投影；蕭觀音直接写入，賈南風只能提交持久 handoff。目标角色 accept 且专用工具留下成功收据后才是 applied。日程默认提前 60 分钟提醒。

## 3. 风险与用户语言

魚玄機的 `exec/process` 低风险自动；中风险先完成内部范围、备份和回滚预检再自动；高风险在副作用前按动作指纹只询问一次。角色回复必须说清目标、直接影响、最坏情况、回退、替代与准确决定，不使用原生审批卡或内部工程字段。

## 4. 调度与恢复

新控制器使用生命周期 hook、直接官方 API 和 gateway 启动 reconcile，不以每分钟空转制造 Task。旧 Workboard Dispatch/Relay 定义保留但 disabled；恢复时按备份 manifest 恢复原开关。历史 Task、Flow、Workboard 卡和 unknown 投递均不删除、不盲重发。

## 5. 当前边界

真实 owner 入站更新不能由管理员 CLI 伪造；下一条真实用户消息用于自然观察。OpenClaw 2026.7.1-2 仍没有通用 Task/Flow mutation Hook，本设计使用现有 plugin lifecycle hook 与受管状态闭环。完整线上回滚重启需独立维护窗口和一次高风险同意。
