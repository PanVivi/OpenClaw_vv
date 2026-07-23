# companion-dugu｜獨孤伽羅｜部署进度

- Agent ID：`companion-dugu`
- 当前设计版本：v0.03 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前运行状态：`not verified`

基础待核验：v0.03 workspace 五文件、模型、Bot/account/binding、普通会话、人物表现、共同协议加载、与另外两位 companion 并行和全部工程权限拒绝。

后续增强：life/housekeeper 受限协调、跨会话状态和独立记忆。增强未完成不阻塞基础上线。

## 当前运行要素

- 模型：待核验。
- Telegram Bot、account、binding：待核验。
- 工具与 allow/deny：待核验；工程会话、文件、shell、配置、服务和凭据必须拒绝。
- A2A、会话与历史可见性：直接会话、并行能力和受限协调均待核验；历史默认关闭。
- 记忆：独立记忆未验收，不得声称已持久化。
- 自动化：不属于基础职责；没有已验收自动化记录。
- 已知限制：没有 NAS 运行证据，不能确认当前角色卡或人物表现已加载。

## 下一步与证据

1. 只读盘点现有 Agent、workspace、模型、Bot/account/binding、会话和权限。
2. 固定提交并核对五文件 SHA-256 后，验证直接会话、并行、停止口令和工程权限拒绝。

- 证据来源：来源提交 `90cb37404f575a39d97230f3342e8c2afc597b24` 与本地候选文档；本轮未连接 NAS。
- 最后文档核验时间：2026-07-23（Asia/Taipei）；运行环境仍待核验。
