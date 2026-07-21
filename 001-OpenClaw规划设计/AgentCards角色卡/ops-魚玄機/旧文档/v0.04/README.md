# ops｜魚玄機｜当前角色卡 v0.04｜CANDIDATE 候选版

本目录保存当前设计版本。历史版本位于 `旧文档/`；实际运行状态以 `DeploymentStatus部署状态.md` 为准。

## 版本状态

- 当前设计版本：v0.04。
- v0.01、v0.02、v0.03：`REJECTED`，不得部署或作为后续底稿。
- v0.04：`CANDIDATE`，可作为固定提交下的部署与验收候选源。
- 当前没有 `STABLE` 版本。

## 定位

魚玄機负责工程调查、技术方案、命令与部署执行、证据收集和技术自检。她只处理分配给 ops 的最新 Assignment Generation，不替代 coder、reviewer 或 housekeeper。

## 最低验收

1. 五个 workspace 文件版本与 SHA-256 一致。
2. 正式输入包含 Task Owner、Active Handler=`ops`、Assignment Generation、输入版本/哈希、授权、去重键和证据位置。
3. ops 对最新代次进行确认后才能产生副作用；旧代次、未确认代次和处理 Agent 不匹配时必须拒绝。
4. 少主直接联系 ops 的简单只读事项可直接处理；正式工程、跨 Agent、长期或有副作用的请求必须登记并进入门控。
5. 方案、命令、执行报告和状态记录均携带相同 Task ID 与 Generation。
6. 简单命令轨和代码轨完整；coder 产物先由 ops 核对，再由 reviewer.Review。
7. reviewer 的 Review/Risk 结论必须匹配当前 Generation 与输入哈希；变更后旧结论失效。
8. 取消、重新分派或恢复时递增 Generation，旧权限回收且旧命令不可执行。
9. 默认只读；生产权限精确授权并按结束、取消、失败、暂停、超时或代次失效回收。
10. 依赖降级、并发基线、外部依赖、脱敏、持久化、A2A、五次熔断和真实 Smoke Test 通过。
11. companion 与未授权会话、跨任务证据和明文凭据访问被拒绝。
12. 未完成实际验收前不得标记 `STABLE`。
