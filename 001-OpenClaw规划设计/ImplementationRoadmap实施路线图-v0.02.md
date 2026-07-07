# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.02

本方案基于当前主干设定与进度文件制定，目标是从已经完成的 v2.1 Step 1 继续推进到可稳定运行的精简多 Agent 系统。

当前状态：

```text
已完成：Change-0003 + Step 1 Workspace Initialization
当前下一步：Step 2 Agent Migration，迁移魚玄機到 agents/ops
目标结构：housekeeper / ops / coder / reviewer / life / companion-dugu / companion-wu / companion-lv
```

## 1. 推进原则

1. 只推进 v2.1，不继续扩展 v3 设计。
2. 一次只做一个 Change，不跨阶段混改。
3. 每次执行前必须有备份、diff、validate、回滚路径。
4. 任何脚本必须先写入、`cat` 核对、`bash -n` 语法检查，再执行。
5. 执行者只报告事实，不自行判断扩大范围。
6. 薇负责批准高危动作和阶段关闭；下级 Agent 汇报时可称呼薇为少爷、少主或公子。

## 2. 角色分工

| 角色 | 职责 |
| --- | --- |
| 薇 | 合欢宗主人；最终审批、是否继续、是否回滚、是否关闭 Change |
| 魚玄機 / ops | 当前执行主力，负责 NAS/OpenClaw 操作和事实回报 |
| 賈南風 / housekeeper | 后续总调度，当前尚未完成配置 |
| 步非煙 / coder | 后续代码/脚本产出 |
| reviewer | 后续内部 Review / Risk / Test |
| Codex 当前文档仓库 | 记录实施方案、进度、复盘，不直接代表 NAS 实际状态 |

## 3. Change 编号建议

| Change | 目标 | 状态 |
| --- | --- | --- |
| Change-0003 | 修复 crash loop，完成 `ops + accounts + bindings` 基础部署 | 已关闭 |
| Change-0004 | 完成 Step 2：迁移魚玄機配置到 `agents/ops` | 下一步 |
| Change-0005 | 配置 `housekeeper / 賈南風` 并接入总入口 | 待办 |
| Change-0006 | 配置 `coder` 与 `reviewer` 工作流 | 待办 |
| Change-0007 | 配置 `life` 与三位 companion | 待办 |
| Change-0008 | 日志、Issue Database、Memory/Knowledge/Skills 初始化 | 待办 |

## 4. Change-0004：ops 迁移实施方案

### 4.1 目标

把当前旧 `workspace/` 中魚玄機正在使用的核心配置安全迁移到：

```text
/Volume3/OpenClaw/home/.openclaw/agents/ops/
```

迁移对象：

```text
SOUL.md
AGENTS.md
```

### 4.2 前置条件

执行前必须确认：

- Gateway 当前正常运行。
- Telegram 魚玄機 Bot 可对话。
- `agents/ops/` 目录已存在。
- `workspace/SOUL.md` 和 `workspace/AGENTS.md` 至少有一个存在。
- 不对生产 `openclaw.json` 做任何修改。

### 4.3 执行步骤

#### Step 2.1：只读检查

让魚玄機执行：

```bash
BASE="/Volume3/OpenClaw/home/.openclaw"
ls -la "$BASE/workspace"
ls -la "$BASE/agents/ops"
test -f "$BASE/workspace/SOUL.md" && echo "workspace/SOUL.md exists"
test -f "$BASE/workspace/AGENTS.md" && echo "workspace/AGENTS.md exists"
```

验收：

- 输出完整。
- 不修改任何文件。
- 能确认源文件和目标目录状态。

#### Step 2.2：生成迁移脚本

脚本必须做到：

- 备份当前 `agents/ops`。
- 对比 `workspace/` 与 `agents/ops/`。
- 输出建议复制命令。
- 不自动覆盖。

原则：对比脚本可以执行，真正复制必须单独审批。

#### Step 2.3：脚本核对

必须执行：

```bash
cat /Volume3/OpenClaw/home/.openclaw/scripts/deploy-step2-migrate-ops.sh
bash -n /Volume3/OpenClaw/home/.openclaw/scripts/deploy-step2-migrate-ops.sh
```

验收：

- `cat` 输出无乱码、无 `||||` 污染。
- heredoc、引号、变量引用正确。
- `bash -n` 无输出。

#### Step 2.4：执行对比阶段

执行迁移脚本的“对比阶段”，不得自动覆盖。

输出必须包含：

- 备份路径。
- `SOUL.md` 差异。
- `AGENTS.md` 差异。
- `workspace/` 文件清单。
- 建议复制命令。
- 回滚命令。

#### Step 2.5：人工确认复制

薇或审核方确认后，才允许执行：

```bash
cp "$BASE/workspace/SOUL.md" "$BASE/agents/ops/SOUL.md"
cp "$BASE/workspace/AGENTS.md" "$BASE/agents/ops/AGENTS.md"
```

如果某个源文件不存在，不执行对应复制。

#### Step 2.6：迁移后验证

```bash
ls -la "$BASE/agents/ops"
sha256sum "$BASE/workspace/SOUL.md" "$BASE/agents/ops/SOUL.md"
sha256sum "$BASE/workspace/AGENTS.md" "$BASE/agents/ops/AGENTS.md"
```

验收：

- 文件存在。
- hash 一致。
- `workspace/` 未删除。
- 魚玄機仍能正常对话。

### 4.4 回滚

如果迁移后发现问题：

```bash
rm -rf "$BASE/agents/ops"
cp -r "$BACKUP" "$BASE/agents/ops"
```

注意：

- 回滚前必须确认 `$BACKUP` 是本次迁移生成的备份目录。
- 不动 `workspace/`。

## 5. Change-0005：housekeeper / 賈南風

### 5.1 目标

配置 `agents/housekeeper`，让賈南風成为总入口。

### 5.2 交付物

```text
agents/housekeeper/SOUL.md
agents/housekeeper/AGENTS.md
agents/housekeeper/TOOLS.md（如 OpenClaw 当前版本需要）
openclaw.json 中 housekeeper agent 配置
Telegram account / binding（如有独立 Bot）
```

### 5.3 验收

- housekeeper 能接收消息。
- 能说明当前系统结构。
- 能把任务分派给 ops/coder/reviewer/life。
- 不直接执行高危操作。

## 6. Change-0006：coder + reviewer

### 6.1 coder

目标：

- 配置 `agents/coder`。
- 人格为步非煙。
- 只负责代码和脚本产出，不部署。

验收：

- 能根据需求生成脚本。
- 不主动执行生产修改。
- 输出必须带文件、用途、风险说明。

### 6.2 reviewer

目标：

- 配置 `agents/reviewer`。
- 内部包含三个 prompt 阶段：
  - Review：方案/代码审查。
  - Risk：危险等级与回滚检查。
  - Test：功能验收。

验收：

- 能按指定阶段输出结构化结果。
- 不写生产文件。
- 高危必须要求薇决策。

建议统一输出格式：

```json
{
  "stage": "review|risk|test",
  "result": "pass|fail|needs_approval",
  "summary": "",
  "findings": [],
  "risk_level": "low|medium|high",
  "next_action": ""
}
```

## 7. Change-0007：life + companions

### 7.1 life / 蕭觀音

目标：

- 配置生活娱乐主控。
- 管理三位 companion。
- 不介入工程部署。

### 7.2 companions

目标：

- `companion-dugu`
- `companion-wu`
- `companion-lv`

验收：

- 纯聊天。
- 无 shell/write/exec。
- 不读取工程敏感文件。

## 8. Change-0008：运行治理能力

目标是让系统可持续迭代。

交付物：

```text
memory/projects/openclaw/summary.md
memory/projects/openclaw/todo.md
memory/projects/openclaw/decisions.md
memory/projects/openclaw/risks.md
issues/open/
issues/closed/
memory/runtime/logs/YYYY-MM.log.jsonl
knowledge/docker/
knowledge/nas/
knowledge/telegram/
skills/
```

要求：

- 日志记录事件。
- Issue Database 记录可复现问题。
- Weekly Review 根据 Issue 生成迭代计划。

Issue 格式建议：

```json
{
  "id": "Issue-0001",
  "title": "",
  "category": "config|code|workflow|model|permission|memory",
  "impact": "low|medium|high",
  "status": "open|closed",
  "first_seen": "",
  "occurrences": 1,
  "related_tasks": [],
  "root_cause": "",
  "next_action": ""
}
```

## 9. 总体验收标准

v2.1 可视为阶段完成，必须同时满足：

- Gateway 正常。
- Telegram 正常。
- `ops` 已迁移。
- `housekeeper` 可作为入口。
- `coder` 可产出脚本。
- `reviewer` 可执行 Review/Risk/Test。
- `life` 和 companions 可对话且无工程执行权限。
- 关键配置已备份。
- 关键变更有 Change 记录。
- 失败和问题进入 issues，而不是散落在聊天里。
