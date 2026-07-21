# PERMISSIONS.md

本文件是 `housekeeper / 賈南風` v1.05 的建议权限矩阵，不是可直接复制的 OpenClaw 配置。

| 权限项 | 建议 | 说明 |
| --- | --- | --- |
| 普通项目读取 | 有限 | 仅任务相关、明确允许的文档或目录，只读 |
| 生产文件读取 | 默认否 | 任务确有需要时按 Task ID、路径、范围和有效期临时开放 |
| 写任务状态 | 有限 | 仅配置指定的任务记录；写 Task ID、所有者、当前处理 Agent、Assignment Generation、输入版本/哈希、状态、去重键和证据位置 |
| 修改其他 Agent 文件 | 否 | 禁止 |
| shell / exec / process | 否 | 全部委派 ops |
| write / edit / apply_patch | 否 | 不直接修改项目或生产文件 |
| 删除文件或数据 | 否 | 不直接执行 |
| 修改 OpenClaw 配置 | 否 | 由 ops 按正式流程处理 |
| 服务控制 | 否 | 由 ops 按正式流程处理 |
| `sessions_list` | 是 | 查看常驻 Agent 与 companion 状态 |
| `sessions_send` | 分级 | 正式任务必须携带最新 Assignment Generation；companion 正常经 life，少主直接要求时才直达 |
| `session_status` | 是 | 不得当作任务完成状态 |
| `sessions_history` | 有限 | 专业 Agent 仅任务必要历史；companion 默认元数据/摘要，完整历史需已登记目的和最小范围 |
| `sessions_spawn` | 否 | 技术子 Agent 由 ops 或 coder 创建 |
| companion 直接联系 | 有限 | 仅少主直接要求时 |
| 生活提醒与个人日程自动化 | 否 | 唯一执行所有者为 life；housekeeper 只发送请求 |
| 项目/工程协调自动化 | 有限 | housekeeper 唯一所有；记录 Automation ID、Generation、去重键和停止条件 |
| 跨域编排自动化 | 有限 | 只拥有父任务，专业子任务分别由对应 Agent 所有 |
| 外部消息写操作 | 分级 | 仅既有关系的状态通知等低风险范围；公开发布和重大承诺上报 |
| 长期记忆写入 | 待单独部署 | 仅已确认长期偏好、稳定事实和有效决定；未配置前不得声称可用 |
| 明文凭据访问 | 否 | 只引用 secret profile 名称 |

## 强制规则

- Assignment Generation 必须由持久化任务记录落实；新代次生效后旧代次的副作用权限立即失效。
- 接收 Agent 未确认最新代次和输入版本前，不能产生写入、执行、发送、部署、测试或创建子 Agent 等副作用。
- life 与 housekeeper 不得同时拥有同一生活提醒或自动化；所有权变更必须递增 Automation Generation 并撤销旧所有者写权限。
- companion 历史不得开放为无目的批量读取；应优先提供状态、标题、摘要和活动元数据。
- 使用精确 allow/deny，不得仅依赖提示词自律。
- 实际权限与本文件不一致时不得声称部署完成。
