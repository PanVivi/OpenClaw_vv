# coder｜步非煙｜部署进度

## 当前结论

- Agent ID：`coder`
- 当前设计版本：v0.03 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前部署状态：`not verified`

## 已完成的设计工作

- 五个 workspace 文件和权限矩阵已升级到 v0.03。
- 已明确固定 Git 基线、隔离 workspace、路径写入、并发保护、受限测试、依赖完整性、方案变化、交付持久化、A2A 硬白名单、证据脱敏、返工和五次熔断。
- v0.01、v0.02 已标记 `REJECTED`。

## 待核验

- 固定 Git 提交、实际 workspace 五文件、SHA-256、模型、Bot、binding、Bootstrap 和 sandbox。
- 隔离路径写入、跨任务产物拒绝、并发基线变化时停止覆盖。
- 静态检查、单测和受限构建可用；生产网络、数据、服务、凭据和外部发布被拒绝。
- 外部依赖仅按可信来源、锁定版本、校验值、许可证与批准范围使用。
- 产物、测试证据和交付记录的持久化及跨会话/重启恢复。
- 与 ops、reviewer、housekeeper 的 A2A 命名白名单或受限代理，以及 companion 和未授权历史拒绝。
- ops 方案输入、coder 实现、ops 核对、reviewer.Review、返工、只交付停止和五次熔断流程。
- `sessions_spawn` 仅用于受审查且继承隔离、网络和权限的实现子 Agent。

## 下一步

只读核对运行状态，生成差异、备份、sandbox、精确权限、验证和回滚方案；完成正向与拒绝测试后才能升级为 `STABLE`。

设计完成不等于已部署，未取得实际证据的能力保持 `not verified`。