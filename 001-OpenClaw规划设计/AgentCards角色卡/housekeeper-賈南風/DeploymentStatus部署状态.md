# housekeeper｜賈南風｜部署进度

- Agent ID：`housekeeper`
- 当前设计版本：v1.07 `CANDIDATE`
- 当前实际部署版本：v1.02 `STABLE`
- 当前运行状态：`partially completed`
- 本轮只修改 GitHub 文档，没有部署 v1.07

## 本轮设计修正

- 简单生活问答由賈南風直接回答；提醒、日历、设置、定时、未来投递、持续跟踪和 companion 协调转交蕭觀音。
- life 仍是生活自动化唯一执行所有者，但不是所有生活对话的唯一入口。
- Task / Stage / Gate 在基础部署中可使用当前会话结构化记录；专用持久化和硬单次消费改为后续加固。
- 技术子 Agent、完整记忆和精细跨会话历史不再阻塞八 Agent 基础上线。

## 基础部署待核验

- v1.07 五文件、SHA-256、模型、Bot、binding 和 Bootstrap。
- 简单生活直接回答、复杂生活任务单次转交、转交失败不虚构。
- housekeeper 无 shell、项目写入、删除、配置、服务控制和 `sessions_spawn`。
- 当前会话内的基本工程路由、Review/Risk/Test、取消和防重复。

## 后续增强

- Task/Stage/Gate 专用持久化、硬单次消费和跨重启恢复。
- 精确 A2A 历史隔离、完整记忆和高级自动化。

保留 v1.02 回滚基线；基础部署通过前不得升级为 `STABLE`。
