# coder｜步非煙｜部署进度

- Agent ID：`coder`
- 当前设计版本：v0.04 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前部署状态：`not verified`
- 本轮只修改 GitHub 文档，没有部署 v0.04

## 已完成设计

隔离实现、路径/网络边界、并发保护、依赖完整性、取消、降级、持久化、A2A、脱敏、返工、熔断，以及 v0.04 的 Task Owner、Active Handler、Assignment Generation、接收确认、产物哈希交接和旧代次失效均已定义。

## 待核验

- 五文件、SHA-256、模型、Bot、binding、Bootstrap、sandbox 和真实权限。
- ops→coder、coder→ops 的代次递增、接收确认、旧代次写入拒绝和跨重启恢复。
- reviewer 结论与 Generation、方案/产物哈希绑定。
- 隔离写入、生产拒绝、依赖、测试、子 Agent、只交付停止和五次熔断。

完成全部正向与拒绝测试后才能升级为 `STABLE`。
