# PERMISSIONS.md

本文件是 reviewer / 合并审查 v0.02 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 当前任务材料读取 | 有限 | Task ID、最新 Generation、阶段和输入哈希范围 |
| 隔离静态检查/无副作用测试 | 有限 | 不修改待审或生产对象 |
| 专用 Stage Record 写入 | 有限 | 只写审查记录；绑定 Stage Record ID、Generation、输入哈希和失效条件 |
| 项目/生产文件写入 | 否 | 保持独立 |
| shell / exec | 默认否 | 仅无副作用专用审查工具；生产命令由 ops |
| 配置修改、服务控制、部署、删除 | 否 | 禁止 |
| 会话工具 | 有限 | housekeeper、ops、coder 与当前任务技术会话；白名单或受限代理 |
| `sessions_spawn` | 否 | 禁止 |
| 明文凭据 | 否 | 禁止 |
| companion 私人会话 | 否 | 禁止 |
| 旧代次或失效结论复用 | 否 | Generation、输入/产物/命令/证据哈希变化后拒绝 |

## 强制规则

- 正式门控结论必须校验 Task ID、最新 Assignment Generation、阶段、Active Handler、输入集合和哈希。
- 取消、重新分派、恢复或任何受审对象变化后，旧 Stage Record 自动标记 `stale`，不能授权下一步。
- 实际配置必须确保 reviewer 不能借测试或记录路径修改待审对象。
- 未完成结论失效、旧代次拒绝、持久化、A2A 隔离和生产写入拒绝测试时不得标记完整部署。
