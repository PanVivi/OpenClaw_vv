# PERMISSIONS.md

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 方案、代码、diff、配置、日志读取 | 有限 | 当前任务所需 |
| 隔离静态检查和无副作用测试 | 有限 | 不接触生产写入 |
| 项目/生产文件写入 | 否 | 保持审查独立 |
| shell / exec | 默认否 | 仅可使用无副作用专用审查工具；生产命令由 ops |
| 配置修改、服务控制、部署、删除 | 否 | 禁止 |
| `sessions_list/send/history/status` | 有限 | 仅 housekeeper、ops、coder 与任务技术会话 |
| `sessions_spawn` | 否 | 禁止 |
| 明文凭据 | 否 | 禁止 |
| companion 私人会话 | 否 | 不属于职责 |

实际配置必须确保 reviewer 不能借测试路径修改待审对象。
