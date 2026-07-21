# ops｜魚玄機｜部署进度

- Agent ID：`ops`
- 当前设计版本：v0.04 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前运行状态：`partially verified`
- 本轮只修改 GitHub 文档，没有部署 v0.04

## 已完成设计

两条工程轨、授权真实性、生命周期、取消、防重复、持久化、依赖降级、会话白名单、外部依赖、并发基线、权限回收、脱敏、熔断，以及 v0.04 的 Task Owner、Active Handler、Assignment Generation、接收确认和旧代次失效均已定义。

## 待核验

- 五文件、SHA-256、模型、Bot、binding、Bootstrap 和真实权限。
- 最新代次接收确认、旧代次执行拒绝、重新分派撤权和跨重启恢复。
- reviewer 结论与 Generation/输入哈希绑定。
- ops/coder/reviewer 完整联动、A2A、子 Agent、生产权限、回滚和 Smoke Test。

完成全部正向与拒绝测试后才能升级为 `STABLE`。
