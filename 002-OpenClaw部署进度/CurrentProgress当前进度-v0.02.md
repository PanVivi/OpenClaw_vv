# 001 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.02

## 1. 一句话状态

v2.1 基础配置和 Step 1 Workspace Initialization 已完成；下一步是 Step 2 迁移魚玄機到 `agents/ops`。

## 2. 已完成

| 项目 | 状态 |
| --- | --- |
| `INC-2026-0001` | Resolved |
| `Change-0003` | Closed |
| Gateway | 已恢复，正常运行 |
| Telegram Provider | 正常收发 |
| `ops agent + accounts + bindings` | 已部署 |
| Step 1 Workspace Initialization | 已完成 |

Step 1 结果：

- 新建目录：26 个。
- 已存在跳过：`scripts/`。
- 新建文件：10 个。
- `.manifest.json` 已创建：
  - `schema_version: 2.1`
  - `project: hehuan-sect`
  - `workspace: hehuan-v2.1`

实际创建的 Agent 目录：

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

## 3. 当前下一步

Step 2：Agent Migration

目标：

```text
把当前 workspace/ 中魚玄機自己的 SOUL.md、AGENTS.md 安全迁移到 agents/ops/
```

注意：

- 必须先备份。
- 必须先 diff。
- 必须 cat 脚本核对。
- 必须 `bash -n` 语法检查。
- 不允许直接覆盖。

## 4. 未完成

- `agents/ops` 配置迁移。
- `agents/housekeeper` 配置。
- `agents/coder` 配置。
- `agents/reviewer` 内部 Review/Risk/Test prompt。
- `agents/life` 配置。
- 三个 companion 配置。
- providers / model 配置完善。
- memory / knowledge / skills 目录内容填充。
- issues 数据库机制。
- 统一 JSONL 日志规范落地。

## 5. Known Issue

`OBSERVATION-001`：OpenAI API Key 缺失。

不影响当前 DeepSeek + 魚玄機连通，但影响后续 Codex/OpenAI 相关 Agent。

