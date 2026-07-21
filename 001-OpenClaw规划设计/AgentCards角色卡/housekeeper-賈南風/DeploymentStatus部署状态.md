# housekeeper｜賈南風｜部署进度

## 当前结论

- Agent ID：`housekeeper`
- 当前设计版本：v1.05 `CANDIDATE`
- 当前实际部署版本：v1.02 `STABLE`
- 当前运行状态：`partially completed`
- 最后已知模型：`custom-1/gpt-5.6-luna`，需从 NAS 重新核验
- 本轮仅修改 GitHub 设计文档，没有部署 v1.05

## 已完成的设计工作

- 完整继承 v1.02 稳定治理基线和 v1.04 有效增量。
- 新增 Task Owner、Active Handler、Assignment Generation、接收确认和旧代次自动失效。
- 明确生活自动化唯一由 life 执行，housekeeper 只拥有项目、工程协调和跨域父级编排。
- 明确 companion 元数据优先与最小必要历史读取。

## 待核验

- NAS 实际 workspace、五文件 SHA-256、模型、Bot、binding、Bootstrap 和权限。
- 任务记录是否支持所有者、处理 Agent、代次、输入版本、确认和撤权。
- 直接联系专业 Agent 后正式任务是否能够登记并进入门控。
- life 与 housekeeper 自动化唯一所有者、重复创建拒绝和所有权转移。
- companion 元数据读取、最小历史读取和无关批量读取拒绝。
- 既有治理、A2A、取消、降级、熔断、外部消息和回滚回归测试。

## 下一步

保留 v1.02 回滚基线；只读盘点 NAS 后，按固定提交部署 v1.05 候选版并完成正向、拒绝、恢复、交接和回滚测试。全部通过后方可升级为 `STABLE`。
