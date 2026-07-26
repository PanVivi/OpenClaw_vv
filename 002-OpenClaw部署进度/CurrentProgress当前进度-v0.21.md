# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.21

核验时间：2026-07-23 23:42 +08:00  
分支：`agent/lossless-content-update`

## 本版增量

- 已修复正式委派后执行 Agent重复索权：少主直接任务或賈南風字段完整、范围不变的正式委派包均承载一次任务级授权。
- 已部署 `housekeeper-async-dispatch 1.2.2`：A2A 委派立即返回，持久跟踪 Task ID 和首次回报期限，超时/blocked 主动向原会话上报；超期告警明确区分“未回报”和“执行失败”。
- 已部署 `ops-token-intake 1.0.1`：在模型和日志脱敏前接收少主发给 ops 的 Bot Token，只向魚玄機提供 opaque `tokenFile` handle；原生 account/binding 流程不变。
- 已清理旧 `ops-telegram-admin` 的配置登记，源文件只保留为历史；`openclaw config validate` 通过且零 warning。
- 已验证 Gateway `active/running`、connectivity `ok`，8 个 Telegram account probe 均为 `works / audit ok`。
- 已用生产 Agent 实测 housekeeper、ops、coder、reviewer、life 的职责工具，全部零失败、零重复索权。
- 真实 A2A Task `TEST-DELEGATE-004` 已从 accepted/waiting 自动闭环为 completed，主会话未阻塞。
- 未改 Telegram binding、已有 session/transcript、个人记忆、角色身份或人格。

## 当前插件

| 插件 | 状态 | 版本 |
| --- | --- | --- |
| housekeeper-async-dispatch | enabled | 1.2.2 |
| ops-token-intake | enabled | 1.0.1 |
| life-automation | enabled | 1.0.0 |
| ops-telegram-admin | disabled，且不再登记于生产配置 | 1.0.0 历史源 |

## 已知观察

- `custom-1`、`custom-2` 当前存在上游 503；系统回退到 DeepSeek 后任务完成。该项未误判为角色权限问题，也未在本轮扩展修改模型路由。
- 新 Bot Token 的真实入站端到端验收需在下一次正常绑定任务中完成；当前已通过 hook 集成、并发、去重、生产加载和生产工具调用测试。

完整证据见 `PermissionDelegationTokenContinuity权限委派凭据连续性报告-v0.01.md`。
