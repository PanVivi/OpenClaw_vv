# 魚玄機版本状态

| 版本 | 状态 | 正式部署/回滚源 | 说明 |
| --- | --- | --- | --- |
| v0.01—v0.03 | `REJECTED` | 否 | 授权、持久化、隔离、依赖或交接不完整 |
| v0.04 | `REJECTED` | 否 | 将正常 Generation 交接错误地视为审查结论失效，并且五个 workspace 文件版本未全部同步 |
| v0.05 | `REJECTED` | 否 | Gate 语义完整，但仍把持久化、硬单次消费、A2A 和子 Agent 混入基础验收 |
| v0.06 | `CANDIDATE` | NAS 当前回滚基线 | 2026-07-23 从固定提交完成五文件部署，角色包一致性已验证 |
| v0.07 | `CANDIDATE` | 暂否 | 完整继承 v0.06，追加 A2A 传输/历史隔离和个人记忆来源隔离 |
| v0.08 | `CANDIDATE` | NAS 回滚基线 | 接受 housekeeper 正式委派包承载的既有授权；普通转述仍不授权 |
| v0.09 | `CANDIDATE` | NAS 回滚基线 | 增加仅限 ops 的 Telegram account/binding 专用工具；固定目标、secret、owner allowlist、备份、校验、probe 与回滚 |
| v0.10 | `CANDIDATE` | NAS 当前部署 | 补齐 workspace 文件工具与经 `mode=auto` 单次审查的 NAS Gateway `exec/process`；保留 Risk、回滚和危险工具拒绝 |

当前没有 `STABLE` 版本。v0.10 是当前设计与 NAS 部署版本；首次真实账号新增已由 coder account/binding 与通道 probe 验收。
