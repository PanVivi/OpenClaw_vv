# housekeeper｜賈南風｜部署进度

- Agent ID：`housekeeper`
- 当前设计版本：v1.06 `CANDIDATE`
- 当前实际部署版本：v1.02 `STABLE`
- 当前运行状态：`partially completed`
- 本轮只修改 GitHub 文档，没有部署 v1.06

## 已完成设计

完整保留稳定治理、生活分流、任务所有者、处理权代次、自动化唯一所有者和 companion 最小读取；v1.06 新增一次性 Gate Record，修正正常交接导致审查结论自我失效的问题。

## 待核验

- 五文件、SHA-256、模型、Bot、binding、Bootstrap 和真实权限。
- Task Owner、Active Handler、Generation、接收确认和旧处理权撤销。
- Gate Record 生成、指定下一跳、目标 Generation、单次消费、重复消费拒绝、材料变化/取消/错误改派失效。
- 工程全流程、life 自动化唯一所有者、companion 最小读取、A2A、取消、降级、熔断和回滚。

保留 v1.02 回滚基线；全部验收通过后方可升级 v1.06 为 `STABLE`。
