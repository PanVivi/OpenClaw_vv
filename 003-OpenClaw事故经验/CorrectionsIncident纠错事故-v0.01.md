# 001 OpenClaw架设部署｜CorrectionsIncident 纠错事故｜v0.01

## 1. 文档纠错

### 错误 1：把十角色方案当成最终落地方案

十角色方案是重要中间设计，但后续已精简。

正确结论：

```text
最终 v2.1 落地是 8 个 agent 目录：
housekeeper / ops / coder / reviewer / life / companion-dugu / companion-wu / companion-lv
```

### 错误 2：把薛濤、文薑、夏姬写成独立 Agent/Bot

后续讨论明确：

- 有些 Agent 没必要单线联系。
- 薛濤、文薑、夏姬可以去除独立 Agent/Bot 形态。
- 合并为 `reviewer` 的内部阶段。

正确结构：

```text
reviewer
├── Review  # 原薛濤
├── Risk    # 原夏姬
└── Test    # 原文薑
```

### 错误 3：说完整架构已经部署

`Change-0003` 完成的是：

- `ops` agent。
- Telegram accounts。
- bindings。

不是完整 v2.1 全部 Agent 配置。

## 2. 事故编号

| 项目 | 内容 |
| --- | --- |
| Incident | `INC-2026-0001` |
| Change | `Change-0003` |
| 状态 | Resolved / Closed |
| 影响 | Gateway crash loop，Telegram bot 服务中断 |
| 根因 | Merge 脚本生成了不兼容 Schema 的配置 |

## 3. 根因

### bindings 扁平结构错误

错误：

```jsonc
{
  "agentId": "ops",
  "channel": "telegram",
  "accountId": "default"
}
```

正确：

```jsonc
{
  "agentId": "ops",
  "match": {
    "channel": "telegram",
    "accountId": "default"
  }
}
```

### accounts.default.agentId 不兼容

`agentId` 不应写在 `channels.telegram.accounts.default`，路由交给顶层 `bindings[]`。

## 4. 修复流程

```text
Environment Check
↓
Preflight
↓
Approval
↓
Change-0003A：重现 Merge，发现 bindings 错误
↓
Change-0003B：修复 bindings
↓
Change-0003C：修复 accounts.default.agentId
↓
Change-0003D：Replace & Restart + Smoke Test
↓
Close Change
```

## 5. 另一个关键纠错：/stop 后状态不能靠记忆判断

对话中出现过一次执行中断。后来确认：

- Step 3 Replace 已完成。
- Step 4 Restart 当时不确定。
- 不能因为 Agent 说“没有操作”就相信没有修改。
- 必须用只读检查确认当前生产状态：
  - `systemctl status openclaw.service`
  - `systemctl show -p ActiveEnterTimestamp openclaw.service`
  - `journalctl -u openclaw --since "20 minutes ago"`

原则：不要争论历史记忆，先确认当前系统实际状态。

