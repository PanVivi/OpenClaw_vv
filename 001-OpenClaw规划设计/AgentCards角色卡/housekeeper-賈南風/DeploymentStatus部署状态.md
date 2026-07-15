# housekeeper｜賈南風｜部署进度

## 当前结论

- Agent ID：`housekeeper`
- 当前设计版本：v1.04
- 当前 NAS 已部署版本：v1.02
- 当前运行状态：`partially completed`
- 当前模型：`custom-1/gpt-5.6-luna`
- 最后已知状态来源：既有部署验收记录与 `CurrentProgress当前进度-v0.03.md`

## 已完成

- v1.02 的五个 workspace 文件已部署并完整加载。
- 身份、称呼、低风险自主决策、重大风险上报、工程路由、取消、防重复和熔断规则已通过基础验收。
- `sessions_list`、`sessions_send`、`sessions_history`、`session_status`、`cron`、`memory_search`、`memory_get` 在工具层已开放。
- shell、exec、process、普通文件写入、OpenClaw 核心配置修改、服务控制和 `sessions_spawn` 已禁止。
- Gateway、Telegram 和基础对话未发现由该角色部署引入的新异常。

## 未完成或受阻

- 全局 `tools.agentToAgent.enabled=false`，导致跨 Agent 发送不能实际完成。
- 全局 `tools.sessions.visibility=tree`，导致无法读取其他常驻 Agent 的必要历史。
- companion 的实际协调能力因此尚未完整实现。
- 分级外部消息能力尚未完成运行时验收。
- v1.04 尚未写入 NAS，也未完成 Bootstrap、权限、A2A、记忆和回归验收。
- v1.04 要求的专用长期记忆写入尚未配置。

## 下一步

1. 保留 v1.02 五文件和配置作为回滚基线。
2. 独立审查并配置最小范围 A2A 与必要 session visibility。
3. 配置仅限 housekeeper 的专用长期记忆区域或记忆插件。
4. 部署 v1.04 五个 workspace 文件。
5. 创建普通新会话，完成治理规则、正反向权限、跨 Agent、记忆和回滚验收。
6. 全部通过后，才把“当前已部署版本”更新为 v1.04。

## 接手注意

- GitHub 的当前设计版本不等于 NAS 已部署版本。
- `sessions_send` 工具可见不等于跨 Agent 发送已经可用。
- 不得在未完成真实测试前把状态改为 `completed`。
- 本文件是当前部署状态的唯一入口；历史角色目录中的旧状态快照不代表当前状态。