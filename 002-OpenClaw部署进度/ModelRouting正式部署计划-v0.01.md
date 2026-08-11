# Model Routing 正式部署计划｜v0.01

- 计划日期：2026-08-11（Asia/Taipei）
- 依据：`ModelRouting资料汇编与现状基线-v0.01.md`
- 目标：将用户指定的主模型、回退链、两类子 Agent 链和后台简单任务链部署到生产，并消除旧会话固定模型造成的绕过。
- 冻结规则：三次独立完整审查均以本文件同一 SHA-256 为对象；任何内容修改都会使原审查作废，必须重新完成三次审查。

## 1. 不变边界

本次仅改模型路由，不改：

- Agent ID、角色姓名、Telegram bot 名称、账号和 bindings；
- 角色卡、工作区、人格、语言、权限、工具 allowlist；
- 任务系统、晨报模块、工作流治理和已部署插件；
- 已停用的旧 Workboard Cron 状态；
- 历史会话 transcript 内容。

生产切换采用热加载。若验证表明必须重启 Gateway，立即停止部署并另行请求用户授权，不自行重启。

## 2. 正式路由矩阵

### 2.1 主 Agent

| Agent | 主模型 | 回退链（严格按顺序） |
|---|---|---|
| 贾南风 `housekeeper` | `custom-2/grok-4.5` | `custom-1/gpt-5.6-luna` → `qwen-coding-cn/qwen3.8-max` → `deepseek/deepseek-v4-flash` → `custom-3/LongCat-2.0` |
| 萧观音 `life` | `custom-2/grok-4.5` | `custom-1/gpt-5.6-luna` → `qwen-coding-cn/qwen3.8-max` → `deepseek/deepseek-v4-flash` → `custom-3/LongCat-2.0` |
| 鱼玄机 `ops` | `custom-1/gpt-5.6-sol` | `custom-2/grok-4.5` → `qwen-coding-cn/glm-5.2` → `deepseek/deepseek-v4-pro` → `custom-3/LongCat-2.0` |
| 步非烟 `coder` | `custom-1/gpt-5.6-sol` | `custom-2/grok-4.5` → `qwen-coding-cn/glm-5.2` → `deepseek/deepseek-v4-flash` → `custom-3/LongCat-2.0` |
| 夏姬 `reviewer` | `custom-1/gpt-5.6-sol` | `custom-2/grok-4.5` → `deepseek/deepseek-v4-pro` → `qwen-coding-cn/glm-5.2` → `custom-3/LongCat-2.0` |
| 武曌 `companion-wu` | `custom-2/grok-4.20-non-reasoning` | `qwen-coding-cn/qwen3.6-flash` → `custom-3/LongCat-2.0` → `deepseek/deepseek-v4-flash` |
| 吕雉 `companion-lv` | `custom-2/grok-4.20-non-reasoning` | `qwen-coding-cn/qwen3.6-flash` → `custom-3/LongCat-2.0` → `deepseek/deepseek-v4-flash` |
| 独孤伽罗 `companion-dugu` | `custom-2/grok-4.20-non-reasoning` | `qwen-coding-cn/qwen3.6-flash` → `custom-3/LongCat-2.0` → `deepseek/deepseek-v4-flash` |

### 2.2 子 Agent

工程、编程类调用者（`ops`、`coder`、`reviewer`）的 `subagents.model`：

- 主模型：`custom-2/composer-2.5`
- 回退：`custom-1/gpt-5.6-luna` → `qwen-coding-cn/glm-5.2` → `deepseek/deepseek-v4-flash` → `custom-3/LongCat-2.0`

任务分流、生活及非工程类调用者（`housekeeper`、`life`、三个 companion）的 `subagents.model`：

- 主模型：`custom-2/composer-2.5`
- 回退：`custom-1/gpt-5.6-luna` → `qwen-coding-cn/qwen3.8-max` → `deepseek/deepseek-v4-flash` → `custom-3/LongCat-2.0`

`agents.defaults.subagents.model` 也设置为这条非工程链，供未来未显式分类的正式 Agent 使用；工程类三个 Agent 继续用逐 Agent 对象覆盖。

这只改变子 Agent 的推理模型；子 Agent 仍继承调用者的工作区、角色上下文和工具边界，不改变角色设定。

### 2.3 后台规律性简单任务

全局默认模型对象设为：

- 主模型：`custom-3/LongCat-2.0`
- 回退：`qwen-coding-cn/qwen3.6-flash` → `deepseek/deepseek-v4-flash`

使用规则：

- 需要 LLM 的后台 Agent Turn 使用这条链。
- Grok 周配额 Agent Turn 改为该链。
- 晨报与 CodexResetWatcher 属于 Command Job，继续不调用模型。
- `utilityModel` 设为 `custom-3/LongCat-2.0`。当前 schema 不支持其独立回退对象；失败时按 OpenClaw 自身恢复路径处理。
- `ops` heartbeat 保持 `custom-3/LongCat-2.0`。当前 schema 的 heartbeat model 只接受字符串，因此不能声称它具备独立的三段 fallback。

## 3. 部署前闸门

以下条件任一不满足，不进入生产写入：

1. 三次独立完整计划审查全部通过，且引用同一计划 SHA-256。
2. `git status` 仅包含本轮预期文件，无混入旧工作区改动。
3. 八个 Telegram 账号、bindings 和 Agent ID 与基线一致。
4. 当前无活跃任务写入冲突；Gateway、任务系统插件、Cron 状态正常。
5. 候选配置通过生产版本 `openclaw config validate`。
6. 所有模型仍在 allowlist；五个 provider profile 可用。
7. `deepseek/deepseek-v4-pro` 精确调用通过。
8. 已生成可恢复备份，并记录配置、Cron、八个 Agent 会话索引的 SHA-256。

## 4. 备份与恢复资产

在 NAS 创建本轮专用、带时间戳的只读备份目录，至少保存：

- `openclaw.json`；
- Cron store；
- 八个正式 Agent 的 `sessions.json`；
- 变更前 Agent/Telegram bindings 摘要；
- 文件 SHA-256 manifest；
- 旧会话模型覆盖清单（只记录会话 key、provider/model/source，不包含聊天正文或密钥）。

回滚顺序：

1. 用原始配置恢复模型对象；
2. 用官方 `sessions.patch` 逐条恢复原会话 override；
3. 恢复 Grok 周配额 Cron payload；
4. 重新运行 config validate、账号探测、任务系统与 Cron 检查；
5. 仅在热加载确认失效且用户另行授权后才重启 Gateway。

## 5. 部署步骤

### 5.1 生成候选配置

从生产当前配置复制候选文件，只按 Agent ID 修改：

- `agents.defaults.model`
- `agents.defaults.utilityModel`
- `agents.defaults.subagents.model`
- 八个 `agents.list[].model`
- 八个 `agents.list[].subagents.model`

保留完整 `agents.defaults.models` allowlist，不使用可能收窄 allowlist 的增量 fallback 命令。

### 5.2 离线校验与差异检查

- 使用生产 OpenClaw CLI 和候选配置路径执行 `config validate`、`models status`、`agents list`。
- 生成语义差异；只允许第 5.1 节列出的路径发生改变。
- 确认身份、bindings、workspace、tools、heartbeat 频率和插件配置零差异。

### 5.3 原子切换与热加载

- 以同目录临时文件写入、校验后原子替换配置。
- 等待 Gateway 热加载并检查日志；不得重启。
- 用 `config get` 和 `agents list --json` 读回八条完整链。

### 5.4 清理旧会话固定模型

- 仅处理八个正式 Agent；历史未配置 `main` 目录不动。
- 对所有存在 `modelOverride` 或 `providerOverride` 的会话，通过官方 Gateway `sessions.patch` 设置 `model:null`，使它们回到新配置链。
- 不删除 session、不改 transcript、不改 channel/account/thread 标识。
- 清理完成后重新统计；八个正式 Agent 的遗留 user/auto model override 必须为 0。

### 5.5 更新 LLM 型后台任务

- Grok 周配额 Agent Turn 设置后台简单任务链。
- 晨报、CodexResetWatcher 继续为无模型 Command Job。
- 旧 Workboard jobs 保持 disabled。

## 6. 验收目标与证据

### 6.1 静态配置验收

- `config validate` 通过；插件 diagnostics 无新增错误。
- 八个主 Agent 的 primary/fallback 顺序逐项等于第 2.1 节。
- 八个子 Agent 路由逐项等于第 2.2 节。
- 全局后台链、utilityModel、heartbeat 和 Grok Cron 等于第 2.3 节。
- allowlist 未减少；身份与 Telegram bindings 哈希不变。

### 6.2 主 Agent 真实调用验收

为八个 Agent 分别建立一次不投递 Telegram 的短测试会话：

- 要求回复唯一验收词，避免自由发挥。
- 从运行元数据核对实际 provider/model，不能只看文本自报。
- 期望分别命中 Grok 4.5、GPT-5.6 Sol 或 Grok 4.20 non-reasoning。
- 测试会话结束后不得留下会话级 model pin。

### 6.3 子 Agent 真实调用验收

至少完成两次真实 child run：

- 工程类：由 `ops` 或 `coder` 产生子 Agent，实际模型必须为 `custom-2/composer-2.5`。
- 任务分流/生活类：由 `housekeeper` 或 `life` 产生子 Agent，实际模型必须为 `custom-2/composer-2.5`。

同时核对 child session 的调用者、工作区、工具边界、超时和结束状态，防止模型正确但路由到错误角色。

### 6.4 回退链验收

- 对所有 fallback 模型做精确 provider/model 健康调用，证明每个节点可独立使用。
- 在 NAS 临时目录复制最小配置和凭据引用，禁用 channel delivery 与非必要插件；为测试专用 primary 配置一个指向本机关闭端口的临时 provider，并把健康模型设为 fallback。
- 使用生产同版本 CLI 的 `openclaw agent --local` 发起真实调用，要求运行元数据明确显示 primary 连接失败后转到预定 fallback；至少验证一次主 Agent 形式和一次子 Agent 模型对象形式。
- 隔离测试不得连接生产 Gateway、不得写入正式 session store；完成后删除临时测试目录。若隔离环境无法安全取得凭据引用或 CLI 行为与 Gateway 不同，验收判定为不通过，不得用静态配置替代。
- 比较部署前后配置哈希，确认探测和失败恢复没有永久改写主配置。

### 6.5 系统回归验收

- 八个 Telegram 账号 `connected=true` 且 probe 正常。
- Gateway 运行稳定，无重启；sessions/list、agents/list、cron/list 可读。
- 任务系统插件健康；活跃/阻塞/归档查询正常。
- 晨报与 CodexResetWatcher 的 Command Job 定义不变；旧 Workboard jobs 仍 disabled。
- 观察一次自然 heartbeat 或核对最新 heartbeat 运行元数据，确认使用 LongCat 且没有异常高频重试。
- 会话覆盖重新扫描：八个正式 Agent 遗留 override 为 0。

## 7. 文档与 GitHub 同步

验收通过后：

1. 新建 `ModelRouting部署与生产验收报告-v0.01.md`，记录备份、变更、测试、限制和回滚点。
2. 新增 CurrentProgress 新版本，不覆盖 v0.30。
3. 新增 SourceIndex 新版本，不覆盖 v0.28。
4. 更新八个 Agent 的 DeploymentStatus 现行版本，明确主链与子 Agent 链；不得伪称 heartbeat/utilityModel 有 schema 不支持的 fallback。
5. 更新 README 当前入口。
6. 运行 UTF-8/链接、`git diff --check`、敏感信息扫描。
7. 提交并推送 `codex/model-routing-20260811`，确认远端 commit 与本地一致。

## 8. 最终通知

所有验收、文档和 GitHub 同步完成后，才由贾南风的 `housekeeper` Telegram 账号向用户发送一次自然中文通知。通知应包含：

- 已完成的模型分层；
- 主 Agent、子 Agent、后台任务和旧会话覆盖均已处理；
- 验收结论；
- 仍存在的 schema 限制或未执行的安全故障注入；
- GitHub 分支/提交结果。

不得发送 Card/Task/UUID/CWD 等工业内部信息，不得在完成前预告“已完成”。

## 9. 通过标准

只有同时满足以下条件，任务才可判定完成：

- 三次同哈希独立完整审查通过；
- 生产配置、旧会话、LLM 型 Cron 均已按计划处理；
- 八个主 Agent 和两类子 Agent 均有真实运行元数据证明；
- Telegram、任务系统、Cron、Gateway 回归通过；
- 文档提交并推送 GitHub；
- 贾南风 Telegram 通知送达。
