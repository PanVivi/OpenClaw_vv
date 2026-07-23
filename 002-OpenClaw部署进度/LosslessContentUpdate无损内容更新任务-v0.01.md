# 002 OpenClaw部署进度｜LosslessContentUpdate 无损内容更新任务｜v0.01

## 一、任务目的

为后续角色卡、共同协议、运行配置和 OpenClaw 内容更新建立可重复执行的无损方法。目标是在不丢失既有聊天 transcript、会话映射、个人记忆、Telegram binding 和可回滚基线的前提下，完成最小范围的增量更新。

本任务不建设新的记忆服务、任务控制服务或 Bot 管理平台。

## 二、不可破坏项

每次更新必须保护：

1. 所有 Agent ID、正式角色名和 workspace 路径；
2. 现有 Telegram account ID、Bot token、binding 与有效会话映射；
3. `sessions.json`、所有 `.jsonl`、`.jsonl.reset.*` 和其他 transcript 变体；
4. Agent SQLite 状态、`memory/`、`MEMORY.md` 与个人恢复索引；
5. 当前五个 workspace 文件和其 SHA-256；
6. 当前 OpenClaw 配置、服务单元、Node 运行时和 Sandbox 镜像信息；
7. 未在本次变更范围内的工具权限、模型、自动化和用户数据。

未经用户明确要求，不删除、不重置、不改名、不合并、不覆盖上述对象。

## 三、更新分类

开始前只选择一种主类型：

| 类型 | 内容 | 默认是否重启 |
| --- | --- | --- |
| A | 仓库文档更新，不写 NAS | 否 |
| B | workspace 五文件内容更新 | 视实际加载机制，最多一次 |
| C | OpenClaw 配置键增量更新 | 通常需要，最多一次 |
| D | OpenClaw / Node 运行时更新 | 需要，独立 Change |
| E | Telegram account/binding 增量 | 视配置要求，最多一次 |
| F | 恢复包、记忆入口或派生索引 | 先停 Gateway，完成后最多一次 |

多个类型同时出现时拆成有顺序的子变更；运行时更新不得夹在角色内容批量写入中。

## 四、任务登记模板

```text
Change ID：
请求人：
执行时间窗：
固定 Git commit：
目标 Agent：
更新类型：
允许修改：
明确禁止修改：
需要保留的 session/account/binding：
是否涉及私人 transcript：
运行时兼容性要求：
Sandbox 前置条件：
计划重启次数：
备份目录：
回滚触发条件：
验收证据目录：
```

缺少固定 Git commit、变更范围、备份目录或回滚条件时，不进入写入阶段。

## 五、Phase 0：只读盘点

### 5.1 仓库

- 拉取远端并确认目标分支、commit 和工作树状态；
- 读取当前 DocumentRules、SourceIndex、角色卡 README、DeploymentStatus、五文件和 PERMISSIONS；
- 核对 Agent ID 与正式角色名，不依据目录缩写猜名字；
- 生成本次允许变更文件清单。

### 5.2 NAS

- 读取 systemd 服务实际 `ExecStart`，确认服务使用的 Node 和 OpenClaw 版本；
- 导出脱敏后的 Agent、模型、工具、Sandbox、A2A、Telegram account/binding 摘要；
- 记录 Gateway 状态、重启计数和当前错误；
- 记录各 Agent 当前五文件 SHA-256；
- 记录 session 数量和现有 session ID，但不把私人正文写入普通日志；
- 核对 Docker 健康状态和 Sandbox 镜像是否存在。

### 5.3 差异判定

必须分别回答：

1. 仓库设计版本是什么；
2. NAS 实际部署版本是什么；
3. 运行配置有哪些独立于角色卡的增量；
4. 本次是否真的需要改角色属性；
5. 哪些对象明确不在范围内。

角色属性、称呼、人格、职责归属存在歧义时先询问用户；普通错字、版本引用、状态和安全边界错误可直接修正。

## 六、Phase 1：一致性备份

### 6.1 停止点

涉及 session、SQLite、memory、配置或运行时更新时：

1. 停止 system-level `openclaw.service`；
2. 确认服务已停且没有继续写入；
3. 再制作一致性备份。

纯 Git 文档变更不需要停止 Gateway。

### 6.2 备份内容

备份目录使用不可复用时间戳，至少包含：

```text
manifest.tsv
config/
runtime/
agents/<id>/workspace-files/
agents/<id>/sessions/
agents/<id>/state/
agents/<id>/memory/
telegram-routing.redacted.json
service-status.txt
rollback.md
```

`manifest.tsv` 每行记录：

```text
类别 | 来源绝对路径 | 备份相对路径 | 大小 | SHA-256 | 是否含私人内容
```

备份完成后逐文件比较来源和备份 SHA。校验不通过时停止，不进入更新。

## 七、Phase 2：暂存与增量写入

### 7.1 角色卡

- 已部署版本不得原地改写；
- 旧版八文件先归档到 `旧文档/<版本>/`；
- 新版完整继承旧版，再做最小增量；
- 人格与用户偏好未获批准时不得改变；
- 在临时目录生成五文件并校验后，再逐文件原子替换；
- 不触碰 `sessions/`、SQLite、`memory/` 或 Telegram 配置。

### 7.2 OpenClaw 配置

- 从当前实际配置读取后只修改明确键；
- 禁止用仓库模板整份覆盖生产配置；
- secret 只保留原值或从用户授权的安全来源注入，不进入 diff、日志或 Git；
- 写入前后生成脱敏结构 diff；
- account/binding 只做按 ID 的增量合并；
- 不存在 Bot token 时保持 blocked，不创建假 account。

### 7.3 会话与记忆

- 不修改 transcript 原件；
- 不手工回绑旧 session ID；
- 需要恢复入口时只创建指针、manifest 或派生索引；
- 派生个人记忆只能使用该 Agent 自己的 transcript；
- 通用运维摘要必须标注为“运行状态”，不能作为个人记忆；
- A2A 维护消息和 ACK 不得进入个人长期记忆。

### 7.4 A2A

- `agentToAgent.allow` 同时包含授权发送方和接收方；
- `sessions.visibility=all` 仅表示目标可解析，不代表历史可读；
- `sessions_history` 默认拒绝；
- A2A 不继承接收方工具、workspace、记忆或现实授权；
- 正式跨 Agent 消息记录来源、范围、可信度、失效条件和 Task ID（如适用）。

### 7.5 Sandbox

- 先核对 Docker 健康和镜像存在；
- 先以一个低影响 Agent 做硬化与工具 Smoke Test；
- 只有测试通过的 Agent 才开启；
- 不批量启用未经验证的 Sandbox；
- 当前推荐基线：coder 开启，其他七个关闭。

## 八、Phase 3：离线校验

启动前完成：

1. 新五文件与目标 Git commit 对比；
2. UTF-8、空文件、截断、角色名、Agent ID、版本和共同协议引用检查；
3. 配置 schema/validate；
4. 服务真实 Node 版本满足目标 OpenClaw 要求；
5. Telegram account/binding 集合与变更前一致，除非本次明确新增；
6. session/transcript 文件数量没有减少；
7. memory 和恢复包 SHA 没有非预期变化；
8. Docker/Sandbox 前置条件通过；
9. 脱敏 diff 只包含允许变更。

任一项失败，保持服务停止并回滚，不边启动边修。

## 九、Phase 4：一次启动与分层验收

### 9.1 启动

- 启动 system-level `openclaw.service`；
- 不连续手工重启；
- 观察到 crash loop 时立即停止并回滚最后一个变更；
- 验证 `active`、`NRestarts=0`、无新增致命错误。

### 9.2 验收顺序

1. Gateway 健康；
2. 既有 Telegram provider 连接；
3. 每个既有 Bot 实际出站；
4. 每个既有 Bot 实际入站回复；
5. 八 Agent 身份与正式名称；
6. 五文件加载和禁止能力；
7. session ID、transcript 数量与旧聊天可检索性；
8. 各 Agent 个人记忆隔离；
9. A2A 每个发送方至少一次，且不开放历史；
10. coder Sandbox 读写执行和边界；
11. 本次新增功能。

不能因为 Gateway 健康就跳过 Telegram、记忆和权限验收。

## 十、回滚

出现以下任一情况立即回滚：

- Gateway crash loop；
- 既有 Bot 失联；
- session/transcript 数量减少；
- 角色读取到其他 Agent 的私人记忆；
- 配置出现非预期 secret、account、binding 或权限差异；
- Sandbox 启动失败导致消息无法回复；
- 新角色文件截断、乱码或身份错误；
- A2A 获得未授权历史或现实执行能力。

回滚顺序：

1. 停止 Gateway；
2. 恢复本次变更对象，不覆盖未变更对象；
3. 校验恢复后 SHA；
4. 重新 validate；
5. 启动一次；
6. 重跑 Gateway、Telegram、session 和权限最低验收；
7. 记录触发原因，不在同一 Change 中临时扩大修复范围。

## 十一、完成标准

只有同时满足以下条件才标记 `completed`：

- 固定 Git commit、实际部署文件和 SHA 可对应；
- 所有不可破坏项保持；
- 既有 Telegram 实际收发通过；
- transcript、session、memory 和 binding 无非预期减少；
- 角色身份、权限和记忆来源正确；
- Gateway 无重启循环；
- Sandbox 只在已验收 Agent 上开启；
- A2A 能发送且历史读取仍拒绝；
- 回滚包、manifest、脱敏 diff 和验收记录存在；
- 对应 DeploymentStatus、CurrentProgress 和事故/Change 文档已更新。

## 十二、本轮落地任务

- [x] 汇总部署后故障和修复事实；
- [x] 建立本无损更新方法；
- [x] 把 A2A 传输与历史读取边界写入共同协议和受影响角色卡；
- [x] 更新实际部署状态和当前索引；
- [ ] 将本分支中的新角色卡按本任务另行部署到 NAS；
- [ ] 获得五个缺失 Bot token 后，逐个增量建立 account/binding；
- [ ] 为未来进行中任务设计独立持久化记录；不以 transcript 备份冒充自动续跑。
