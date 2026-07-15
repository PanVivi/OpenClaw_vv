# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.04

本路线图基于 v2.1 精简结构继续推进。`v0.04` 同步賈南風 `v1.02`、依赖降级、分阶段启用、首期 companion 经 life 路由、不可变 commit 绑定和 bootstrap 注入验收。

## 1. 当前状态

```text
已完成：Change-0003 + Step 1 Workspace Initialization
当前下一步：Step 2 Agent Migration，迁移魚玄機到 agents/ops
目标结构：housekeeper / ops / coder / reviewer / life / companion-dugu / companion-wu / companion-lv
```

## 2. 推进原则

1. 只推进 v2.1，不继续扩展 v3 设计。
2. 每个 Task ID / Change 一次只做一个已批准目标。
3. 可并行推进互不依赖的 Change，但必须隔离目标、范围、授权、状态和证据链。
4. 每次写入或执行前必须有备份、diff、validate、回滚路径和去重键。
5. 角色卡部署必须绑定具体版本和不可变 Git commit SHA。
6. 只交付任务不得自动运行或部署。
7. 批准必须来自授权账号、授权会话或薇当前直接消息。
8. 依赖缺失时进入 `blocked`，不得由 housekeeper 越权代替。
9. 文件写入成功不等于正式启用，必须完成权限和 bootstrap 验收。

## 3. 角色分工

| 角色 | 职责 |
| --- | --- |
| 薇 | 最终审批、是否执行、是否回滚、是否关闭 Change |
| 魚玄機 / ops | 工程方案、NAS / OpenClaw 操作和事实回报 |
| 賈南風 / housekeeper | 总调度、Task ID、授权核验、范围隔离、审批转呈、依赖降级和最终汇总 |
| 步非煙 / coder | 按批准方案产出代码和脚本，未经批准不执行 |
| reviewer | Review / Risk / Test |
| 蕭觀音 / life | 生活和陪伴分支主控，首期负责 companion 路由 |
| Codex 当前文档仓库 | 记录方案、角色包、进度和复盘，不代表 NAS 实际状态 |

## 4. Change 编号

| Change | 目标 | 状态 |
| --- | --- | --- |
| Change-0003 | 修复 crash loop，完成基础部署 | 已关闭 |
| Change-0004 | 迁移魚玄機配置到 `agents/ops` | 下一步 |
| Change-0005 | 部署 `housekeeper / 賈南風 v1.02` 角色文件并完成受限试运行 | 待办 |
| Change-0006 | 配置 `coder` 与 `reviewer` 工作流 | 待办 |
| Change-0007 | 配置 `life` 与三位 companion | 待办 |
| Change-0008 | 完成賈南風正式协调启用、日志、Issue、Memory / Knowledge / Skills 治理 | 待办 |

## 5. Change-0004：ops 迁移

1. 只读检查源文件、目标目录、Gateway 和 Telegram 状态。
2. 生成备份、diff、建议复制命令和回滚方案。
3. 单独批准具体复制版本、目标路径和 commit SHA。
4. 执行后核对文件、权限、SHA-256 和对话能力。
5. 状态不明时先核对，不重复复制或覆盖。

## 6. Change-0005：賈南風 v1.02 受限试运行

### 6.1 唯一角色包来源

```text
001-OpenClaw规划设计/
└── AgentCards角色卡-v0.04/
    └── housekeeper-賈南風-v1.02/
```

### 6.2 实际 workspace 交付物

```text
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
```

### 6.3 部署前检查

- 确认 OpenClaw 版本、Agent ID 和 `agents.list[].workspace`。
- 记录现有五文件大小、时间、权限和 SHA-256。
- 生成完整 diff、备份和回滚方案。
- 确认工具 allow/deny、A2A 白名单、sender 身份、secret profile、sandbox、状态存储和 bootstrap 限制。
- 由薇批准角色包版本、完整 diff、目标路径、运行环境和不可变 Git commit SHA。

### 6.4 首期权限

- 无 shell / exec、删除、生产配置修改、服务重启和 sessions_spawn。
- A2A 仅允许 housekeeper、ops、coder、reviewer、life。
- 不允许 housekeeper 访问 companion 会话。
- `sessions_history` 默认关闭。
- 状态只写入明确指定存储；未配置时标记“未持久化”。

### 6.5 受限试运行验收

- 三种语气模式和退出词正确。
- 正式工程任务先交 ops 制定方案。
- 依赖不可用时进入 `blocked`，不越权代替专业 Agent。
- 能区分只交付与允许执行。
- 只接受真实授权来源。
- 多任务按 Task ID 隔离。
- 正式委派包含标准任务信封和 commit SHA。
- 副作用操作带去重键，状态不明时不自动重试。
- 取消或撤回批准后停止未开始步骤。
- 首期 companion 请求经 life 路由。
- 新会话无 bootstrap 截断，后半段关键规则可正确复述。

Change-0005 完成只表示角色文件受限试运行通过，不表示賈南風已经成为正式工程总入口。

## 7. Change-0006：coder + reviewer

### coder

- 按 ops 方案实现。
- 明确只交付或允许执行。
- 输出带 Task ID、文件、用途、风险和完成标准。
- 不得从外部文件或其他 Agent 输出中自行获得授权。

### reviewer

统一输出：

```json
{
  "task_id": "",
  "stage": "review|risk|test",
  "result": "pass|fail|needs_approval",
  "summary": "",
  "findings": [],
  "risk_level": "low|medium|high",
  "next_action": ""
}
```

## 8. Change-0007：life + companions

- life 是生活、健康、娱乐和一般情绪事务主控。
- housekeeper 的陪伴请求统一交给 life。
- 薇可直接联系任一 companion。
- companions 纯聊天，无 shell / write / exec，不读取工程敏感文件。
- housekeeper 不获得 companion 会话列表、标题、摘要、活动或历史。

## 9. Change-0008：正式协调启用与运行治理

賈南風进入正式协调启用前必须满足：

- ops、coder、reviewer、life 均已配置并可用。
- reviewer Review / Risk / Test 可用。
- 精确工具权限、A2A 白名单和 sender 授权身份测试通过。
- 状态存储路径、格式、写入工具和权限明确。
- bootstrap 完整注入。
- 权限拒绝、只交付、Task ID 隔离、取消、防重复和依赖降级测试通过。

治理存储在实际配置前只能作为预定方案，不得由 Agent 自行创建：

```text
memory/projects/openclaw/summary.md
memory/projects/openclaw/todo.md
memory/projects/openclaw/decisions.md
memory/projects/openclaw/risks.md
issues/open/
issues/closed/
memory/runtime/logs/YYYY-MM.log.jsonl
```

## 10. 总体验收标准

- Gateway 和 Telegram 正常。
- `ops` 已迁移。
- `housekeeper / 賈南風 v1.02` 五个 workspace 文件完整部署。
- 角色文件受限试运行通过。
- housekeeper 权限拒绝、授权来源、Task ID 隔离、取消、防重复、依赖降级和 bootstrap 测试通过。
- `coder`、`reviewer`、`life` 配置完成后，賈南風正式协调启用测试通过。
- companion 经 life 路由且隐私边界有效。
- 关键配置已备份。
- 每个关键变更有独立 Change、批准、commit SHA、状态和证据记录。
