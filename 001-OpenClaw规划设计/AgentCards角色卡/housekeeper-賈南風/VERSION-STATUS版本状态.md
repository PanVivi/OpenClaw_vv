# 賈南風版本状态

| 版本 | 状态 | 可否作为部署源 | 说明 |
| --- | --- | --- | --- |
| v1.02 | `STABLE` | 是 | 当前实际部署与生产回滚基线 |
| v1.03 | `REJECTED` | 否 | 精简导致治理规则丢失 |
| v1.04 | `REJECTED` | 否 | 恢复治理基线，但跨角色交接不完整 |
| v1.05 | `REJECTED` | 否 | 引入 Assignment Generation，但把正常交接与审查结论失效混淆，形成门控悖论 |
| v1.06 | `CANDIDATE` | 暂否 | 分离处理权 Generation 与一次性 Gate Record，等待部署验收 |

当前实际部署仍为 v1.02。
