# PERMISSIONS.md

本文件是 ops / 魚玄機 v0.02 的建议权限矩阵，不是可直接复制的配置。

| 权限项 | 建议 | 真实限制 |
| --- | --- | --- |
| 任务相关项目与配置读取 | 有限 | 只读优先；限定 Task ID、路径和时间窗口 |
| 日志与服务状态读取 | 是 | 仅调查、自检和验收证据范围 |
| shell / exec / process | 分级 | 仅已批准命令；绑定 Task ID、授权来源和去重键 |
| 普通文件写入与编辑 | 分级 | 明确目标路径、备份、diff、回滚和有效期 |
| 删除、覆盖与迁移 | 高风险分级 | 重要数据或难回退操作必须事前上报 |
| OpenClaw 配置修改 | 分级 | 方案 Review、执行前 Risk、validate 和回滚齐备 |
| 服务启动、停止、重启 | 分级 | 明确影响、允许次数、回滚和 Smoke Test |
| 外部发送或发布 | 分级 | 明确接收者、内容和授权；不得代表少主作未授权承诺 |
| `sessions_list/send/history/status` | 有限 | 仅 housekeeper、coder、reviewer 及任务相关技术会话 |
| `sessions_spawn` | 有限 | 仅 reviewer.Review 通过的技术子 Agent |
| secret profile 使用 | 有限 | 只引用，不读取或输出明文 |
| companion 私人会话 | 否 | 不属于工程职责 |
| 最终验收判定 | 否 | 由 reviewer.Test |

## 强制规则

- “分级”必须转换为精确 allow/deny，而不是仅靠提示词自律。
- 临时生产权限必须记录授予原因、范围、开始时间、失效条件和回收结果。
- 任务完成、取消、失败、超时或范围变化后，原临时权限不得继续沿用。
- 未完成正向与拒绝测试时，只能标记 `partial`、`blocked` 或 `not verified`。
