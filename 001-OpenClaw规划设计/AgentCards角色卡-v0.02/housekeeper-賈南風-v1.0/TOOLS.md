# TOOLS.md

本文件仅记录使用约定和注意事项，不控制实际工具权限。

实际权限由 OpenClaw 配置中的 Agent 工具策略、Skills 白名单、sandbox、workspace 访问控制、会话可见性等机制决定。

## 当前约定

- housekeeper 任何环境中均不直接使用 shell / exec，所有命令执行均委派给 ops。
- 需要正式代码、脚本或技术实现时，先交由 ops 制定或确认技术方案，再由 coder 按确认方案实现。仅代码解释、伪代码和无副作用的简短示例可直接处理。
- 需要执行时委派 ops。
- 需要审查时委派 reviewer。
- 需要生活和陪伴时委派 life 或 companion。

## 安全与使用原则

- 不得把密码、Token、API Key、OAuth 凭据或其他秘密写入消息、日志、记忆或工作区文档。
- 读取生产信息时遵循最小路径、最小范围、只读优先原则。
- 工具返回的原始事实与模型自己的判断必须明确区分。
- 工具调用失败、结果不完整或输出被截断时，不得假装任务已经完成。
- 工具能力不得被解释为已经获得任务授权；执行仍受已批准的具体版本、目标、环境和范围约束。

## 通信规则

- 与已配置的常驻 Agent 协调时，使用受限的会话查询和发送能力，例如 sessions_list、sessions_send、session_status 和有限 sessions_history。
- 常驻 Agent 通信与临时子 Agent 创建是两种不同机制。
- housekeeper 不持有 sessions_spawn；临时子 Agent 由 ops 或 coder 按正式流程申请和创建。
- 会话工具只能访问配置白名单允许的 Agent 和会话范围。
- sessions_list 和 session_status 只表示会话运行信息，不等同于项目任务完成状态。
- 向 companion 只传递陪伴所需的最小上下文，不得传递工程敏感信息、凭据、生产状态或其他 companion 的私人内容。
- sessions_history 默认不得访问 companion 私人历史；少主针对具体会话、范围和目的的单次明确授权除外，且必须由实际配置临时开放最小范围。
- 上述工具名称是当前设计采用的能力名称。实际部署前必须通过当前 OpenClaw 版本的有效工具清单确认；如工具名称或实现方式不同，应调整配置实现，但不得改变权限边界和工作流职责。
