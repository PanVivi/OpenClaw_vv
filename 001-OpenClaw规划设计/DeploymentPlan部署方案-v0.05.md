# 001 OpenClaw架设部署｜DeploymentPlan 部署方案｜v0.05

本方案使用稳定角色卡入口：

```text
001-OpenClaw规划设计/AgentCards角色卡/
```

## 一、本轮部署范围

- 升级 `housekeeper / 賈南風`：当前设计 v1.04；NAS 最后已知仍运行 v1.02。
- 首次部署 `life / 蕭觀音`：当前设计 v0.02。
- 落实共同协议 v0.02、受限 A2A、life 命名白名单会话代理或等效硬限制、Telegram 主动消息、天气、日历和 Cron。
- 完整记忆插件不属于本轮角色部署，另立 `Change-Memory`。

## 二、稳定基线规则

1. 賈南風必须先从 `旧文档/v1.02/` 完整复制六个角色与权限文件。
2. v1.04 新规则只能作为独立增量追加。
3. 未经薇明确批准，不得删除、合并、精简、改写旧条款或扩大权限。
4. 部署前建立逐文件继承矩阵和 v1.02 → v1.04 反向差异检查。
5. 写入失败、截断或结果不完整时，立即恢复已验证的完整 v1.02 基线。

## 三、部署文件

每个角色复制到 workspace 的文件只有：

```text
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
```

`PERMISSIONS.md` 用于转换真实配置，不直接复制。

## 四、部署前检查

1. 固定 Git 提交、角色目录和当前版本号。
2. 核对 Agent ID、workspace、模型、Telegram account binding 和接收 chat ID。
3. 记录目标 workspace 五文件路径、权限、mtime、大小和 SHA-256。
4. 备份五文件和 OpenClaw 配置。
5. 核对当前工具名称、profile、allow/deny、sandbox、A2A 和 session visibility。
6. 核对 weather、calendar、Cron、主动消息与 life 受限会话代理的可实现方式。
7. 确认 Bootstrap 字符限制和普通正式新会话加载方式。
8. 生成完整 diff、执行步骤、验证方案和回滚条件。

缺少关键事实时先只读调查，不直接覆盖生产配置。

## 五、写入步骤

1. 备份目标五文件和配置。
2. 验证賈南風当前文件包含完整 v1.02 基线及独立 v1.04 增量。
3. 写入五个 workspace 文件。
4. 按对应 `PERMISSIONS.md` 配置真实权限。
5. 配置模型和 Telegram binding。
6. 配置受限 A2A。
7. 为 life 配置只暴露 housekeeper 与三位 companion 的受限会话代理或等效硬限制。
8. 为 life 配置 weather、calendar、提醒、主动 Telegram 投递和每日 06:00 精确 Cron。
9. 配置 validate 通过后，仅进行一次必要 Gateway 重启。
10. 创建普通正式新会话，不使用跳过角色 Bootstrap 的轻量上下文。
11. 完成角色、工具、拒绝、跨 Agent、消息和自动化验收。

## 六、賈南風权限与流程验收

允许按 v1.02 权限矩阵转换：有限会话查询、结构化发送、必要历史读取和低风险自动化。禁止 shell、exec、process、普通项目或生产写入、删除、核心配置、服务控制、`sessions_spawn` 和明文凭据。

必须验证：

- 简单命令轨完整；
- 代码轨包含 coder 实现后的 ops 对照核对与 reviewer.Review 产物审查；
- 只交付不得自动执行；
- 完整状态机、取消撤权、防重复、临时技术子 Agent 和五次熔断正确；
- companion 日常管理经 life，只有薇直接要求时 housekeeper 才直达指定 companion。

## 七、蕭觀音权限与会话隔离

允许 weather、calendar、提醒、Cron、指定 Telegram 投递，以及对 housekeeper 和三位 companion 的受限会话通信。

标准 session visibility 无法按名称建立白名单时，必须使用专用受限会话代理或等效机制。不得开放 `all` 后靠提示词自律。必须完成对允许对象的正向测试和对 ops、coder、reviewer 等对象的拒绝测试。

## 八、每日 06:00 任务

必须明确：

- Cron：`0 6 * * *`；
- IANA 时区；
- Exact，关闭默认错峰；
- Agent：`life`；
- 独立正式新会话；
- Telegram account 和 chat ID；
- 中文且只输出一条最终角色消息；
- 失败通知目标；
- 不使用跳过 Bootstrap 的轻量上下文。

## 九、独立记忆任务

`Change-Memory` 单独设计、审核、部署和验收：插件选择、真实工具名、housekeeper/life 独立命名空间、自动捕获、查询、纠正、删除、失效和隔离测试。

本轮角色部署不因 `Change-Memory` 尚未完成而被写成失败，但必须明确记录完整记忆未部署；不得虚构记忆能力，也不得开放普通项目或整个 workspace 写权限。

## 十、证据与回滚

保留源提交、稳定基线 SHA、逐条继承矩阵、目标路径、备份、完整 diff、写入前后 SHA-256、配置 validate、重启次数、新会话 Bootstrap、正反向权限测试、Cron 手动运行、Telegram 投递和跨 Agent 测试证据。

发生异常时停止新步骤，核对真实状态后回滚。賈南風 v1.04 未通过全部必要验收前，不删除或覆盖 v1.02 可回滚备份。