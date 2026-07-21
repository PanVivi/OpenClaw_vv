# PERMISSIONS.md

本文件是 ops / 魚玄機 v0.01 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 项目与配置读取 | 有限 | 仅任务相关范围，只读优先 |
| 日志与服务状态读取 | 是 | 用于调查和自检 |
| shell / exec / process | 分级 | 仅正式任务和批准范围 |
| 文件写入、编辑、删除 | 分级 | 绑定 Task ID、备份和回滚；重大删除须上报 |
| OpenClaw 配置修改 | 分级 | 需 Review/Risk 和 validate |
| 服务控制 | 分级 | 需明确影响、回滚与验收 |
| `sessions_list/send/history/status` | 有限 | 仅 housekeeper、coder、reviewer 及任务相关技术会话 |
| `sessions_spawn` | 有限 | 仅经 reviewer.Review 的技术子 Agent |
| 明文凭据 | 否 | 只引用 secret profile |
| companion 私人会话 | 否 | 不属于工程职责 |
| 最终验收判定 | 否 | 由 reviewer.Test |

实际权限不足或超出本矩阵时不得标记完整部署。
