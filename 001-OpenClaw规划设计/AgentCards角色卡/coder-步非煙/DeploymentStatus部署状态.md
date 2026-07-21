# coder｜步非煙｜部署进度

## 当前结论

- Agent ID：`coder`
- 当前设计版本：v0.02 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前部署状态：`not verified`

## 已完成的设计工作

- 五个 workspace 文件和权限矩阵已按 v0.02 补齐。
- 已明确隔离 workspace、路径写入、受限测试、方案变化、交付状态、返工和五次熔断。
- v0.01 已标记 `REJECTED`，不得作为部署源。

## 待核验

- 实际 workspace、模型、Bot、binding、sandbox、工具权限和 SHA-256。
- 隔离路径写入与未授权路径拒绝。
- 本地静态检查、单测和受限构建可用，生产网络、数据、服务和凭据访问被拒绝。
- 与 ops、reviewer、housekeeper 的 A2A 和任务历史范围。
- ops 方案输入、coder 实现、ops 对照核对、reviewer.Review、返工和五次熔断流程。
- `sessions_spawn` 是否仅用于受审查、继承隔离和权限的实现子 Agent。
- 只交付任务是否在产物 Review 后停止，不进入执行或部署。

## 下一步

只读核对运行状态，生成差异、备份、sandbox、精确权限、验证和回滚方案；完成正向与拒绝测试后才能升级为 `STABLE`。

设计完成不等于已部署，未取得实际证据的能力保持 `not verified`。
