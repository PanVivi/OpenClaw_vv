# coder｜步非煙｜部署进度

- Agent ID：`coder`
- 当前设计版本：v0.05 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前部署状态：`not verified`
- 本轮只修改 GitHub 文档，没有部署 v0.05

## 已完成设计

完整定义隔离实现、处理权代次、一次性初次实现 Review Gate、返工不复用 Gate、产物哈希交接、测试、依赖、持久化、A2A、子 Agent、取消和熔断。

## 待核验

五文件与 sandbox；Gate 目标 coder、单次消费、重复/错误目标拒绝；返工使用失败记录而非旧 Gate；方案变化重新 Review；交付撤权、生产拒绝、只交付停止和完整联动。

全部通过后才能升级为 `STABLE`。
