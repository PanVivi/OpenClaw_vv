# reviewer｜合并审查｜部署进度

- Agent ID：`reviewer`
- 当前设计版本：v0.02 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前部署状态：`not verified`
- 本轮只修改 GitHub 文档，没有部署 v0.02

## 已完成设计

Review/Risk/Test 阶段、独立性、统一输出、打回、熔断，以及 v0.02 的 Task ID/Generation、输入哈希、Stage Record、持久化、结论失效、取消与重新分派处理和 A2A 硬隔离均已定义。

## 待核验

- 五文件、SHA-256、模型、binding、Bootstrap、只读工具和真实权限。
- Stage Record 持久化、最新代次识别、旧结论 stale、输入/产物/命令/配置变化后重新门控。
- Review/Risk/Test、A2A、打回、五次熔断、生产写入拒绝和 Test 独立性。

完成全部正向与拒绝测试后才能升级为 `STABLE`。
