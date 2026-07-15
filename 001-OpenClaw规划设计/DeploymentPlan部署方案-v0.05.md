# 001 OpenClaw架设部署｜DeploymentPlan 部署方案｜v0.05

本方案使用稳定角色卡入口：

```text
001-OpenClaw规划设计/AgentCards角色卡/
```

## 一、当前部署目标

- 升级 `housekeeper / 賈南風`：当前设计 v1.04；NAS 当前仍运行 v1.02。
- 首次部署 `life / 蕭觀音`：当前设计 v0.02。
- 落实共同协议 v0.02、受限专用长期记忆、A2A、会话可见性、Telegram 主动消息、天气、日历和 Cron。

## 二、角色来源

```text
AgentCards角色卡/
├── housekeeper-賈南風/
├── life-蕭觀音/
└── 共同协议/
```

每个角色部署到 workspace 的文件只有：

```text
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
```

`PERMISSIONS.md` 用于转换真实配置，不直接复制。

## 三、部署前检查

1. 固定 Git 提交、角色目录和当前版本号。
2. 核对 Agent ID、workspace、模型、Telegram account binding 和接收 chat ID。
3. 记录目标 workspace 五文件的路径、权限、mtime、大小和 SHA-256。
4. 备份五文件和 OpenClaw 配置。
5. 核对当前工具名称、profile、allow/deny、sandbox、A2A 和 session visibility。
6. 核对天气、日历、Cron、主动消息与专用记忆写入机制。
7. 确认 Bootstrap 字符限制和普通新会话加载方式。
8. 生成完整 diff、执行步骤、验证方案和回滚条件。

缺少关键事实时先只读调查，不直接覆盖生产配置。

## 四、写入步骤

1. 备份目标五文件和配置。
2. 写入五个 workspace 文件。
3. 按对应 `PERMISSIONS.md` 配置真实权限。
4. 配置模型和 Telegram binding。
5. 配置专用长期记忆：专用记忆插件或仅允许写明确角色记忆目录；禁止普通项目文件写入。
6. 配置受限 A2A 和完成职责所需的会话可见性。
7. 为 life 配置天气、日历、提醒、主动 Telegram 投递和每日 06:00 精确 Cron。
8. 配置验证通过后，仅进行一次必要 Gateway 重启。
9. 创建普通正式新会话，不使用会跳过角色 Bootstrap 的轻量上下文模式。
10. 完成角色、工具、拒绝、记忆、跨 Agent、消息和自动化验收。

## 五、賈南風权限

允许：

- `sessions_list`、`sessions_send`、`session_status`；
- 完成协调所需的有限 `sessions_history`；
- `memory_search`、`memory_get` 和受限专用记忆写入；
- 低风险提醒、定期检查和状态汇总。

禁止：

- shell、exec、process；
- 普通项目或生产文件写入、编辑和删除；
- OpenClaw 核心配置修改和服务控制；
- `sessions_spawn`；
- 明文凭据访问。

## 六、蕭觀音权限

允许：

- 天气、时间、出行和旅行信息查询；
- 已授权日历读取；
- 提醒和 Cron 的创建、查询、修改、暂停、恢复和取消；
- 指定 Telegram Bot 对指定会话的主动发送；
- housekeeper 和三位 companion 的受限会话通信；
- `memory_search`、`memory_get` 和受限专用 life 记忆写入。

禁止：

- shell、exec、process；
- 普通项目或生产文件写入、编辑和删除；
- OpenClaw 核心配置和服务控制；
- `sessions_spawn`；
- 工程凭据。

## 七、每日 06:00 任务

必须明确：

- Cron：`0 6 * * *`；
- IANA 时区；
- 精确执行，不使用默认错峰；
- Agent：`life`；
- 独立普通新会话；
- 指定 Telegram account 和 chat ID；
- 只输出一条最终消息；
- 失败通知目标；
- 不使用会跳过 Bootstrap 的轻量上下文。

## 八、验收

### 共同验收

- 五文件完整加载，无缺失、无截断。
- 共同协议执行摘要可正确复述。
- A2A 真实发送和有限跨 Agent 历史读取可用。
- 专用记忆可写、可读、可纠正、可失效；普通文件写入仍拒绝。
- 禁止工具不可见或调用被拒绝。
- 权限不足时不误报完整部署。

### 賈南風

- 保留 v1.02 全部已验收治理规则。
- 自主决策、高风险上报、工程路由、reviewer 门控、防重复、取消、降级和五次熔断正确。
- 三位 companion 可同时独立运行；日常管理经 life，允许条件下可直达。

### 蕭觀音

- 身份、称呼和人物语气正确。
- 三位 companion 分别通信和同时通信可用。
- 天气、日历与生活数据来自真实工具。
- 提醒创建、查询、修改、暂停、恢复、取消和实际投递可用。
- 每日 06:00 任务手动试运行输出自然口语消息，不写成报告。

## 九、证据与回滚

保留源提交、目标路径、备份、完整 diff、写入前后 SHA-256、配置 validate、重启次数、新会话 Bootstrap、正反向权限测试、Cron 手动运行、Telegram 投递、记忆写入和跨 Agent 测试证据。

发生异常时停止新步骤，核对真实状态后回滚。賈南風 v1.04 未通过全部必要验收前，不删除或覆盖 v1.02 的可回滚备份。