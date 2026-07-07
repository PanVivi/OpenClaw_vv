# 001 OpenClaw架设部署｜DeploymentPlan 部署方案｜v0.02

## 1. 部署原则

不要再按十角色方案一次性部署。

最终 v2.1 采用精简结构：

```text
housekeeper / ops / coder / reviewer / life / companion-dugu / companion-wu / companion-lv
```

其中 `reviewer` 合并原薛濤、文薑、夏姬职责。

组织设定：

- 组织名：合欢宗。
- 主人/用户名：薇。
- 下级 Agent 对薇的称呼：少爷、少主、公子。
- housekeeper 人格名：賈南風。

推荐原则：

```text
小步变更
明确备份
先 validate
再 replace
再 restart
最后 smoke test
```

## 2. 已成功的基础架构

`Change-0003` 已经成功部署 v2.1 基础骨架：

- `agents.list` 新增 `ops` agent。
- Telegram 配置支持 `channels.telegram.accounts`。
- 顶层 `bindings[]` 支持 account 到 agent 的路由。

Step 1 Workspace Initialization 已成功：

- 创建 `agents/housekeeper`
- 创建 `agents/ops`
- 创建 `agents/coder`
- 创建 `agents/reviewer`
- 创建 `agents/life`
- 创建 `agents/companion-dugu`
- 创建 `agents/companion-wu`
- 创建 `agents/companion-lv`
- 创建 memory / knowledge / skills / adr / issues / scripts 等目录。

## 3. 当前部署阶段

当前下一步是 Step 2：

```text
Agent Migration：迁移魚玄機自己的配置到 agents/ops
```

目标：

- 从旧 `workspace/` 中迁移 `SOUL.md`、`AGENTS.md`。
- 目标目录为 `agents/ops/`。
- 先备份、先 diff、人工确认后再复制。

## 4. 后续阶段建议

### Phase 0：已完成

内容：

- 修复 Gateway crash loop。
- 修复 bindings 和 accounts Schema。
- 完成 `ops + accounts + bindings` 基础部署。
- 完成 v2.1 workspace 目录初始化。

### Phase 1：完成 ops 迁移

新增/迁移：

- `agents/ops/SOUL.md`
- `agents/ops/AGENTS.md`

验收：

- `agents/ops` 内容正确。
- 原 `workspace/` 未误删。
- 魚玄機仍可正常对话。

### Phase 2：配置 housekeeper

新增：

- `agents/housekeeper`
- 賈南風人格和调度规则。
- 面向薇时的称呼规则：少爷 / 少主 / 公子。

验收：

- housekeeper 可作为总入口。
- 能把任务交给 ops/coder/reviewer/life。

### Phase 3：配置 coder 与 reviewer

新增：

- `agents/coder`
- `agents/reviewer`

验收：

- coder 只负责代码/脚本产出。
- reviewer 内部能执行：
  - Review：方案/代码审查。
  - Risk：危险等级和高危上报。
  - Test：功能验收。

### Phase 4：配置 life 与 companions

新增：

- `agents/life`
- `agents/companion-dugu`
- `agents/companion-wu`
- `agents/companion-lv`

验收：

- life 负责生活娱乐主控。
- 三个 companion 只聊天。
- companion 没有 shell/write/exec 权限。

## 5. 每次 Change 标准流程

```text
1. Environment Check
2. Preflight
3. Design
4. Approval
5. Execution
6. config validate
7. Replace
8. Restart / Reload
9. Smoke Test
10. Evidence
11. Close
```

## 6. 配置结构要点

### bindings 正确结构

```jsonc
{
  "agentId": "ops",
  "match": {
    "channel": "telegram",
    "accountId": "default"
  }
}
```

不要写成扁平结构：

```jsonc
{
  "agentId": "ops",
  "channel": "telegram",
  "accountId": "default"
}
```

### accounts 不承担 agentId

Telegram account 只负责 bot token 等账号配置，不负责路由到哪个 Agent。

路由交给顶层 `bindings[]`。

### token 不进 Git

所有 token 使用环境变量或密钥管理。

`.env` 必须进入 `.gitignore`。

## 7. 权限原则

| Agent | 工具权限原则 |
| --- | --- |
| `housekeeper` | 路由、汇总、少量读，不做重型执行 |
| `ops` | 本地调试执行主力，需要 read/exec，写入须受限 |
| `coder` | 代码读写与脚本产出，不直接部署 |
| `reviewer` | 内部 Review/Risk/Test，读和必要检查，不写生产配置 |
| `life` | 生活娱乐主控，按需给非工程权限 |
| `companion-*` | 纯聊天，不给执行类权限 |

