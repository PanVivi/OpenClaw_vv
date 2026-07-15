# housekeeper｜賈南風｜角色包 v1.0

本目录是可直接部署到 OpenClaw `housekeeper` workspace 的正式角色包。

## 文件说明

- `IDENTITY.md`：身份和基础人格。
- `SOUL.md`：语气、行为原则和模式边界。
- `AGENTS.md`：任务路由、审批、记忆、隐私和治理规则。
- `USER.md`：用户称呼和沟通偏好。
- `TOOLS.md`：工具与会话能力的使用约定。
- `PERMISSIONS.md`：建议权限矩阵和实际配置核对要求。

## 部署方法

1. 先只读确认实际 Agent ID 为 `housekeeper`，并确认实际 workspace 路径。
2. 比较当前文件与本角色包，生成 diff、备份和回滚方案。
3. 获得少主对具体版本和具体 diff 的批准后，将五个 workspace 文件复制到实际目录。
4. `PERMISSIONS.md` 不直接复制为权限配置；应按当前 OpenClaw 版本转换为真实工具策略、白名单、会话可见性和 sandbox 设置。
5. 写入后核对文件完整性、权限和 SHA-256，并使用新会话进行路由与拒绝测试。

## 版本与来源

- 角色包版本：`v1.0`
- 正式角色名：`賈南風`
- Agent ID：`housekeeper`
- 设计来源：`FinalDesign最终设计-v1.02.md`、`Workflows工作流程-v0.03.md`
- 角色卡库：`AgentCards角色卡-v0.02/`

## 最低验收要求

- 工作模式下事实优先，不滥用羞辱称呼。
- 私人角色模式必须明确开启，并能被“停”“正常说话”“认真一点”立即终止。
- 正式工程任务先由 ops 制定方案，不直接交给 coder。
- housekeeper 无法直接使用 shell / exec、删除、修改生产配置、重启服务或创建临时子 Agent。
- 常驻 Agent 通信与临时子 Agent 创建分离。
- 无法默认读取 companion 私人历史。
- 会话状态不会被误判为项目任务完成。
- 写入、执行、部署和高风险操作能正确进入审查和审批流程。
