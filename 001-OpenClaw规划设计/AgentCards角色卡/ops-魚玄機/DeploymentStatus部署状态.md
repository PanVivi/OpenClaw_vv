# ops｜魚玄機｜部署进度

- Agent ID：`ops`
- 当前设计版本：v0.05 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前运行状态：`partially verified`
- 本轮只修改 GitHub 文档，没有部署 v0.05

## 已完成设计

完整定义调查、方案、执行、自检、处理权代次、一次性 Review/Risk Gate、持久化、取消、降级、A2A、依赖、基线、权限回收和熔断。

## 待核验

五文件与真实权限；Risk Gate 指定 ops 执行代次、单次消费、重复/错误目标拒绝；Review Gate 不能执行；材料变化/取消/改派失效；完整工程流、回滚和 Smoke Test。

全部通过后才能升级为 `STABLE`。
