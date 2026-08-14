# 001 OpenClaw架设部署｜TaskSystemCapabilityFix 任务系统能力名称正式修复计划｜v1.01

## 1. 事故编号与状态

| 项目 | 内容 |
| --- | --- |
| Incident | `INC-2026-0002`（延续） |
| Change | `Change-0005` |
| 状态 | Plan / Draft |
| 影响 | 全部 agent 工作流仍阻塞：模型不使用文档记录的能力名称，task_delegate plan 持续失败 |
| 根因 | 8月13日修复了配置和文档，但模型行为未改变：Grok 4.6 不遵循 AGENTS.md v1.21 中的能力名称清单，反复猜测错误名称 |
| 计划制定者 | Qwen Code（少主指令） |
| 计划制定日期 | 2026-08-14 |

## 2. 资料收集结果

### 2.1 官方文档

| 来源 | URL | 内容 |
| --- | --- | --- |
| OpenClaw 官方文档 | https://docs.openclaw.ai | 插件系统、配置、Gateway 架构 |
| Plugin 文档 | https://docs.openclaw.ai/tools/plugin | 插件安装、配置、hooks 机制 |
| Plugin SDK | https://docs.openclaw.ai/plugins/building-plugins | 插件开发：api.on() hooks、before_tool_call |
| ClawHub 插件市场 | https://clawhub.ai | 插件/技能分发平台 |
| GitHub 主仓库 | https://github.com/openclaw/openclaw | TypeScript，386k stars |
| 社区 Discord | https://discord.com/invite/clawd | 官方讨论区 |

### 2.2 插件源码分析

**task-system-control v2.0.0**（生产路径：`/Volume3/OpenClaw/home/.openclaw/extensions/task-system-control/`）

| 关键函数/机制 | 说明 |
| --- | --- |
| `capabilityRule(name, owner)` | 从 `capabilities` Map 查找能力，不存在或 owner 不匹配则抛出"目标角色不具备声明能力 ${name}，请重新分工" |
| `capabilities` Map | 以 DEFAULT_CAPABILITIES（8 条）为基础，被 `cfg.capabilities` 扩展覆盖，运行时可枚举 |
| `before_tool_call` hook | 阻止 main/controller 会话使用 concrete tools；当前不验证 capability 名称 |
| `agent_turn_prepare` hook | 注入 `appendContext`："立即调用 task_delegate plan" — **模型确实能看到并遵循此注入** |
| `before_agent_finalize` hook | 强制本轮必须完成 delegation，否则 revise 重试 |
| `task_delegate inspect` 动作 | 返回 `publicPlan(state, plan)` = `{status, title, branches:[{role,title,status,workItems}]}`，**不返回能力名称** |

**workflow-governance v1.3.0**（生产路径：`/Volume3/OpenClaw/home/.openclaw/extensions/workflow-governance/`）

| 功能 | 说明 |
| --- | --- |
| 三次独立审查 | 高风险操作需 3 次独立 reviewer 审查通过 |
| 三审告知 | 高风险前通过 Telegram 通知少主 |
| 状态流转 | preflight_required → reviewing → notified → executing → completed |

### 2.3 生产配置验证

| 检查项 | 状态 | 详情 |
| --- | --- | --- |
| `openclaw.json` 能力配置 | ✅ 正确 | 8 条 DEFAULT + 8 条自定义 = 16 条 |
| housekeeper AGENTS.md | ✅ v1.21 | 能力清单、命名空间格式、任务入口流程均已写入 |
| Gateway 状态 | ✅ running | pid 1002872, OpenClaw 2026.7.1-2 |
| task-system-control 插件 | ✅ enabled | hooks 全部注册 |
| workflow-governance 插件 | ✅ enabled | v1.3.0 |

### 2.4 根因确认

**配置层无问题，文档层无问题，问题在模型行为层。**

模型 Grok 4.6 在收到任务后：
1. 正确触发 `task_delegate plan`（说明 `agent_turn_prepare` 注入有效）
2. 但 `capability` 字段使用裸词（`exec`、`write`、`ops`、`ops-investigate-and-fix` 等）
3. 系统返回"目标角色不具备声明能力 X，请重新分工"
4. 模型猜测另一个错误名称，再次失败
5. 反复循环，最终 inbox 被标记为 blocked

**模型不读取 AGENTS.md 中明确列出的能力名称清单。**

### 2.5 修复策略分析

| 方案 | 描述 | 可靠性 | 风险 | 选择 |
| --- | --- | --- | --- | --- |
| A. 仅强化 AGENTS.md 指令 | 只靠文档约束 | 低（模型已两次不遵循） | 低 | ❌ 单独不足 |
| B. 修改插件注入能力名称到 context | 利用现有 `agent_turn_prepare` 钩子，将能力名称直接注入模型上下文 | **高**（模型必定看到） | 中（需修改 JS 源码） | ✅ **主方案** |
| C. 修改插件添加 capability 前置校验 | 在 `task_delegate plan` 执行前校验 capability，无效时返回有效清单 | **高**（强制纠错） | 中（需修改 JS 源码） | ✅ **辅助方案** |

**最终策略：B + C 组合**
- B 确保模型在每次任务触发时都能看到正确的能力名称
- C 确保即使模型猜测错误，也能立即获得正确的名称清单

## 3. 修复措施明细

### 3.1 Change-0005A：修改 task-system-control 插件，注入能力名称到上下文

**文件**：`/Volume3/OpenClaw/home/.openclaw/extensions/task-system-control/dist/index.js`

**修改位置**：`agent_turn_prepare` hook（约第 595 行）

**原始代码**：
```javascript
api.on("agent_turn_prepare", async (_event, ctx) => {
    if (!ctx.sessionKey) return;
    const state = await readState();
    const inboxId = turnInbox.get(turnKey(ctx));
    const inbox = inboxId ? state.inbox.find((item) => item.id === inboxId) : undefined;
    if (!inbox || inbox.profile === "conversation") return;
    return { appendContext: `[内部任务入口已持久登记] 这是可执行任务。你只能接单、澄清、分解、调度、核对收据和汇总；立即调用 task_delegate plan。不得亲自读取、搜索、运行、写入或调用业务模块，也不得把内部编号或权限问题抛给少主。` };
});
```

**修改为**：
```javascript
api.on("agent_turn_prepare", async (_event, ctx) => {
    if (!ctx.sessionKey) return;
    const state = await readState();
    const inboxId = turnInbox.get(turnKey(ctx));
    const inbox = inboxId ? state.inbox.find((item) => item.id === inboxId) : undefined;
    if (!inbox || inbox.profile === "conversation") return;
    const capabilityList = Array.from(capabilities.entries()).map(([name, rule]) =>
        `- ${name}（target: ${rule.owners.join('/')}）`
    ).join('\n');
    return { appendContext: `[内部任务入口已持久登记] 这是可执行任务。你只能接单、澄清、分解、调度、核对收据和汇总；立即调用 task_delegate plan。不得亲自读取、搜索、运行、写入或调用业务模块，也不得把内部编号或权限问题抛给少主。

[有效能力名称清单 — 必须从此清单中选择，不得猜测或裸词]
${capabilityList}` };
});
```

**效果**：每次任务触发时，模型在上下文中直接看到全部有效能力名称，无需查阅 AGENTS.md。

### 3.2 Change-0005B：修改 task-system-control 插件，添加 capability 前置校验

**文件**：同上 `dist/index.js`

**修改位置**：`task_delegate plan` 的 packet 处理逻辑中，在 `capabilityRule()` 调用前增加拦截

**原始逻辑**（伪代码）：
```
对每个 packet:
    capabilityRule(packet.capability, packet.target_agent)  // 失败时抛出"不具备声明能力"
```

**修改为**：
```
对每个 packet:
    if (!capabilities.has(packet.capability)):
        // 返回友好错误 + 有效清单
        throw new Error(`能力名称 "${packet.capability}" 无效。有效清单：${Array.from(capabilities.keys()).join(', ')}`)
    capabilityRule(packet.capability, packet.target_agent)
```

**效果**：模型猜测错误时，错误信息直接列出所有有效名称，模型可以立即修正。

### 3.3 Change-0005C：强化 housekeeper AGENTS.md 指令（辅助）

**文件**：`agents/housekeeper/AGENTS.md`

**变更内容**：在 `## v1.21 任务委派能力名称清单` 顶部追加

```markdown
## v1.22 能力名称强制规则

调用 `task_delegate plan` 时，capability 字段**必须**使用 `角色.动作` 命名空间格式。

**禁止事项**：
- 不得使用裸词（exec、write、read、operate、diagnose、implement、verify、healthcheck 等）
- 不得使用不存在的命名空间（如 ops.fix、ops-investigate-and-fix、ops-execution 等）
- 不得猜测 — 每次任务触发时系统上下文中会注入完整能力清单，使用该清单

**错误恢复**：收到"不具备声明能力"或"能力名称无效"错误时，查看上下文中的有效清单，选择正确的名称重试。
```

### 3.4 Change-0005D：备份与验证

**备份**：
- `extensions/task-system-control/dist/index.js.bak.20260814`
- `agents/housekeeper/AGENTS.md.bak.20260814`

**验证**：
1. `dist/index.js` 修改后语法正确（`node --check` 验证）
2. `AGENTS.md` 版本号 v1.21 → v1.22
3. 新增段落确认存在
4. 无损确认：既有规则未被删除或修改
5. 生产备份文件 SHA256 记录

### 3.5 Change-0005E：重启 Gateway

```bash
openclaw gateway restart
openclaw gateway status  # 确认 running + active
```

### 3.6 Change-0005F：端到端验收测试

**测试任务**：通过 Telegram 向贾南风发送："帮我检查 Gateway 当前状态"

**验收标准**：
- [ ] 贾南风调用了 `task_delegate plan`
- [ ] capability 字段使用了正确格式（如 `ops.inspect` 而非 `exec`）
- [ ] `task_delegate plan` 成功（返回 `ok: true`）
- [ ] ops 角色的 worker 接收到任务并执行
- [ ] 任务完成后贾南风向少主发送最终通知
- [ ] 全程无"不具备声明能力"错误

**失败处理**：如果验收未通过，48 小时内未修复则回滚。

## 4. 风险评估

| 风险 | 等级 | 缓解措施 |
| --- | --- | --- |
| 修改 JS 语法错误导致 Gateway 无法启动 | 中 | 修改前 `node --check` 验证；备份可秒级恢复 |
| 模型仍不遵循（即使 context 中注入了清单） | 低 | 辅助方案 C 确保错误信息也包含清单 |
| Gateway 重启导致当前会话中断 | 低 | 重启后自动恢复，无持久影响 |
| 插件升级覆盖修改 | 低 | 记录修改位置，升级后重新应用 |

## 5. 回滚方案

如果修复后 48 小时内验收仍不通过：
1. 恢复备份：`dist/index.js.bak.20260814` → `dist/index.js`
2. 恢复备份：`AGENTS.md.bak.20260814` → `AGENTS.md`
3. 重启 Gateway
4. 评估是否需更换模型（从 Grok 4.6 切换到更遵循指令的模型）

## 6. 执行清单

- [ ] Step 1: 备份 dist/index.js → dist/index.js.bak.20260814
- [ ] Step 2: 备份 AGENTS.md → AGENTS.md.bak.20260814
- [ ] Step 3: 修改 dist/index.js 的 agent_turn_prepare hook（注入能力清单）
- [ ] Step 4: 修改 dist/index.js 的 capabilityRule 调用前增加前置校验
- [ ] Step 5: 编辑 AGENTS.md，追加 v1.22 能力名称强制规则
- [ ] Step 6: node --check 验证 JS 语法
- [ ] Step 7: 验证文件完整性
- [ ] Step 8: 重启 Gateway
- [ ] Step 9: 通过 Telegram 发送端到端测试任务
- [ ] Step 10: 验证验收标准全部通过
- [ ] Step 11: 整理文档并同步到 GitHub 仓库
- [ ] Step 12: 贾南风 Telegram 通知少主
