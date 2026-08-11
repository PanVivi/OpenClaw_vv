# Model Routing 部署与生产验收报告｜v0.01

- 完成日期：2026-08-11（Asia/Taipei）
- 生产版本：OpenClaw `2026.7.1-2 (0790d9f)`
- 计划：`ModelRouting正式部署计划-v0.01.md`
- 计划 SHA-256：`62702BF948B89B185CA2663850F0E4A03DD7DC49A7232517714CB94D9EBD188D`
- 审查：三次独立完整审查均针对上述同一哈希并通过。

## 1. 结论

模型路由已部署并通过生产验收：

- 八个正式 Agent 均按用户指定的 primary/fallback 顺序配置。
- 工程类与生活/分流类子 Agent 均使用独立的 Composer 2.5 主链。
- LLM 型后台简单任务使用 LongCat 低成本链；确定性 Command Job 继续无模型。
- 208 条历史会话模型覆盖已清除；测试新增的 1 条子 Agent auto override 也已清除，最终遗留为 0。
- 八个主 Agent、两类真实子 Agent、主链与子 Agent 的真实隔离故障转移均通过。
- Agent ID、姓名、Telegram bot、账号、bindings、workspace、工具权限和任务系统未改变。
- Gateway 未重启。

## 2. 正式生产路由

| Agent | 主模型 | 回退链 |
|---|---|---|
| `housekeeper` | `custom-2/grok-4.5` | Luna → Qwen 3.8 Max → DeepSeek V4 Flash → LongCat |
| `life` | `custom-2/grok-4.5` | Luna → Qwen 3.8 Max → DeepSeek V4 Flash → LongCat |
| `ops` | `custom-1/gpt-5.6-sol` | Grok 4.5 → GLM 5.2 → DeepSeek V4 Pro → LongCat |
| `coder` | `custom-1/gpt-5.6-sol` | Grok 4.5 → GLM 5.2 → DeepSeek V4 Flash → LongCat |
| `reviewer` | `custom-1/gpt-5.6-sol` | Grok 4.5 → DeepSeek V4 Pro → GLM 5.2 → LongCat |
| `companion-wu` | `custom-2/grok-4.20-non-reasoning` | Qwen 3.6 Flash → LongCat → DeepSeek V4 Flash |
| `companion-lv` | `custom-2/grok-4.20-non-reasoning` | Qwen 3.6 Flash → LongCat → DeepSeek V4 Flash |
| `companion-dugu` | `custom-2/grok-4.20-non-reasoning` | Qwen 3.6 Flash → LongCat → DeepSeek V4 Flash |

工程子 Agent（ops/coder/reviewer）：

`Composer 2.5 → Luna → GLM 5.2 → DeepSeek V4 Flash → LongCat`

任务分流、生活及非工程子 Agent（housekeeper/life/三个 companion）：

`Composer 2.5 → Luna → Qwen 3.8 Max → DeepSeek V4 Flash → LongCat`

后台 LLM 任务：

`LongCat → Qwen 3.6 Flash → DeepSeek V4 Flash`

## 3. 备份与切换

- 备份目录：`/Volume3/OpenClaw/home/.openclaw/backups/model-routing-20260811T135305`
- 切换前配置 SHA-256：`8ad3152219bd898803a4b97e7be48db39bd86265d35bf9b576ef726aa4bf7a6d`
- 切换后配置 SHA-256：`9182d67571bdc8829c4483fe3e559209a3c77b552b2d6a368ab6596ada5eb9f2`
- 身份/绑定/工具摘要 SHA-256：切换前后均为 `d372b0ec9a1e3ae866c05d60db79ac4dc06275198cf3f3bb5d4ed14aa5a36f32`
- 候选配置由生产同版本 CLI 验证通过，原子替换后由 Gateway 热加载；没有重启。
- 备份包含配置、Cron store、八个正式 Agent 的 session store、旧 override 清单和 manifest。

## 4. 会话迁移

- 部署前八个正式 Agent 有 208 条有效模型覆盖。
- 全部通过官方 Gateway `sessions.patch model:null` 逐条清除。
- 没有删除 session 或 transcript。
- 子 Agent 验收产生 1 条 `source=auto` 的 Composer 测试覆盖；验收后再次通过官方接口清除。
- 最终重新扫描：模型覆盖 0。

## 5. 真实调用验收

### 5.1 八个主 Agent

每个 Agent 使用独立、不投递 Telegram 的验收会话，回复 `ROUTE_OK`，并从运行元数据核对真实 provider/model：

| Agent | 实际 provider/model | 结果 |
|---|---|---|
| `housekeeper` | `custom-2/grok-4.5` | 通过 |
| `life` | `custom-2/grok-4.5` | 通过 |
| `ops` | `custom-1/gpt-5.6-sol` | 通过 |
| `coder` | `custom-1/gpt-5.6-sol` | 通过 |
| `reviewer` | `custom-1/gpt-5.6-sol` | 通过 |
| `companion-wu` | `custom-2/grok-4.20-non-reasoning` | 通过 |
| `companion-lv` | `custom-2/grok-4.20-non-reasoning` | 通过 |
| `companion-dugu` | `custom-2/grok-4.20-non-reasoning` | 通过 |

### 5.2 两类子 Agent

- 工程类：`ops` 创建真实 child，运行轨迹为 `custom-2/composer-2.5`，`CHILD_ROUTE_OK` 完成。
- 生活类：`life` 创建真实 child，运行轨迹为 `custom-2/composer-2.5`，`CHILD_ROUTE_OK` 完成。
- 子 Agent 仍在调用者的 Agent/工作区边界内，没有跨角色或扩大工具权限。

### 5.3 模型节点健康

部署前 OpenClaw provider probe 验证 `custom-1`、`custom-2`、`custom-3`、`qwen-coding-cn`、`deepseek` 均可用；精确调用成功覆盖 Grok 4.5、GPT-5.6 Sol、GPT-5.6 Luna、Composer 2.5、Grok 4.20 non-reasoning、Qwen 3.8 Max、Qwen 3.6 Flash、GLM 5.2、LongCat、DeepSeek V4 Flash。DeepSeek V4 Pro 另以真实 reviewer 会话验证，实际元数据为 `deepseek/deepseek-v4-pro`，回复 `MODEL_PROBE_OK`。

## 6. 真实故障转移验收

在 staging 内创建独立 HOME、独立 state、独立 session store 和无 Telegram delivery 的临时配置：

- 测试 primary 指向 `127.0.0.1:9` 的关闭端口。
- 主 Agent 场景：OpenClaw 记录 primary 网络失败、`candidate_failed`，随后 `custom-3/LongCat-2.0` 返回成功、`candidate_succeeded`。
- 子 Agent 场景：child 同样先发生网络失败，再由 LongCat 成功返回 `CHILD_FAILOVER_OK`。
- 两个场景均为 `fallbackUsed=true`；生产 Gateway 未参与，生产配置哈希前后不变。
- 本地子 Agent 父进程在 child 和父完成词都出现后仍驻留，验收脚本在 45 秒上限终止该隔离父进程；child 本身已正常 `stopReason=stop`。这不影响生产子 Agent。

## 7. 回归验收

- Telegram：8 个账号，8/8 `connected=true`，8/8 probe ok；用户名与部署前一致。
- Event loop：`degraded=false`。
- OpenClaw：`config validate` 通过；`plugins doctor` 为 `No plugin issues detected`。
- 任务系统：`tasks.list` 可读，验收时 active=0。
- Cron：晨报和 CodexResetWatcher 仍为 enabled/ok 的无模型 Command Job；Grok 周配额 Agent Turn 已使用后台链；三个旧 Workboard job 仍 disabled。
- Heartbeat：2026-08-11 14:28 +08:00 的自然运行实际 `provider=custom-3`、`modelId=LongCat-2.0`，返回 `HEARTBEAT_OK`。
- Gateway：没有重启，Telegram `lastStartAt` 未变化。
- 最终会话覆盖：0。

## 8. 验收过程中的异常与处置

第一次隔离 `--local` 测试沿用了生产 HOME，OpenClaw state migration 将旧 `exec-approvals.json` 改名为 `.migrated`。发现后立即停止后续测试并将原文件原样恢复：

- 恢复后 SHA-256：`909045f3f58ba4a9b73a5c95eb87f1f2ac01b137a3c965942d5b331fb08890f0`
- 最终 `exec-approvals.json` 存在，`.migrated` 不存在。
- 后续隔离测试改用独立 HOME，没有再次触碰生产文件。
- 生产模型配置、身份哈希、Telegram 和 Gateway 在该过程中未改变。

## 9. 当前版本限制

- `heartbeat.model` 在生产 schema 中只接受单一字符串，因此 heartbeat 使用 LongCat，但没有独立 fallback 对象。
- `utilityModel` 同样只接受单一字符串，当前设置为 LongCat；不能在该字段内表达三段独立 fallback。
- 这两项是 OpenClaw 2026.7.1-2 的 schema 限制，不是遗漏，也没有通过伪造字段绕过。

## 10. 官方与问题依据

- Models：https://docs.openclaw.ai/concepts/models
- Model Failover：https://docs.openclaw.ai/concepts/model-failover
- Subagents：https://docs.openclaw.ai/tools/subagents
- Cron Jobs：https://docs.openclaw.ai/automation/cron-jobs
- 相关 GitHub 问题：[#47705](https://github.com/openclaw/openclaw/issues/47705)、[#37813](https://github.com/openclaw/openclaw/issues/37813)、[#20265](https://github.com/openclaw/openclaw/issues/20265)、[#43768](https://github.com/openclaw/openclaw/issues/43768)、[#51854](https://github.com/openclaw/openclaw/issues/51854)、[#58496](https://github.com/openclaw/openclaw/issues/58496)

## 11. 回滚

如需回滚，使用本轮 manifest 恢复原配置、原 Grok Cron 模型字段，并按 override 清单用官方 `sessions.patch` 恢复旧模型固定值；仍以热加载为优先。只有另行授权后才允许重启 Gateway。
