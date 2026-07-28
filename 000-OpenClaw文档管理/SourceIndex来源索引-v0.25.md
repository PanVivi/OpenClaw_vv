# 000 OpenClaw文档管理｜SourceIndex 来源索引｜v0.25

## v0.25 萧观音少主专属资料区来源

### OpenClaw 官方

- Building Plugins：<https://docs.openclaw.ai/plugins/building-plugins>
- Plugin Tool Registration：<https://docs.openclaw.ai/plugins/tool-plugins>
- Plugin SDK Overview：<https://docs.openclaw.ai/plugins/sdk-overview>
- Tool Permission Modes：<https://docs.openclaw.ai/tools/permission-modes>
- Gateway Tools Invoke API：<https://docs.openclaw.ai/gateway/tools-invoke-http-api>
- Bash Tool：<https://docs.openclaw.ai/bash>
- Gateway Security：<https://github.com/openclaw/openclaw/blob/main/docs/gateway/security/index.md>

### 项目与生产证据

- 修复计划：`002-OpenClaw部署进度/LifeOwnerFiles萧观音少主专属资料区修复计划-v0.01.md`
- 计划验证：`002-OpenClaw部署进度/LifeOwnerFiles萧观音少主专属资料区计划验证-v0.01.md`
- 插件源码：`001-OpenClaw规划设计/Plugins插件/life-memo/`
- 修复与验收报告：`002-OpenClaw部署进度/LifeOwnerFiles萧观音少主专属资料区修复与验收报告-v0.01.md`
- 生产基线备份：`/Volume3/OpenClaw/home/.openclaw/backups/life-memo-permission-20260728T132528Z`
- 生产升级备份：`/Volume3/OpenClaw/home/.openclaw/backups/life-memo-permission-20260728T133533Z`

## v0.24 Codex 任务面板来源

### OpenAI / Codex 官方

- Scheduled tasks：<https://learn.chatgpt.com/docs/automations>
- Git worktrees：<https://learn.chatgpt.com/docs/environments/git-worktrees>

### OpenClaw 官方

- Workboard：<https://docs.openclaw.ai/plugins/workboard>
- Workboard CLI：<https://docs.openclaw.ai/cli/workboard>
- Automation：<https://docs.openclaw.ai/automation>
- Background Tasks：<https://docs.openclaw.ai/automation/tasks>
- Cron：<https://docs.openclaw.ai/automation/cron-jobs>
- Subagents：<https://docs.openclaw.ai/tools/subagents>
- ACP agents：<https://docs.openclaw.ai/tools/acp-agents>
- OpenAI provider：<https://docs.openclaw.ai/providers/openai>

### GitHub 与社群风险线索

- OpenClaw issue #43367：共享 session 并发与锁竞争。
- OpenClaw issue #44198：ACP queue owner 生命周期故障。
- OpenClaw issue #82368：升级后的 Codex plugin/runtime 配置迁移问题。
- Reddit Workboard、长任务与 Codex/OpenClaw 讨论：只用于通知、轮询、上下文和重复消耗的风险提示；配置结论以官方资料、源码与现场证据为准。

## v0.23 新增来源

### OpenClaw 官方

- System Prompt：<https://docs.openclaw.ai/concepts/system-prompt>
- Agent Runtime：<https://docs.openclaw.ai/concepts/agent>
- Context：<https://docs.openclaw.ai/concepts/context>
- Agent Workspace：<https://docs.openclaw.ai/agent-workspace>
- Plugin Hooks：<https://docs.openclaw.ai/plugins/hooks>
- 官方 SOUL 模板：<https://github.com/openclaw/openclaw/blob/main/docs/reference/templates/SOUL.md>

### OpenClaw GitHub

- per-agent workspace / SOUL 已知问题：<https://github.com/openclaw/openclaw/issues/61117>
- Hook 覆盖人格行为讨论：<https://github.com/openclaw/openclaw/issues/8776>

### 社群交叉印证

- SOUL 与 AGENTS 的分工：<https://www.reddit.com/r/openclaw/comments/1rjp47d/here_is_the_soul_of_my_agent/>
- STYLE 文件实践：<https://www.reddit.com/r/openclaw/comments/1rfwkeu/i_made_12_openclaw_soulmd_stylemd_templates_heres/>
- 具体语言规则优于泛化要求：<https://www.reddit.com/r/openclaw/comments/1riixrl/the_difference_between_a_soulmd_that_works_and/>
- 模型对人格表达的影响：<https://www.reddit.com/r/openclaw/comments/1radmmv/switched_over_to_openai_models_but_the_bot_feels_soulless_now/>

社群资料只作实施细节交叉印证；正式设计以 OpenClaw 官方机制、项目原角色卡和生产实测为准。

### 现场证据

- NAS 备份：`/Volume3/OpenClaw/home/.openclaw/backups/role-voice-relay-20260726T125033+0800`
- 正式计划：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.12.md`
- 三轮独立审核：`002-OpenClaw部署进度/RoleVoice计划审核*.md`
- 验收报告：`002-OpenClaw部署进度/RoleVoice角色表达与通知修复部署报告-v0.01.md`
- 事故经验：`003-OpenClaw事故经验/RoleVoiceEngineeringLeak角色表达工程字段泄露-v0.01.md`
- Relay：`001-OpenClaw规划设计/Automation自动化/WorkboardNotificationRelay.mjs`

## 当前权威入口

- 根说明：`README.md`
- 项目规则：`AGENTS.md`
- 文档规则：`000-OpenClaw文档管理/DocumentRules文档编号规则-v1.05.md`
- 当前进度：`002-OpenClaw部署进度/CurrentProgress当前进度-v0.27.md`
- 最终设计：`001-OpenClaw规划设计/FinalDesign最终设计-v1.09.md`
- 工作流：`001-OpenClaw规划设计/Workflows工作流程-v0.10.md`
- 部署方案：`001-OpenClaw规划设计/DeploymentPlan部署方案-v0.12.md`
- 无损更新：`002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md`
- 角色卡：`001-OpenClaw规划设计/AgentCards角色卡/`
- 共同协议：`001-OpenClaw规划设计/AgentCards角色卡/共同协议/SharedProtocol共同协议.md`

## 当前角色版本

賈南風 v1.15、魚玄機 v0.17、蕭觀音 v0.12、步非煙 v0.11、夏姬 v0.09、獨孤伽羅/武曌/呂雉 v0.08。

## v0.22 及以前完整继承

v0.22 的工作流可靠性资料、v0.21 的 X/CodexResetWatcher 双源资料、v0.20 的 Workboard/Tasks/Task Flow/Subagents/Standing Orders/Lobster/OpenProse/Agent Teams RFC，以及更早的权限、安全、角色和部署资料全部继续有效。完整历史原文保留于旧版本，本版不删除或替代原设计。
