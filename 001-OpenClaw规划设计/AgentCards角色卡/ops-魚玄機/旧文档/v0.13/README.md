# ops｜魚玄機｜当前角色卡 v0.13｜CANDIDATE 候选版

## 版本状态

- 当前设计版本：v0.13；NAS 实际部署版本以 `DeploymentStatus部署状态.md` 为准。
- v0.01—v0.05：`REJECTED`，不得部署或作为后续底稿。
- v0.06：`CANDIDATE`，NAS 当前部署与回滚基线。
- v0.07：`CANDIDATE`，A2A 与记忆隔离设计基线。
- v0.08：`CANDIDATE`，NAS 回滚基线。
- v0.09：`CANDIDATE`，增加 ops 专用 Telegram account/binding 管理能力。
- v0.10：`CANDIDATE`，NAS 当前部署版本；补齐工程总管所需的 workspace 写入和受审 NAS 宿主执行能力。
- v0.11：`CANDIDATE`，停用高频热重载的专用 Telegram 插件，改用 OpenClaw 原生 `channels add` 与 `agents bind`。
- v0.13：`CANDIDATE`，标准运维改为任务级授权；同一任务包内不逐步骤索权，只在严重例外暂停上报。
- 当前没有 `STABLE` 版本。

## 定位

魚玄機负责工程调查、方案、命令/部署执行、证据和技术自检。Assignment Generation 只表示 ops 当前处理权；基础层由当前会话内可核对的任务级 Review/Risk 记录授权指定任务包，增强层再由 Gate Record 承载硬授权。她不替代 coder、reviewer 或 housekeeper。

## 基础上线最低验收

1. 五个 workspace 文件均来自 v0.08 固定提交，SHA-256 与部署清单一致。
2. 只接受 `Active Handler=ops` 的最新 Generation，并完成接收确认。
3. 只读调查可由任务分派直接进入；任何写入/执行必须有当前会话内可核对的任务级 Risk 记录，绑定目标、对象、权限、环境、回滚、唯一下一角色和范围。
4. 同一任务包内的连续步骤、一次必要 reload/restart、验证和可回退修复不重复索权；跨任务复用、错误下一跳、范围变化、取消或上下文丢失必须拒绝并重新 Risk。
5. Review 记录只授权 coder 实现，不得被 ops 当作执行授权。
6. 方案、命令、执行报告和证据绑定 Task ID、当前处理角色、输入/产物版本及适用 Review/Risk 记录。
7. 两条工程轨、ops 核对、产物 Review、只交付停止、Risk、执行、自检和 Test 完整。
8. 取消、防重复、依赖降级、并发基线、熔断、权限回收、companion/明文凭据拒绝正确。
9. 未完成 NAS 验收前不得标记 `STABLE`。

## 后续增强验收

专用 Task/Stage/Gate 持久化、目标 Generation、硬单次消费、跨重启自动续跑、精细 A2A 路由与历史授权、技术子 Agent 分别验收。未完成项不得虚构，但不阻塞基础 ops 上线。

v0.13 不改变人物属性或工程职责。它修正 v0.11 将同一运维目标拆成逐命令 Risk/确认的问题：少主直接任务或 housekeeper 正式委派形成一个任务级授权包，内部 Review/Risk 自动处理，授权包内的核对、备份、最小写入、一次必要重启、验证和同范围可回退修复连续执行。只有目标/身份不明、覆盖冲突、不可逆或记忆损失、范围扩大、基线漂移、连续失败可能扩大故障时暂停上报。任意 Gateway RPC、Cron、跨会话历史、技术子 Agent 和任意外发消息仍不开放。
