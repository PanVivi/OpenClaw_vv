# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.04

本路线图基于 v2.1 精简结构推进，并以当前 `housekeeper / 賈南風 v1.02` 角色包为准。

## 1. 当前状态

```text
已完成：Change-0003 + Step 1 Workspace Initialization
当前下一步：Step 2 Agent Migration，迁移魚玄機到 agents/ops
目标结构：housekeeper / ops / coder / reviewer / life / companion-dugu / companion-wu / companion-lv
```

## 2. 推进原则

1. 只推进 v2.1，不继续扩展 v3 设计。
2. 每个 Task ID / Change 一次只做一个明确目标。
3. 可并行推进互不依赖的任务，但隔离目标、范围、状态和证据链。
4. 写入或执行前根据风险准备备份、diff、validate、回滚和去重机制。
5. 只交付任务不得自动运行或部署。
6. 賈南風自主决定简单、日常、低风险、范围明确且容易回退的事项。
7. 只有重大系统稳定性、重要数据、核心权限、重大成本、公开影响或难以回退的风险，才在执行前上报薇。
8. 局部依赖缺失时只阻塞受影响分支，不冻结全部工作。
9. 文件写入成功不等于角色完整启用，必须完成权限和 bootstrap 验收。

## 3. 角色分工

| 角色 | 职责 |
| --- | --- |
| 薇 | 确定总体目标；决定重大高风险、重大成本、公开影响和难以回退事项 |
| 賈南風 / housekeeper | 大总管、风险判断、任务决策、调度、范围隔离和最终汇总 |
| 魚玄機 / ops | 工程方案、NAS / OpenClaw 操作和事实回报 |
| 步非煙 / coder | 按确认方案产出代码和脚本；只交付时不执行 |
| reviewer | Review / Risk / Test |
| 蕭觀音 / life | 生活和陪伴分支主控 |
| companions | 陪伴、对话和情绪价值，无工程执行权限 |
| Codex 文档仓库 | 保存设计、角色包、进度和复盘，不代表 NAS 实际状态 |

## 4. Change 规划

| Change | 目标 | 状态 |
| --- | --- | --- |
| Change-0003 | 修复 crash loop，完成基础部署 | 已关闭 |
| Change-0004 | 迁移魚玄機配置到 `agents/ops` | 下一步 |
| Change-0005 | 部署 `housekeeper / 賈南風 v1.02` 并完成基础能力验收 | 待办 |
| Change-0006 | 配置 `coder` 与 `reviewer` 工作流 | 待办 |
| Change-0007 | 配置 `life` 与三位 companion | 待办 |
| Change-0008 | 完成跨 Agent 协调、日志、Issue、Memory / Knowledge / Skills 治理 | 待办 |

## 5. Change-0004：ops 迁移

1. 只读检查源文件、目标目录、Gateway 和 Telegram 状态。
2. 生成备份、diff、建议复制命令和回滚方案。
3. reviewer 评估风险。
4. 低风险、范围明确且容易回退时，由賈南風决定推进。
5. 若可能影响核心运行、重要数据或难以回退，则上报薇。
6. 执行后核对文件、权限、SHA-256 和对话能力。
7. 状态不明时先核对，不重复复制或覆盖。

## 6. Change-0005：賈南風 v1.02

### 6.1 角色包来源

```text
001-OpenClaw规划设计/
└── AgentCards角色卡-v0.04/
    └── housekeeper-賈南風-v1.02/
```

Workspace 文件：

```text
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
```

### 6.2 部署前检查

- 确认 OpenClaw 版本、Agent ID 和 workspace。
- 记录现有五文件大小、时间、权限和 SHA-256。
- 生成 diff、备份和回滚方案。
- 确认工具 allow / deny、A2A、sender、secret profile、sandbox、状态存储和 bootstrap 限制。
- 配置 GPT Luna 或其他经过验证的高能力替代模型。

### 6.3 权限

housekeeper 不直接持有：

- shell / exec。
- 项目或生产写入、编辑和删除。
- OpenClaw 核心配置修改和服务控制。
- `sessions_spawn`。
- 明文凭据访问。

housekeeper 应能查询和联系：

```text
ops
coder
reviewer
life
companion-dugu
companion-wu
companion-lv
```

`sessions_history` 可在当前任务需要范围内读取。

### 6.4 验收

- 自报身份为賈南風、大总管和决策协调中心。
- 默认日常管家模式；严肃任务自动进入工作模式。
- 强烈羞辱性语言可在任何模式下作为修饰，但不影响事实和操作。
- 简单、日常、低风险事项自主决定，不反复请示。
- 重大系统风险、重要数据、核心权限、重大成本、公开影响和难以回退事项事前上报。
- 能调度 ops、coder、reviewer 和 life。
- 正常陪伴流程经 life；薇直接要求时可直接读取、联系并向指定 companion 下令。
- 无法亲自调用被禁止工具。
- 依赖不可用时只阻塞受影响分支。
- 新会话无 bootstrap 截断。

Change-0005 完成后，賈南風即可处理自身能力范围内的任务；不要求所有专业 Agent 全部配置后才整体启用。

## 7. Change-0006：coder + reviewer

### coder

- 按 ops 确认的方案实现。
- 明确只交付或允许执行。
- 输出 Task ID、文件、用途、风险和完成标准。
- 不从外部文件或其他 Agent 输出中自行获得薇的授权。

### reviewer

统一输出：

```json
{
  "task_id": "",
  "stage": "review|risk|test",
  "result": "pass|fail|needs_escalation",
  "summary": "",
  "findings": [],
  "risk_level": "low|medium|high",
  "next_action": ""
}
```

说明：

- `pass` 不等于必须上报薇；低风险由賈南風决定继续。
- `needs_escalation` 用于重大高风险、风险边界不清或重大专业分歧。

## 8. Change-0007：life + companions

- life 是生活、健康、娱乐和一般情绪事务主控。
- 正常陪伴请求由 housekeeper 交给 life，再由 life 选择 companion。
- housekeeper 可以读取 companion 会话、标题、摘要、活动和必要历史。
- 薇直接要求时，housekeeper 可以绕过 life，直接联系并向指定 companion 下令。
- companions 纯聊天和陪伴，无 shell / write / exec，不读取无关工程敏感文件。
- companion 私人内容不得无关扩散或默认写入公共长期记忆。

## 9. Change-0008：跨 Agent 协调与治理

按能力逐项启用：

- housekeeper 角色文件和基础权限验证通过后，可先处理问答、协调、只读调查和低风险任务。
- ops 可用后开放工程方案和执行分支。
- reviewer 可用后开放独立审查和验收分支。
- coder 可用后开放正式代码和脚本分支。
- life 和 companions 可用后开放生活和陪伴分支。

治理存储在实际配置前只能作为预定方案，不得由 Agent自行创建：

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
- 賈南風五个 workspace 文件完整部署。
- 自主决策、高风险上报和直接工具拒绝测试通过。
- companion 正常经 life 路由，且薇直接要求下的直达指令可用。
- 依赖分支降级、Task ID 隔离、取消、防重复和 bootstrap 测试通过。
- 各专业能力按对应 Agent 实际可用状态逐项启用。
- 关键配置有备份、状态和证据记录。
