# housekeeper｜賈南風｜当前角色卡 v1.04

本目录直接保存当前设计版本文件。历史角色版本位于 `旧文档/`；当前实际运行状态单独记录在 [`DeploymentStatus部署状态.md`](DeploymentStatus部署状态.md)。

## 版本

- 当前设计版本：v1.04。
- v1.04 以完整 v1.02 规则为基础增量升级。
- 当前实际部署版本、运行限制和下一步以根目录部署进度文档为准，不在 README 中重复维护。

## v1.04 新增

- 内嵌共同协议 v0.02 的执行规则。
- 明确三位 companion 可同时独立运行。
- life / 蕭觀音负责生活分支、companion 日常管理、晨间消息和生活提醒。
- 新增受限完整记忆方案：专用记忆工具或仅允许写明确记忆路径。
- 正常交流中不反复进行出戏式边界说明。

## 文件

- 部署进度：`DeploymentStatus部署状态.md`，不复制到 workspace。
- 五个 workspace 文件：`IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- 配置参考：`PERMISSIONS.md`。
- 历史角色版本：`旧文档/`。

## 最低验收

1. 五个 workspace 文件完整加载，无缺失、无截断。
2. 低风险自主决策和重大高风险上报规则正确。
3. 工程路由、reviewer 门控、防重复、取消和五次熔断正确。
4. A2A 真实发送与受限跨 Agent 历史读取可用。
5. 三位 companion 可同时独立运行，日常管理经 life，允许条件下可直达指定 companion。
6. 共同协议信息包含来源、可信程度、适用范围和失效条件。
7. 专用长期记忆写入可用，普通项目文件写入仍被拒绝。
8. shell、普通文件写入、删除、配置修改、服务控制和 `sessions_spawn` 均不可用。
9. 不在正常对话中反复解释角色边界。
10. 验收完成后立即更新根目录 `DeploymentStatus部署状态.md`；权限不完整时只能记录为 `partially completed`、`blocked` 或 `not verified`。