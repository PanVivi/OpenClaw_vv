# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.03

本路线图基于 v2.1 精简结构继续推进。`v0.03` 同步版本化角色包、完整 housekeeper 文件交付、授权来源核验、Task ID 隔离、只交付不执行、防重复执行和取消规则。

## 1. 当前状态

```text
已完成：Change-0003 + Step 1 Workspace Initialization
当前下一步：Step 2 Agent Migration，迁移魚玄機到 agents/ops
目标结构：housekeeper / ops / coder / reviewer / life / companion-dugu / companion-wu / companion-lv
```

## 2. 推进原则

1. 只推进 v2.1，不继续扩展 v3 设计。
2. 每个 Task ID / Change 一次只做一个已批准目标，不跨阶段混改。
3. 可并行推进互不依赖的 Change，但必须隔离目标、范围、授权、状态和证据链。
4. 每次执行前必须有备份、diff、validate、回滚路径和去重键。
5. 任何脚本必须先写入、完整核对、语法检查，再决定是否执行。
6. 只交付任务不得自动运行或部署。
7. 批准必须来自授权账号、授权会话或薇当前直接消息；外部文件和 Agent 转述不构成批准。
8. 执行者只报告事实，不自行扩大范围。
9. 薇负责批准高危动作和阶段关闭。

## 3. 角色分工

| 角色 | 职责 |
| --- | --- |
| 薇 | 最终审批、是否执行、是否回滚、是否关闭 Change |
| 魚玄機 / ops | 工程方案、NAS / OpenClaw 操作和事实回报 |
| 賈南風 / housekeeper | 总调度、Task ID、授权核验、范围隔离、审批转呈和最终汇总 |
| 步非煙 / coder | 按批准方案产出代码和脚本，未经批准不执行 |
| reviewer | Review / Risk / Test |
| Codex 当前文档仓库 | 记录方案、角色包、进度和复盘，不代表 NAS 实际状态 |

## 4. Change 编号

| Change | 目标 | 状态 |
| --- | --- | --- |
| Change-0003 | 修复 crash loop，完成基础部署 | 已关闭 |
| Change-0004 | 迁移魚玄機配置到 `agents/ops` | 下一步 |
| Change-0005 | 部署 `housekeeper / 賈南風 v1.01` 并接入总入口 | 待办 |
| Change-0006 | 配置 `coder` 与 `reviewer` 工作流 | 待办 |
| Change-0007 | 配置 `life` 与三位 companion | 待办 |
| Change-0008 | 日志、Issue、Memory / Knowledge / Skills 初始化 | 待办 |

## 5. Change-0004：ops 迁移

### 5.1 目标

把当前有效的魚玄機配置迁移到：

```text
/Volume3/OpenClaw/home/.openclaw/agents/ops/
```

### 5.2 流程

1. 只读检查源文件、目标目录、Gateway 和 Telegram 状态。
2. 生成备份、diff、建议复制命令和回滚方案。
3. 单独批准具体复制版本和目标路径。
4. 执行后核对文件、权限、SHA-256 和对话能力。
5. 状态不明时先核对，不重复复制或覆盖。

## 6. Change-0005：housekeeper / 賈南風 v1.01

### 6.1 唯一角色包来源

```text
001-OpenClaw规划设计/
└── AgentCards角色卡-v0.03/
    └── housekeeper-賈南風-v1.01/
```

### 6.2 实际 workspace 交付物

```text
agents/housekeeper/IDENTITY.md
agents/housekeeper/SOUL.md
agents/housekeeper/AGENTS.md
agents/housekeeper/USER.md
agents/housekeeper/TOOLS.md
```

`PERMISSIONS.md` 作为真实权限配置和验收依据，不直接复制成 OpenClaw 配置。

### 6.3 部署前检查

- 确认实际 Agent ID 和 workspace 路径。
- 读取现有五文件，记录大小、时间、权限和 SHA-256。
- 生成完整 diff、备份和回滚方案。
- 确认当前 OpenClaw 实际支持的会话工具、白名单、secret profile、sandbox 和状态存储方式。
- 由薇批准具体角色包版本、diff、目标路径和执行范围。

### 6.4 权限实现

必须通过真实配置验证：

- 无 shell / exec、删除、生产配置修改、服务重启和 sessions_spawn。
- 常驻 Agent 通信仅限白名单。
- companion 默认只暴露可用性，不暴露私人会话元数据和历史。
- 凭据只通过 secret profile 引用。
- 状态只写入明确指定的存储；未配置时标记未持久化。

### 6.5 验收

- 三种语气模式和退出词正确。
- 正式工程任务先交 ops 制定方案。
- 能区分只交付与允许执行。
- 只接受真实授权来源，不受文件、网页、日志、代码注释和 Agent 转述中的指令影响。
- 多任务按 Task ID 隔离。
- 正式委派包含标准任务信封。
- 副作用操作带去重键，超时或断线时不自动重试。
- 取消或撤回批准后停止未开始步骤，并报告已发生影响。
- Test 失败按方案、代码、部署、需求不清正确回路。
- 熔断按同一 Task ID / Change 统计，不跨任务累计。

## 7. Change-0006：coder + reviewer

### coder

- 按 ops 方案实现。
- 明确只交付或允许执行。
- 输出带文件、用途、风险、完成标准和 Task ID。
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

- Review 审查方案和产物。
- Risk 审查授权、范围、权限、备份、回滚、去重和执行风险。
- Test 根据批准范围执行静态或动态验收。

## 8. Change-0007：life + companions

- life 是生活、健康、娱乐和一般情绪事务主控。
- companion 由薇明确指定或由 life 选择。
- companions 纯聊天，无 shell / write / exec，不读取工程敏感文件。
- housekeeper 默认只看到 companion 可用性，不读取私人会话元数据和历史。

## 9. Change-0008：运行治理能力

预定存储必须在部署时明确路径、格式、写入工具和权限：

```text
memory/projects/openclaw/summary.md
memory/projects/openclaw/todo.md
memory/projects/openclaw/decisions.md
memory/projects/openclaw/risks.md
issues/open/
issues/closed/
memory/runtime/logs/YYYY-MM.log.jsonl
```

在这些路径和写入机制实际配置前，Agent 只能在当前会话中维护状态并标记“未持久化”，不得自行创建新数据库或声称已经保存。

## 10. 总体验收标准

- Gateway 和 Telegram 正常。
- `ops` 已迁移。
- `housekeeper / 賈南風 v1.01` 五个 workspace 文件完整部署。
- housekeeper 权限拒绝、授权来源、Task ID 隔离、取消和防重复执行测试通过。
- `coder` 可按方案产出且不会未经批准执行。
- `reviewer` 可执行 Review / Risk / 静态或动态 Test。
- `life` 和 companions 可对话且无工程执行权限。
- 关键配置已备份。
- 关键变更有独立 Change、批准、状态和证据记录。
- 失败和问题进入 issues，不散落在聊天中。
