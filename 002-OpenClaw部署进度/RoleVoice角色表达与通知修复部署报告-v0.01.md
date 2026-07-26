# 角色表达与通知修复部署报告｜v0.01

日期：2026-07-26

分支：`agent/lossless-content-update`

生产：OpenClaw `2026.7.1-2` / Node.js `22.22.3`

## 结论

角色表达与通知工程字段泄露已完成正式计划、三轮独立审核、生产部署和真实验收，结果通过。

- 八角色保留原姓名、人格、职责、权限和风险边界。
- 内部工作记录与少主沟通成稿分离；默认不再外发 Card、run、event、heartbeat、proof、英文状态、UUID 或下游原文。
- `WorkboardNotificationRelay` 已从工程模板改为确定性的賈南風角色通知。
- 没有修改 `openclaw.json`，没有重启 Gateway，没有删除或重建会话、记忆、binding 或 Bot。

## 正式计划与三轮审核

- `001-OpenClaw规划设计/DeploymentPlan部署方案-v0.12.md`
- `002-OpenClaw部署进度/RoleVoice计划审核一-官方机制一致性-v0.01.md`
- `002-OpenClaw部署进度/RoleVoice计划审核二-无损安全与并发-v0.01.md`
- `002-OpenClaw部署进度/RoleVoice计划审核三-可部署性与真实验收-v0.01.md`

三轮分别审核官方机制、无损安全与并发、可部署性与真实验收；每轮发现均先回写正式计划，再进入下一轮。

## 备份与切换

- NAS 备份：`/Volume3/OpenClaw/home/.openclaw/backups/role-voice-relay-20260726T125033+0800`
- 备份包含八角色更新前 `AGENTS/SOUL`、旧 Relay、Relay audit、agents、Cron、config validate、待发事件和 SHA-256 基线。
- 切换时只暂停 `WorkboardNotificationRelay` Cron；`WorkboardDispatchPump` 继续运行。
- 新文件先以 `.new` 上传，线上语法和 16 项自测通过后原子替换。
- Relay Cron 随即恢复启用，每 60 秒运行；切换前后待发事件均为 0。

## 实际变更

### 共同协议 v0.08

新增“内部工作面 / 少主沟通面”：

- 内部继续使用准确工程字段。
- 面向少主先直接给角色化自然结论。
- 默认隐藏内部编号、英文状态、工具名、固定 JSON 和 worker 原文。
- 明确索要技术细账时再单列原始字段。
- 子 Agent 默认向父 Agent 交工程记录，父 Agent 负责最终转述。

### 八角色版本

| Agent | 当前版本 |
| --- | --- |
| housekeeper / 賈南風 | v1.14 |
| ops / 魚玄機 | v0.17 |
| coder / 步非煙 | v0.11 |
| reviewer / 夏姬 | v0.09 |
| life / 蕭觀音 | v0.11 |
| companion-dugu / 獨孤伽羅 | v0.08 |
| companion-wu / 武曌 | v0.08 |
| companion-lv / 呂雉 | v0.08 |

### Relay

- 完成、失败、阻塞、失联/超时、取消分别使用賈南風自然语言模板。
- 常见额度、权限、凭据、网络、超时和依赖原因做确定性自然中文映射。
- 标题去除控制字符、UUID、时间戳和验收/测试标签并限制长度。
- 未知原始错误不直接外发；完整事实继续保存在 Workboard 和 Relay audit。
- audit 新增 `renderedMessage`，可核对实际发送内容。
- 自测由 7 项增加到 16 项，并新增 `--preview-fixtures`。

## 真实验收

### 八角色行为

使用 `deepseek/deepseek-v4-pro` 显式单模型、`fallbackUsed=false`：

- 八个新隔离 session 均加载各自正确 workspace。
- 八个 `systemPromptReport` 均为 `truncatedFiles=0`。
- 八条普通回复均至少出现现有角色锚点并直接回答，未泄露内部工程字段。
- housekeeper、ops、reviewer 的技术细账测试均先给自然结论，再单列模型、workspace 和 bootstrap。
- 最终真实 Telegram 首次成稿虽然送达，但仍罗列 Gateway/Bot/Telegram/工作板等组件，按验收标准判失败，没有勉强放行。
- 随后共同协议与八套 `AGENTS.md` 补入“完成汇报也不得罗列组件和验收清单”；八角色分别接受一条故意塞满工程组件的对抗输入，全部成功提炼为角色自然语言，零截断、无 fallback。
- 贾南风真实 Telegram 会话重新生成最终通知：`少主，本轮全办妥了，所有角色都已按新规核验完毕。本宫替你盯牢了，不必操心。`，delivery status 为 `sent/succeeded`。

### Workboard→Relay→Telegram

- 卡片：`eea17b56-fdd0-403b-80c1-0fe7bd82d247`
- worker：ops 独立 Workboard session
- 状态：ready→running→done
- 证据：真实 heartbeat、proof、completed notification
- Relay event：`b420d6a2-e96c-4605-a6ce-2ac0b937a22d`
- Telegram message ID：401
- 实际消息：`少主，本宫盯着的「新通知表达」已经办妥。`
- 发送后 cursor 已推进，待发事件为 0，没有重复通知。

### 回归

- Gateway service running，RPC ok，配置 valid 且 warnings 为空，未重启。
- 8/8 Telegram account 均 enabled/configured/running/connected/probe ok。
- 八个 Agent 各保持 1 条 binding；A2A enabled，allowlist 仍为原八角色。
- session 文件按同一命令口径从 1298 增至 1316，只新增验收会话。
- memory 文件保持 219；credentials/secrets 文件保持 10。
- 仓库与生产的 16 个角色文件及 Relay 共 17 个 SHA-256 全部一致。

## 回滚

若后续发现表达回归：

1. 只暂停 Relay Cron。
2. 从本轮 NAS 备份恢复八角色 `AGENTS/SOUL` 和 Relay。
3. 不回退 Workboard cursor，不删除 Relay audit。
4. 不覆盖 session、transcript、memory、binding 或凭据。
5. 重新通过语法、自测、config、Gateway 与 Bot probe 后恢复 Cron。
