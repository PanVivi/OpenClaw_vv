# 委派自动化修复报告

- 版本：v0.01
- 日期：2026-07-23
- 范围：仅修复 housekeeper 委派授权链、OpenClaw Fake-IP 网络兼容和 `CodexResetWatcher` 实际运行链路。

## 根因

1. 角色卡把“其他 Agent 转述不构成授权”写成绝对规则，误伤了 housekeeper 从少主已认证会话发起的正式委派。
2. OpenClaw 2026.7.1-2 会从非 owner/A2A 接收轮次移除 `cron` 与 `gateway`；`cron` 工具也不能替其他 `agentId` 创建任务。因此 life 收到 A2A 后即使职责正确，也不能直接落地持久 Cron。
3. Clash Fake-IP 将 `codexreset.org` 和 X 解析到 RFC2544 `198.18.0.0/15`，OpenClaw `web_fetch` 的 SSRF 防护据此拒绝访问。
4. 本机 CLI 原有 `operator.write`，新增 command Cron 需要 `operator.admin`，更新后首次创建触发设备 scope upgrade。

## 修复

- 共同协议升级到 v0.04：普通转述仍不授权；housekeeper 从已认证少主会话生成的字段完整委派包可在原范围内承载既有授权，接收 Agent 不得要求少主重复指令。
- housekeeper v1.10、life v0.07、ops v0.08 同步接入该规则。
- 为 housekeeper 开放 owner 会话内 `cron`，仍拒绝 shell、写入、Gateway 和 message。
- 配置 `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange=true`，只用于当前可信 Clash Fake-IP 环境。
- 仅批准 NAS 本机 CLI 的待处理 `operator.admin` scope；没有向任何 Agent 开放主机管理员权限。
- 部署持久任务 `CodexResetWatcher`：每 30 分钟读取 `codexreset.org`，只筛选 Tibo 的高可信 `reset-intent` / `confirmed-reset`，以事件 ID 持久去重；新事件由 life Bot 向少主发送，首次建立基线不补发旧事件。

## 委派包最小字段

```text
Task ID:
Authorization Source: telegram owner session + message timestamp
Goal:
Scope:
Forbidden:
Active Handler:
Allowed Side Effects:
Expiry / Invalidation:
Idempotency Key:
Evidence:
```

字段完整、来源可核对且范围未变化时，life/ops 直接接手；普通转述、来源缺失、范围扩大或风险实质变化时才返回 housekeeper 补充或重新授权。

## 验证结果

- `commands.ownerAllowFrom` 已包含少主 Telegram ID。
- A2A 全员主动双向配置保持启用。
- `codexreset.org` 与 X 通过 life 的实际 `web_fetch` 返回 HTTP 200。
- Watcher 解析出最新 Tibo `reset-intent`，置信度 99；基线写入成功。
- Cron 已创建为 `agentId=life`、30 分钟、持久 SQLite、delivery none；手动运行状态 `ok`、输出 `NO_REPLY`、连续错误 0。
- life Bot 验收通知调用成功；通知明确标注为测试，不伪装成新重置事件。

## 保留边界

- `web_search` 尚未配置搜索提供商；固定源监控使用 `web_fetch`，不阻塞本任务。
- 不向 ops/life 开放通用 shell、写入或 Gateway 权限。
- 后续自动化优先沿用同一模式：housekeeper 授权与调度，职责 Agent 作为业务所有者，管理面只负责持久化 owner-only 调度器。
