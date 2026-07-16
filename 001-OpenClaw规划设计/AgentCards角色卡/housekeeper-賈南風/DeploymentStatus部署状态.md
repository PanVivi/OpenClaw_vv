# housekeeper｜賈南風｜部署进度

## 当前结论

- Agent ID：`housekeeper`
- 当前设计版本：v1.04 `CANDIDATE`（候选版）
- 当前实际部署版本：v1.02 `STABLE`（稳定版）
- 当前运行状态：`partially completed`
- 最后已知模型：`custom-1/gpt-5.6-luna`，部署前需从 NAS 重新核验
- 实际 workspace：待从 NAS 重新核验
- Telegram Bot / account / binding：待从 NAS 重新核验
- 当前设计来源：本分支当前 `housekeeper-賈南風/` 五个 workspace 文件
- 当前配置版本或 SHA：待从 NAS 重新核验
- 最近已知验收：v1.02 基础角色与治理验收；具体 Change ID 待从验收记录核对
- 最后文档核验：2026-07-16（America/Los_Angeles）
- 运行时最后核验：沿用既有部署验收记录；本次文档修正未连接 NAS 复测

## 已完成

- v1.02 五个 workspace 文件已部署并完整加载。
- 身份、称呼、低风险自主决策、重大风险上报、工程路由、取消、防重复和五次熔断通过既有基础验收。
- 工具层曾显示 `sessions_list`、`sessions_send`、`sessions_history`、`session_status`、`cron`、`memory_search`、`memory_get`；工具可见不代表真实调用已经成功。
- shell、exec、process、普通文件写入、OpenClaw 核心配置修改、服务控制和 `sessions_spawn` 的既有禁止状态有历史记录；部署 v1.04 时必须重新做拒绝测试。
- v1.04 文档已恢复 v1.02 的工程双审、简单命令轨、代码/脚本轨、任务状态机、取消撤权、临时技术子 Agent 防护、外部消息和凭据规则。

## 未完成或受阻

- 全局 `tools.agentToAgent.enabled=false` 的最后已知状态导致跨 Agent 发送不能实际完成；需重新核验当前配置。
- 全局 `tools.sessions.visibility=tree` 的最后已知状态导致其他常驻 Agent 必要历史不可读；需重新核验当前配置。
- companion 实际协调能力未完成验收。
- 分级外部消息能力未完成运行时验收。
- v1.04 尚未写入 NAS，也未完成 Bootstrap、权限、A2A、会话、回归和回滚验收。
- 完整记忆插件、实际工具名称、housekeeper 独立命名空间、纠正/删除/失效机制尚未确定；该部分另立部署任务。

## 下一步

1. 保留 v1.02 `STABLE` 五文件和配置作为生产回滚基线。
2. 只读核对 workspace、模型、Bot、account、binding、配置版本、A2A、session visibility 和现有工具。
3. 独立设计并配置最小范围 A2A 与必要会话能力。
4. 将完整记忆插件和隔离方案作为单独部署任务设计、审核和测试。
5. 通过文档继承检查后，部署 v1.04 `CANDIDATE` 五个 workspace 文件并创建普通正式新会话。
6. 完成治理规则、正反向权限、跨 Agent、外部消息和回滚验收。
7. 全部通过后，才可将 v1.04 状态升级为 `STABLE`，并更新当前实际部署版本。

## 证据原则

- GitHub 设计完成不等于 NAS 已部署。
- 工具可见不等于调用成功，会话在线不等于任务完成。
- 未取得 NAS 配置、运行日志、Telegram 投递或真实工具测试证据的字段必须保持“待核验”。
- 本文件是当前部署状态唯一入口；历史角色目录中的状态只可作为历史证据。