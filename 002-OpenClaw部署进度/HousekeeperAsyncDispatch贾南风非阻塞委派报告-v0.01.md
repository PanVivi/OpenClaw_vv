# 002 OpenClaw架设部署｜Housekeeper Async Dispatch 贾南风非阻塞委派报告｜v0.01

- 部署时间：2026-07-23
- 目标环境：OpenClaw 2026.7.1-2 / Node.js 22.22.3
- 插件版本：`housekeeper-async-dispatch` 1.0.0
- 状态：`VERIFIED`

## 问题

贾南风在少主 Telegram 会话中委派任务后，会使用 `sessions_send` 同步等待执行 Agent。旧 transcript 已证实多次使用 `timeoutSeconds=120/180/300`，并在失败后连续重发。等待期间同一 Telegram session key 仍有活动 run，后续消息只能等待该 run 结束。

现场配置 `agents.defaults.maxConcurrent=4`，因此根因不是全局并发数不足，而是同一 session lane 的单写者串行和同步工具等待叠加。

## 联网与源码核验

- OpenClaw 对同一 session key 串行执行，避免 transcript 与工具结果竞争；不同 session 可受 `agents.defaults.maxConcurrent` 控制并行。
- `sessions_send(timeoutSeconds: 0)` 是官方 fire-and-forget 模式：任务入队后立即返回 `accepted`。
- 目标 Agent 在独立 nested session lane 中执行；完成后通过内置 announce/reply-back 推送。
- `steer` 不能中断正在执行的工具调用，因此只调整 Telegram queue mode 不能解决同步等待。
- 当前安装源码使用按目标 session key 划分的 `nested:<sessionKey>` lane；独立任务采用独立 session key 后可并行。

来源：

- https://docs.openclaw.ai/concepts/session-tool
- https://docs.openclaw.ai/queue
- https://docs.openclaw.ai/concepts/queue-steering
- https://docs.openclaw.ai/agent-loop
- https://docs.openclaw.ai/plugins/hooks
- https://github.com/openclaw/openclaw/issues/45165

## 最小修复

1. 部署 `housekeeper-async-dispatch` 策略插件。
2. 插件只拦截 `agentId=housekeeper` 的 `sessions_send`，把缺省或正数超时改为 `timeoutSeconds: 0`。
3. 不改变目标、任务内容、A2A allowlist、工具权限、Telegram queue mode 或其他 Agent。
4. 角色卡补充：
   - Telegram 前台只负责接单、拆分、异步派发和立即回执；
   - 独立任务使用 `agent:<owner>:task:<task-id>`；
   - 不轮询、不 sleep、不重复催办；
   - 完成依靠 push/announce 回传。

这不是让同一 transcript 多写者并发，而是“前台会话 + 独立后台任务 session”的安全并发。

## 验收

- 测试模型实际提交 `sessions_send(timeoutSeconds=120)`。
- 插件日志记录参数被重写。
- 工具结果为 `status=accepted`、`delivery=pending/announce`，获得独立 `runId`。
- life 目标 session 随后独立完成并返回 `ASYNC_TARGET_DONE`。
- 同一 housekeeper 前台 session 紧接着成功回复 `FRONTEND_RESPONSIVE`。
- 插件 runtime inspect：`loaded`、`activated=true`、`before_tool_call` hook 1 个、无运行诊断错误。
- Gateway active；三条 Telegram account 均 `running=true`、probe `ok=true`。

完成回推恰好与新消息同一时刻到达时，仍可能产生数秒的单 session 排队；不会再占用整个执行任务的时长。这是保持 transcript 单写者一致性的正常边界。

## 备份与回滚

- 备份：`/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-async-dispatch-20260723T161500`

回滚时：

1. 禁用 `plugins.entries.housekeeper-async-dispatch`；
2. 从 `plugins.allow` 移除该插件；
3. 从备份恢复 housekeeper 的 `AGENTS.md`、`TOOLS.md` 和必要配置；
4. 校验配置并重启 Gateway；
5. 不删除 Telegram session、transcript、memory 或 A2A routing。
