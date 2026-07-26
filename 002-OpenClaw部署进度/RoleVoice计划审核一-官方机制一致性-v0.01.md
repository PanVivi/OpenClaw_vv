# 角色表达修复计划审核一｜官方机制一致性｜v0.01

审核对象：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.12.md`

## 独立审核范围

只审核 OpenClaw bootstrap、角色文件职责、子 Agent 上下文和外发消息机制，不评价回滚和测试充分性。

## 结论

`PASS（修订后）`

## 发现与修订

- 根因层级正确：模型生成回复与不经过模型的 Relay 固定模板是两个故障面，只改角色卡不能修复 Relay。
- 文件选择正确：人格和语气进入 `SOUL.md`，可执行规范进入 `AGENTS.md`，身份沿用 `IDENTITY.md`；没有新建非官方固定 bootstrap 的 `STYLE.md`。
- 全局 Hook 被正确排除：全局改写八角色自由文本会扩大影响范围并可能损坏事实。
- 原计划遗漏子 Agent 的精简 bootstrap。已补为：`AGENTS.md` 必须独立包含少主沟通规则，不得只引用 `SOUL.md`。
- 原计划只验证了贾南风 workspace。已补为：八个 Agent 的新 session 都必须核对真实 workspace、文件注入和零截断。

依据：

- https://docs.openclaw.ai/concepts/system-prompt
- https://docs.openclaw.ai/concepts/agent
- https://docs.openclaw.ai/agent-workspace
- https://docs.openclaw.ai/plugins/hooks
- https://github.com/openclaw/openclaw/blob/main/docs/reference/templates/SOUL.md
