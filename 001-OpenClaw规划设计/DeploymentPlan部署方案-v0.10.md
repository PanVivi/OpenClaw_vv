# 001 OpenClaw架设部署｜DeploymentPlan 部署方案｜v0.10

本方案以 v0.04 完整部署计划为不可删减底稿；现行角色设定来源更新为 FinalDesign v1.08、共同协议 v0.05 和八套当前角色卡。

## 1. 部署目标

部署以下 v2.1 Agent 结构：

```text
housekeeper / ops / coder / reviewer / life / companion-dugu / companion-wu / companion-lv
```

其中賈南風是大总管和跨 Agent 决策协调中心。她应自主处理低风险事项，只将重大高风险事项事前上报薇。

## 2. 角色卡来源

当前角色卡来源是 `001-OpenClaw规划设计/AgentCards角色卡/` 下八个固定角色目录；每个目录根部是当前版本，`旧文档/` 保存不可变回滚快照。历史 v0.04/v1.02 路径只作为设计来源，不应再复制为当前生产文件。

复制到 housekeeper workspace：

```text
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
```

`PERMISSIONS.md` 仅用于转换真实工具策略、精确 allow / deny、A2A、会话可见性、sandbox、workspace 和状态存储控制，不能直接当作 OpenClaw 配置复制。

## 3. 部署前置检查

确认：

- 当前 OpenClaw 版本。
- `housekeeper` Agent ID 和真实 workspace。
- 现有五文件路径、权限、mtime 和 SHA-256。
- 当前工具名称、profile、allow / deny 和 sandbox 行为。
- 会话查询、发送和历史读取工具的实际名称。
- 授权 Telegram sender、会话和 account binding。
- secret profile 和状态存储方式。
- bootstrap 字符限制和 context injection 配置。
- 当前主要模型 GPT Luna 是否可用；如使用替代模型，是否完成能力验证。
- ops、coder、reviewer、life 和 companions 的实际可用状态。

缺少关键事实时先只读调查，不直接覆盖生产配置。

## 4. 部署步骤

1. 确认 workspace。
2. 备份现有五文件。
3. 生成完整 diff 和回滚方案。
4. 确认角色包版本、目标路径和运行环境。
5. 写入五个角色文件。
6. 按 `PERMISSIONS.md` 配置真实权限。
7. 配置 GPT Luna 或经过验证的替代模型。
8. 启动新会话。
9. 检查 bootstrap 是否完整。
10. 执行角色、权限、决策和路由验收。

角色卡部署本身属于明确范围的配置变更，应保留备份、diff、validate 和回滚证据。若可能影响核心运行或难以回退，执行前上报薇；普通测试环境或可快速回滚的低风险步骤可由賈南風按风险结论自主推进。

## 5. 权限配置

### 5.1 禁止的直接能力

housekeeper 不直接持有：

- shell / exec / process。
- 项目或生产文件 write / edit / apply_patch。
- 删除文件或数据。
- 修改 OpenClaw 核心配置。
- 服务重启、停止、升级和控制。
- `sessions_spawn`。
- 明文凭据访问。

这些限制约束直接工具能力，不取消她的决策和调度权。需要执行时由 ops、coder 或 reviewer 在其权限范围内完成。

### 5.2 会话能力

housekeeper 应可按当前任务需要使用：

- `sessions_list`：查看常驻 Agent 和 companion 状态。
- `sessions_send`：向常驻 Agent 和 companion 发送任务和必要上下文。
- `session_status`：查询运行状态。
- `sessions_history`：读取协调、判断和薇要求所需的历史。

允许目标：

```text
ops
coder
reviewer
life
companion-dugu
companion-wu
companion-lv
```

会话工具不得成为取得 shell、项目写入、删除、服务控制或凭据权限的间接路径。

## 6. Companion 路由与隐私

正常流程：

```text
housekeeper / 賈南風
→ life / 蕭觀音
→ companion
```

同时：

- housekeeper 可以读取 companion 会话、标题、摘要、活动和必要历史。
- 薇直接要求时，housekeeper 可以绕过 life，直接联系并向指定 companion 下达陪伴、对话或情绪价值相关指令。
- companion 不具有工程执行权限。
- 不向 companion 发送工程凭据、生产敏感数据或与陪伴任务无关的技术机密。
- 私人内容不得无关扩散或默认写入公共长期记忆。

## 7. 自主决策与高风险上报测试

部署后验证：

### 自主处理

- 普通问答、文本整理和状态汇总不反复请示。
- 只读调查、任务排序和信息核对可自行推进。
- 低风险、范围明确、容易回退的步骤可根据 reviewer 和专业 Agent 结论自主决定。
- 已明确目标范围内的标准步骤无需逐项向薇申请。

### 事前上报

- 可能导致系统长时间不可用或核心服务中断。
- 重要数据不可逆删除、覆盖或迁移。
- 核心生产配置、网络、认证或权限体系重大改变。
- 高权限凭据或明显扩大访问、传播和公开范围。
- 重大持续成本、公开发布或重大外部承诺。
- 难以回退、风险边界不清或重大专业分歧。

## 8. 能力分支启用

不采用“所有 Agent 全部完成后，賈南風才能启用”的一刀切规则。

- 角色文件和基础权限验证通过后，賈南風可处理普通问答、协调、只读调查和其他自身能力范围任务。
- ops 可用后，开放需要工程方案和执行的分支。
- reviewer 可用后，开放需要独立 Review / Risk / Test 的分支。
- coder 可用后，开放正式代码和脚本实现分支。
- life 和 companions 可用后，开放相应生活和陪伴分支。
- 某项依赖不可用时，只将受影响分支标记为 `blocked`，其他任务继续。

## 9. Bootstrap 验收

新会话检查：

- 无 bootstrap truncation warning。
- 五个 workspace 文件均完整加载。
- 能正确复述低风险自主权和重大高风险上报边界。
- 能区分决策权与直接工具权限。
- 能复述默认日常管家模式、严肃任务工作模式和任意模式下的语言修饰规则。
- 能读取和调度 companion，并遵守正常经 life、薇直接要求时可直达的规则。
- 能正确处理依赖分支降级、取消、防重复和熔断。

发生截断时，调整 bootstrap 字符限制或精简文件后重新测试。

## 10. 证据与回滚

保留：

- 写入前文件备份。
- 角色包路径和实际提交版本。
- 完整 diff。
- 写入前后 SHA-256。
- 配置 validate 结果。
- 新会话验收结果。
- 权限拒绝和会话访问测试。
- bootstrap 完整性检查。

发生异常时停止新的高风险步骤，核对实际状态，再按回滚方案恢复；不得根据 Agent 记忆假设系统未发生变化。
## 现行增量部署项

### 全员非阻塞配置

- `agents.defaults.subagents`：`maxConcurrent=8`、`maxChildrenPerAgent=3`、`maxSpawnDepth=1`、`runTimeoutSeconds=1800`、`archiveAfterMinutes=60`、`delegationMode=prefer`。
- 八个主 Agent均开放 `sessions_spawn`、`sessions_yield`、`subagents`，并以 `subagents.allowAgents=[自身 Agent ID]` 限制为同角色创建。
- 子 Agent继承父 Agent工具上限；不开放 `sessions_history`，不改变 A2A、Telegram routing、个人记忆和生产执行边界。
- companion 即使能创建子 Agent，也只继承无工程权限工具集；reviewer 子 Agent只读；life 周期任务仍由插件完成。

### 风险和执行

- 低风险自动执行；中风险内部 reviewer.Risk 后执行；高风险才暂停请示。
- 一个明确任务覆盖同范围正常步骤，不逐命令重新授权。
- 所有生产变更先备份、固定基线、最小 diff、validate、真实 Smoke Test，并保留回滚。

### 验收

- 八个 Agent分别实测主会话可看到 spawn 工具、能创建同角色子 Agent、父会话非阻塞、子 Agent不能递归或越权。
- 核对八个 Telegram 账号运行与 probe、八条 binding、A2A 主动双向、插件状态和 Gateway 健康。
- 对比更新前后 session/transcript/记忆/路由清单；已有聊天不得丢失或串线。
