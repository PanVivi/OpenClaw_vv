# reviewer｜合并审查｜部署进度

- Agent ID：`reviewer`
- 当前设计版本：v0.03 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前部署状态：`not verified`
- 本轮只修改 GitHub 文档，没有部署 v0.03

## 已完成设计

Review/Risk/Test、Stage Record 审查事实、一次性 Gate Record、指定下一跳/目标 Generation、单次消费、材料变化失效、返工、取消、A2A、独立性和熔断均已定义。

## 待核验

五文件与只读权限；Gate 正常消费、重复/错误目标拒绝；Stage 历史不因预期交接消失；材料变化 stale；方案 Gate 只给 coder、Risk Gate 只给 ops、Test 不生成执行 Gate；完整工程流与生产写入拒绝。

全部通过后才能升级为 `STABLE`。
