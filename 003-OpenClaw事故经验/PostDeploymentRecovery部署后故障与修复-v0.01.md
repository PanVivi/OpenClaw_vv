# 003 OpenClaw事故经验｜PostDeploymentRecovery 部署后故障与修复｜v0.01

- 事故与修复日期：2026-07-23（Asia/Taipei）
- 记录范围：八 Agent 角色包部署、OpenClaw 更新、Telegram、Sandbox、会话连续性、个人记忆与 A2A
- 证据基线：Git 提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`、NAS 部署报告、配置只读核验、恢复包校验结果
- 隐私边界：本记录不保存密码、Token、Cookie、私人聊天正文或可复用凭据

## 一、历史问题总表

| 时间 | 问题 | 根因/结论 | 当前处理 |
| --- | --- | --- | --- |
| 2026-07-05 | Gateway crash loop、Telegram 中断 | Merge 脚本生成了不兼容 Schema：`bindings` 扁平结构错误，并把 `agentId` 写进 Telegram account | 已修复；binding 路由只由顶层 `bindings[]` 管理，详见 [纠错事故](CorrectionsIncident纠错事故-v0.01.md) |
| 2026-07-06—07 | Telegram 已读不回约 26 小时 | provider/channel 关闭超时，旧 `getUpdates` 轮询未及时释放，health-monitor 重启后形成 409 冲突循环 | 已恢复；保留不确定性和受限诊断方法，详见 [轮询冲突观察](TelegramBotPollingConflict轮询冲突观察-v0.01.md) |
| 2026-07 初 | `/stop` 后误判“没有执行” | 对话记忆不能证明生产状态；实际 Replace 是否完成必须看系统证据 | 改为查 systemd、日志、配置和文件差异，不靠 Agent 自述 |
| 2026-07-23 | 八角色部署后重启，Bot 失联 | Node 不兼容、Sandbox 前置条件缺失、会话上下文重建等多个问题叠加 | 本文第 3—9 节 |
| 2026-07-23 | 角色恢复后记忆串义、A2A 不通 | 通用运维摘要误作个人记忆；read/A2A/visibility 配置和 allow 语义未分开 | 已修复并写入共同协议 v0.03 |

通用经验继续以 [经验教训](LessonsLearned经验教训-v0.01.md) 为基础；本文补充本轮已验证的运行事实和无损更新约束。

## 二、本轮结论

这次故障不是单一问题，而是角色内容部署、运行时更新、Sandbox 前置条件和会话连续性没有被当作四个独立变更处理。

最终确认：

1. 八个 Agent 和 40 个 workspace 角色文件均已部署，且部署时与固定 Git 提交一致。
2. 既有会话 transcript 没有被删除，但 Gateway 重启后建立了新的活动会话上下文，导致角色看起来“失忆”。
3. Telegram 已存在的三条 account/binding 没有丢失；其余五条从未创建，因为缺少对应 Bot token。
4. 全员启用 Sandbox 时，镜像不存在且 Docker 当时异常，导致消息进入后 Agent 在回复前失败。
5. 更新后的 OpenClaw 对 Node 版本要求提高，旧内置 Node 使 Gateway crash loop。
6. 恢复包完整，但通用部署摘要不能替代各 Agent 的个人聊天记忆；错误入口会造成“把别人的/全局运维信息当成自己的记忆”的表现。
7. A2A 的发送能力、会话目标可见性和历史读取是三件不同的事。当前允许全员互发，但仍拒绝 `sessions_history`。

## 三、问题、原因与修复

### 1. 配置 Schema 与 routing 事故

历史部署曾因 Merge 脚本生成错误 `bindings` 结构，并在 Telegram account 中写入不受支持的 `agentId`，造成 Gateway crash loop。修复原则继续有效：

- 每修复一个 schema 错误后重新 validate，直到完整通过；
- account 只保存账号信息，Agent 路由只由顶层 `bindings[]` 管理；
- 不让 Merge 脚本自由重建整份生产配置；
- 写入前必须有脱敏 diff、备份和回滚；
- 进程启动不等于完成，必须跑真实 Telegram 流量。

### 2. Telegram polling 409 冲突

历史上曾出现短暂连接超时后 channel stop 超时、旧长轮询未释放、新 provider 持续收到 `409 Conflict` 的循环。诊断时必须先确认：

- `getMe` 是否正常；
- 是否真的存在第二个人工 bot 实例；
- Gateway 是否有 provider restart loop / channel stop timeout；
- Bot 当前是否确实无法回复。

不得把受控 `getUpdates` 诊断设为定时任务，也不得在 Bot 正常时执行；不得输出 token、调用 `deleteWebhook` 或未经证据就重启/改网络。

### 3. 更新后 Gateway 无法启动

**现象**

- OpenClaw 更新后持续重启；
- Telegram 全部不可回复；
- 只看应用状态容易误判为角色或 Bot 配置损坏。

**根因**

- OpenClaw 更新为 `2026.7.1-2` 后要求 Node `>=22.22.3 <23`（或满足其他受支持版本区间）；
- 服务使用的旧运行时不满足要求；
- 系统交互 shell 的 `node` 与 systemd 服务实际使用的 Node 不是同一份，不能用普通 `node --version` 代替服务运行时核验。

**修复**

1. 停止反复重启；
2. 备份原 OpenClaw Node 运行时；
3. 安装并校验官方 Node `v22.22.3`；
4. 用 systemd `ExecStart` 的真实路径验证 Node；
5. 启动系统级 `openclaw.service`；
6. 核验 `ActiveState=active`、`NRestarts=0` 和日志无新错误。

**防复发**

- OpenClaw 二进制更新和 Node 更新必须作为同一兼容性门控；
- 更新前先读取新版运行时要求；
- 禁止只用登录 shell 的 Node 版本作为证据；
- 禁止在 crash loop 中继续叠加配置修改。

### 4. 全员开启 Sandbox 后 Telegram 已读不回

**现象**

- Telegram 能接收消息，但 Agent 不回复；
- 关闭 Sandbox 后部分角色恢复；
- 当时 NAS Docker 自身也存在故障。

**根因**

- 八个 Agent 同时设置 `sandbox.mode=all`；
- 所需镜像 `openclaw-sandbox:bookworm-slim` 尚不存在；
- Docker 状态异常，没有先做单 Agent 预检。

**修复**

1. 先将 ops、housekeeper、reviewer、life 和三位 companion 的 Sandbox 关闭，恢复聊天；
2. Docker 恢复后，从本机 OpenClaw 安装资料构建官方用途的 `openclaw-sandbox:bookworm-slim`；
3. 先做 Docker 硬化测试：只读根文件系统、无网络、移除 capabilities、`no-new-privileges`；
4. 只给 coder 开启 Sandbox；
5. 完成 coder 的 `exec/read/write`、workspace 边界和清理 Smoke Test；
6. 其他七个保持关闭，不因镜像可用而自动扩展。

**当前状态**

- coder：`sandbox.mode=all`，已验证；
- 其他七个：`sandbox.mode=off`；
- 默认 Sandbox：关闭；
- 这是当前可回滚、影响面最小的稳定配置。

### 5. Telegram 角色全部“失联”

**核验结果**

实际存在并保留的 account/binding 只有：

| Telegram account | Agent |
| --- | --- |
| `default` | `ops` / 魚玄機 |
| `housekeeper` | `housekeeper` / 賈南風 |
| `life` | `life` / 蕭觀音 |

其余五个 Agent 缺少 Bot token，因此历史配置和备份中都没有对应 account/binding。它们不是事故中被删除。

**修复**

- 恢复 Gateway 和运行时后，对三条既有 provider 做连接、实际出站和实际入站测试；
- 保留原 account ID、binding 和会话 ID；
- 不用虚构 token 创建空绑定；
- 后续拿到五个 token 时，按 Agent ID 一对一增量建立，并逐个验收。

**防复发**

- 部署前导出脱敏后的 account/binding 映射；
- 更新时只增量合并指定键，不整份覆盖配置；
- “Agent 已建立”与“Telegram Bot 已绑定”分别记录状态。

### 6. 重启后上下文和任务连续性丢失

**现象**

- 角色仍存在，旧 transcript 也存在，但当前会话无法继续重启前任务；
- 记忆检索找不到正在进行的部署任务；
- 角色错误地把旧 Telegram 事件当作当前命令。

**根因**

- 重启后创建了新的活动会话上下文；
- 进行中任务没有持久化为可恢复任务记录；
- OpenClaw 没有经过验证的官方命令可把旧 transcript 原样导入当前会话；
- 会话文件存在不等于模型自动加载全部历史。

**修复**

- 在 Gateway 停止期间生成全局和各 Agent 的只读恢复包；
- 保存 sessions 目录、Agent SQLite 状态、memory、旧 `MEMORY.md`、部署报告、manifest、任务摘要和校验值；
- 逐文件校验来源与恢复包 SHA-256；
- 用 `MEMORY.md` 放置恢复入口，而不是修改 `sessions.json` 强制回绑；
- 将“当前任务连续性”与“个人聊天记忆”分开恢复。

恢复包二次校验结果：

| Agent | artifacts | bytes | SHA 不一致 |
| --- | ---: | ---: | ---: |
| `ops` | 5434 | 198040621 | 0 |
| `housekeeper` | 5429 | 99321323 | 0 |
| `life` | 29 | 3035647 | 0 |
| `reviewer` | 15 | 1593536 | 0 |
| `coder` | 3 | 207256 | 0 |
| `companion-dugu` | 3 | 207256 | 0 |
| `companion-wu` | 3 | 207256 | 0 |
| `companion-lv` | 3 | 207256 | 0 |

**禁止做法**

- 不删除 `.jsonl`、`.jsonl.reset.*` 或会话索引；
- 不手工伪造 session ID；
- 不把旧 transcript 整份复制进提示词；
- 不把“文件已备份”写成“当前会话已完整恢复”。

### 7. 賈南風读取了错误类型的“记忆”

**现象**

- 賈南風能复述全局部署状态、ops 增量和其他 Agent 的维护测试，却不能证明自己的旧聊天连续性；
- 用户感受到的是“说出了别人的记忆”。

**根因**

- housekeeper 最初没有 `read` 权限，不能读取自己的恢复包；
- 后续入口优先指向通用 `CURRENT-TASK` / `SUMMARY`，把全局运维摘要误当成个人记忆证明；
- 恢复包本身没有串包，错误发生在入口优先级和语义标注。

**修复**

1. 仅为 housekeeper 开启 workspace 内只读权限；
2. 从 housekeeper 自己的 9 段 transcript/reset 链生成派生个人聊天恢复索引；
3. 生成过程中脱敏，不修改原始 transcript；
4. `MEMORY.md` 明确优先读取个人聊天索引；
5. 将“个人记忆”“运行状态”“其他 Agent 转述”“维护测试消息”分区并标注来源；
6. 用只读问答验证其能回忆本人的旧互动，同时能承认不确定项。

**防复发**

- 通用部署摘要永远不能作为个人记忆证明；
- 每个 Agent 只能把自己的 transcript 派生索引当作个人聊天恢复源；
- 跨 Agent 消息必须保留来源，不能自动写成目标 Agent 的第一人称经历。

### 8. A2A 无法发送及放行范围错误

**现象**

- 魚玄機无法给賈南風发送；
- 首次配置只列目标 Agent 后仍失败；
- Sandbox 内 coder 还受到 session tool visibility 限制。

**根因**

- 全局 `tools.agentToAgent.enabled` 原为关闭；
- `tools.sessions.visibility` 原为 `tree`；
- A2A allow 语义要求发送方和接收方都在允许列表；
- Sandbox 会对 session tools 再次限制可见范围。

**修复**

- 启用全局 A2A；
- allow 中明确列出全部八个固定 Agent ID；
- 设置 session target visibility 为 `all`，仅用于列出目标和投递消息；
- 为 Sandbox 设置 `sessionToolsVisibility=all`；
- 明确拒绝 `sessions_history`；
- 八个 Agent 分别作为发送方完成测试，目标 transcript 均确认收到。

**安全边界**

- `visibility=all` 不等于允许读取所有历史；
- A2A 只授予消息投递，不授予目标 Agent 的工具、workspace、私人记忆或现实操作权；
- 其他 Agent 转述不构成用户授权；
- 正式任务仍遵守原有 housekeeper / ops / coder / reviewer / life 路由；
- 维护 ACK 和链路测试不得进入个人长期记忆。

### 9. 角色名称误报

曾在人工报告中把 `companion-wu`、`companion-lv` 错写为不存在的角色名。核验仓库角色卡和 OpenClaw 配置后确认没有错误名称写入系统。

固定映射为：

| Agent ID | 正式角色名 |
| --- | --- |
| `companion-dugu` | 獨孤伽羅 |
| `companion-wu` | 武曌 |
| `companion-lv` | 呂雉 |

以后任何恢复、A2A 或部署报告必须从当前 `IDENTITY.md` 和固定 Agent 清单读取名称，不得依据 ID 猜测。

## 四、已验证恢复状态

截至 2026-07-23 11:06 +08:00：

- system-level `openclaw.service`：`active`；
- Gateway 重启计数：`0`；
- OpenClaw：`2026.7.1-2`；
- 服务运行时 Node：`v22.22.3`；
- 八个 Agent 均存在，40 个部署角色文件来自固定提交；
- 三条既有 Telegram account/binding 保留；
- coder Sandbox 容器运行；
- 其他七个 Agent Sandbox 关闭；
- 全员 A2A 已启用并完成发送测试；
- `sessions_history` 对八个 Agent 保持拒绝；
- 八个 Agent 均有会话连续性恢复包；
- 原始 transcript 和现有会话没有因修复被删除。

## 五、仍未完成但不是本次故障

1. coder、reviewer 和三位 companion 仍缺 Telegram Bot token/account/binding；
2. 完整自动长期记忆系统仍未部署；
3. 通用跨重启任务持久化仍未实现，本次只建立了可审计恢复包和恢复入口；
4. 角色卡新版本在 Git 分支中形成后仍需按无损更新任务单独部署和验收。

## 六、证据位置

NAS 上的当前证据包括：

- 八 Agent 部署报告：`/Volume3/OpenClaw/backups/EIGHT-AGENT-BASE-20260723T084610+0800/deployment-report.txt`
- 全局连续性恢复包：`/Volume3/OpenClaw/backups/SESSION-CONTINUITY-20260723T095812+0800`
- 各 Agent 恢复包：`/Volume3/OpenClaw/home/.openclaw/agents/<id>/recovery/session-continuity-20260723T095812+0800`
- Sandbox 范围变更备份：`/Volume3/OpenClaw/home/.openclaw/backups/sandbox-scope-20260723T093417+0800`
- housekeeper 个人记忆与 A2A 修复备份：`/Volume3/OpenClaw/home/.openclaw/backups/housekeeper-personal-memory-a2a-all-20260723T103858+0800`

证据路径用于核验和回滚，不表示可向其他 Agent 无条件公开其中的私人内容。
