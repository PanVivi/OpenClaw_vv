# 001 OpenClaw架设部署｜SourceIndex 来源索引｜v0.01

## 1. 原始来源文件

完整对话记录：

```text
\\192.168.1.171\Documents\你能帮我搜索对话记录吗？ (1).mht
```

本次整理以完整版本为准。

## 2. 关键锚点

### 十角色中间方案

```text
openclaw-house-architecture-v3
```

用途：理解早期设计来源。  
注意：不是最终落地结构。

### Agent 数量精简

关键语义：

```text
Agent 数量可以削减，因为有些 Agent 我也没有必要和它单线联系。
可以去除一些名字，如薛涛、文姜、夏姬。
```

结论：

```text
薛濤 / 文薑 / 夏姬 → reviewer 内部阶段
```

### v2.1 实际目录

关键锚点：

```text
agents/housekeeper
agents/ops
agents/coder
agents/reviewer
agents/life
agents/companion-dugu
agents/companion-wu
agents/companion-lv
```

### 部署事故

```text
INC-2026-0001
Change-0003
```

结论：

- `Change-0003` 已 close。
- Gateway 和 Telegram 已恢复。
- 完成的是 v2.1 基础配置，不是所有 agent 全配置。

## 3. 本次修正文档的重点

- 修正“文薑/薛濤/夏姬仍是独立 Agent/Bot”的错误。
- 修正“最终设计是十角色”的错误。
- 修正“完整架构已部署”的错误。
- 明确当前下一步是 Step 2：迁移魚玄機到 `agents/ops`。

