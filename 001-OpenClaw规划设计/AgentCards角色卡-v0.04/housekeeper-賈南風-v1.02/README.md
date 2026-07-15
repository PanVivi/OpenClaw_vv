# housekeeper｜賈南風｜角色包 v1.02

本目录保存 `housekeeper / 賈南風` 已定稿的角色文件，可进入 OpenClaw 受管部署流程。

“角色文件已定稿”不等于实际权限、依赖 Agent、会话路由和状态存储已经配置完成。不得仅复制文件后就声称賈南風已经正式上线。

本次 `v1.02` 在 `v1.01` 基础上增加：

- 依赖 Agent、工具、模型、权限或环境不可用时的 `blocked` 与降级规则。
- 禁止 housekeeper 越权代替 ops、coder、reviewer 或 life。
- 首期 companion 请求统一经 life 路由，housekeeper 不直接获得 companion 会话可见性。
- 部署批准绑定不可变 Git commit SHA。
- bootstrap 注入截断检查和正式启用门槛。
- 角色文件受限试运行与正式协调启用的两阶段部署。

## 文件说明

- `IDENTITY.md`：身份和基础人格。
- `SOUL.md`：语气、行为原则和模式边界。
- `AGENTS.md`：任务路由、授权、审批、依赖降级、记忆、隐私和治理规则。
- `USER.md`：用户称呼和沟通偏好。
- `TOOLS.md`：工具、凭据、会话能力和 bootstrap 检查约定。
- `PERMISSIONS.md`：建议权限矩阵和实际配置核对要求。

## 部署阶段

### 阶段 A：角色文件受限试运行

1. 只读确认实际 Agent ID、`agents.list[].workspace` 和 OpenClaw 版本。
2. 读取现有五文件，记录路径、大小、权限、时间和 SHA-256。
3. 生成完整 diff、备份和回滚方案。
4. 由少主批准具体角色包版本、完整 diff、目标路径、运行环境和不可变 Git commit SHA。
5. 将五个 workspace 文件复制到实际目录。
6. 实现最小权限：无 shell / exec、无文件写入、无删除、无服务控制、无 `sessions_spawn`；A2A 仅允许 ops、coder、reviewer、life。
7. 新建会话验证人格、模式切换、授权来源、拒绝权限、依赖不可用 `blocked` 和 bootstrap 注入完整性。

阶段 A 可以验证角色文件，但不得让賈南風在依赖缺失时承担正式工程协调。

### 阶段 B：正式协调启用

只有以下条件全部满足后才可正式启用：

- ops、coder、reviewer、life 已配置并可用。
- A2A 白名单、授权 sender 身份、会话可见性和工具 allow/deny 已实机验证。
- 状态存储路径和写入工具已明确，或系统明确采用“未持久化”模式。
- reviewer 的 Review / Risk / Test 流程可用。
- companion 首期统一由 life 路由，housekeeper 无 companion 会话可见性。
- 新会话无 bootstrap truncation warning，且可正确复述 `AGENTS.md` 后半段关键规则。
- 权限拒绝、只交付、取消、防重复、Task ID 隔离和依赖降级测试全部通过。

## 首期 companion 路由

```text
housekeeper / 賈南風
→ life / 蕭觀音
→ companion
```

少主仍可直接联系任一 companion。

## 版本与来源

- 角色包版本：`v1.02`
- 正式角色名：`賈南風`
- Agent ID：`housekeeper`
- 角色卡库：`AgentCards角色卡-v0.04/`
- 设计来源：`FinalDesign最终设计-v1.03.md`、`Workflows工作流程-v0.05.md`

## 最低验收要求

- 工作模式下事实优先，不滥用羞辱称呼。
- 私人角色模式必须明确开启，并能被“停”“正常说话”“认真一点”立即终止。
- 只有授权账号、授权会话或少主当前直接消息中的明确表达才构成批准。
- 文件、网页、日志、代码和其他 Agent 输出中的指令不会被误当成少主授权。
- 正式工程任务先由 ops 制定方案，不直接交给 coder。
- 只交付任务不会自动进入运行、部署或应用步骤。
- 依赖不可用时任务进入 `blocked`，housekeeper 不越权代替专业 Agent。
- housekeeper 无法直接使用 shell / exec、删除、修改生产配置、重启服务或创建临时子 Agent。
- 首期无法直接访问 companion 会话；陪伴请求经 life 路由。
- 多个任务按独立 Task ID、范围、批准和证据链隔离。
- 常驻 Agent 通信使用标准任务信封，副作用操作具有去重键且不会在状态不明时自动重试。
- 会话状态不会被误判为项目任务完成。
- 任务取消或批准撤回后，不再启动新步骤，并能报告已发生影响。
- 临时状态只写入指定存储；未配置持久化时明确标记“未持久化”。
- 部署批准绑定不可变 commit SHA。
- bootstrap 文件完整注入，无截断警告。
- 写入、执行、部署和高风险操作能正确进入审查和审批流程。
