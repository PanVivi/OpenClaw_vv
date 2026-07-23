# 001 OpenClaw架设部署｜DocumentRules 文档编号规则｜v1.05

本文件定义 OpenClaw_vv 项目文档、角色卡、历史版本和 Agent 部署状态的命名与留存方式。

## 一、项目文档

版本化说明文档使用：

```text
{English文档名中文文档名}-v{版本}.md
```

新版本建立后旧版本保留；只有薇明确决定时才删除。

## 二、角色卡库稳定目录

角色卡库使用固定入口：

```text
001-OpenClaw规划设计/AgentCards角色卡/
```

每位常驻 Agent 使用独立目录：

```text
{agent-id}-{正式角色名}/
```

Agent ID 必须与 OpenClaw 实际配置一致。

## 三、Agent 根目录结构

```text
{agent目录}/
├── README.md
├── DeploymentStatus部署状态.md
├── IDENTITY.md
├── SOUL.md
├── AGENTS.md
├── USER.md
├── TOOLS.md
├── PERMISSIONS.md
└── 旧文档/
    ├── v0.01/
    └── v1.02/
```

尚未完成正式角色卡的 Agent 也必须至少具有：

```text
README.md
DeploymentStatus部署状态.md
```

## 四、部署状态文档

`DeploymentStatus部署状态.md` 是每个 Agent 当前实际部署状态的唯一权威入口。

它不属于某个角色卡版本，不复制到 OpenClaw workspace，也不得放进 `旧文档/<角色版本>/` 作为当前状态来源。

至少记录：

- Agent ID；
- 当前设计版本；
- 当前实际部署版本；
- 状态：`completed`、`partially completed`、`blocked`、`not deployed` 或 `not verified`；
- 已完成能力和验收；
- 未完成、阻塞和待核验事项；
- 当前模型、Bot、binding、工具、A2A、会话、记忆和自动化状态；
- 下一步；
- 最后已知证据来源和更新时间。

维护规则：

- 角色文件写入、升级、回滚后更新；
- 模型、Telegram Bot、account 或 binding 变化后更新；
- 工具 allow/deny、A2A、session visibility、sandbox 或记忆权限变化后更新；
- 自动化创建、修改、暂停、失败或恢复后更新；
- Bootstrap、人格、权限、消息、记忆或跨 Agent 验收后更新；
- 故障、阻塞、修复和部署状态变化后更新。

不知道的事实写“待核验”。设计要求不得写成实际完成。工具可见不得写成工具调用已成功。

历史部署事件需要保留时，可以保存为事故记录、Change 记录或历史快照，但必须明确标注日期和“历史快照”，不能与根目录当前状态文档竞争权威性。

## 五、角色卡当前文件与旧文档

- 当前版本文件直接放在 Agent 根目录，不在文件名中加入版本号。
- 当前版本号写入 README 和 AGENTS，并由角色卡库 README 索引。
- 新版本同步完成后，旧版角色文件移入 `旧文档/<版本>/`。
- 旧文档保存历史角色文件、废弃草案和版本说明，不保存当前部署状态副本。
- 历史文件不得覆盖、改写或自动删除。
- 同一 Agent 只能有一个当前设计版本和一个当前实际部署版本标记。

## 六、角色包文件

五个 OpenClaw workspace 文件：

```text
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
```

`PERMISSIONS.md` 是实际权限配置参考，不直接复制为 OpenClaw 配置。

`README.md` 记录当前设计版本、职责和验收要求，不代替部署状态文档。

## 七、共同协议

全体 Agent 共同协议保存在：

```text
AgentCards角色卡/共同协议/
```

该目录是仓库权威源。OpenClaw 不会因相对路径引用自动加载任意文件，因此每个 Agent 的 `AGENTS.md` 必须内嵌当前协议的完整执行摘要。

## 八、接手顺序

其他 AI 接手某一 Agent 时按以下顺序读取：

1. `DeploymentStatus部署状态.md`；
2. `README.md`；
3. 五个当前 workspace 文件；
4. `PERMISSIONS.md`；
5. 仅在对比、回滚或复盘时读取 `旧文档/`。

## 九、版本规则

- 新开发角色卡从 `v0.01` 开始。
- 小幅修正递增 `0.01`。
- 已发布但发现问题的版本不得原地改写，应归档并建立新版本。
- 设计版本、部署版本和历史版本必须明确区分。
- 不再新建带版本号的角色卡库顶层目录。
- 不把角色卡设计状态写成运行环境已部署状态。

## 十、稳定基线与增量升级规则

- 已经定稿、通过审查或完成基础部署验收的版本，是下一版本的不可删减基线。
- 新版本必须先完整复制稳定基线的全部文件，再在复制件上追加、澄清或强化新规则；不得以当前错误草稿或中间修正版作为新底稿。
- 未经薇明确批准某一具体条款，不得删除、合并、精简、改写或用概括性文字替代稳定基线中的内容。
- 语义相近不等于完成继承。凡改变执行步骤、责任人、门控、状态、授权、权限、证据、取消、回滚、验收、角色模式或用户偏好的改写，均视为能力回退。
- 升级前必须建立逐文件、逐条款继承矩阵，至少覆盖 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md` 和 `PERMISSIONS.md`。
- 每项新增、删除、合并或权限变化必须单独列出来源和批准状态。没有批准记录的删除、合并和权限扩大不得进入当前版本。
- 完成后必须把新版本与稳定基线进行反向差异检查；只有确认旧条款全部保留、新增项独立可识别、配套总设计与部署文档一致后，才可声明角色卡修正完成。
- 若写入工具出现截断、失败或结果不完整，立即恢复最近已验证的完整基线，不得继续在残缺文件上追加修改。

## 十一、运行态资料与无损更新

角色卡 Git 版本、NAS workspace 文件、OpenClaw 配置和会话/记忆数据必须分开管理：

- Git 角色卡版本只描述设计，不自动等于 NAS 已部署版本；
- `DeploymentStatus部署状态.md` 同时记录当前设计版和实际部署版；
- transcript、session 索引、Agent SQLite、`memory/`、`MEMORY.md`、恢复包、Telegram account/binding 和 secret 不属于角色卡版本，不得随五文件覆盖；
- secret、私人 transcript 和可复用凭据不得提交 Git；
- 部署前固定 Git commit，备份允许变更对象和所有不可破坏项，生成大小与 SHA-256 manifest；
- 配置只允许按明确键增量合并，不使用模板整份覆盖生产配置；
- 旧角色五文件归档后再产生新版本；NAS 侧使用暂存、校验和原子替换；
- OpenClaw/Node 更新、角色内容更新、Sandbox 和 Telegram binding 分成独立 Change；
- 需要一致性备份时先停止 system-level Gateway，完成离线校验后最多启动一次；
- session/transcript 数量减少、既有 Bot 失联、角色读取到其他 Agent 私人记忆或出现非预期权限差异时立即回滚；
- 完成标准、备份结构和验收顺序以 `002-OpenClaw部署进度/LosslessContentUpdate无损内容更新任务-v0.01.md` 为准。

恢复摘要必须区分个人聊天记忆、当前任务、全局运维事实和其他 Agent 转述。通用部署摘要不得作为个人记忆证明。
