# 002 OpenClaw架设部署｜Life Memo Permission 萧观音备忘录权限修复计划｜v0.01

- 计划时间：2026-07-28
- 目标环境：NAS `TNAS-PAN`，OpenClaw 生产 Gateway
- 目标 Agent：`life` / 萧观音
- 状态：`SUPERSEDED BEFORE ACCEPTANCE`

> 2026-07-28 用户在生产最终验收前明确提出：专用备忘录工具过窄，希望在萧观音工作区内建立少主专属文件夹并存放相关文件。本计划保留为第一版决策记录，后续由 `LifeOwnerFiles萧观音少主专属资料区修复计划-v0.01.md` 取代。窄版插件未创建正式用户备忘录。

## 一、故障事实

现场 transcript 已确认两条独立失败路径：

1. 少主直接要求萧观音“在你的工作区创建一份备忘录”时，模型只能回答没有工作区写入权限，未产生任何文件工具调用。
2. Workboard 卡 `af352516-1a48-43af-8394-fb55d22d7874` 已被 `life` 正常 claim 和 heartbeat，但随后因运行时没有文件读写工具而进入 `blocked`。

当前生产配置进一步确认：

- `life.workspace=/Volume3/OpenClaw/home/.openclaw/agents/life`；
- `sandbox.workspaceAccess=rw`，但 sandbox 本身为 `off`；
- `life.tools.deny` 明确包含 `read/write/edit/apply_patch/exec/process`；
- allowlist 中只有 `life_automation`、会话、Web 和 Workboard 工具，没有备忘录专用工具。

因此根因不是 Linux 目录 ACL，也不是模型拒绝执行，而是 Gateway 有效工具策略没有向 `life` 暴露任何可完成备忘录写入和回读的能力。此前只把 workspace 标记为 `rw`，不能越过工具 deny。

## 二、设计矛盾

角色设计把萧观音定义为生活事务和生活设置执行者，却又把“普通文件写入与删除”整体禁止。后者作为工程隔离是合理的，但没有为生活备忘录提供替代的最小能力，导致职责和能力不闭环。

本次不开放通用 `write/edit/read`，避免萧观音修改角色卡、会话资料或其他工作区文件；也不开放 `exec`，因为关闭文件工具并不能使 shell 只读。

## 三、修复方案

新增 `life-memo` 1.0.0 Tool Plugin，仅向 `agentId=life` 注册 `life_memo`：

- 固定目录：`/Volume3/OpenClaw/home/.openclaw/agents/life/memos`；
- 支持：`list/get/create/update`；
- 不接受路径，只接受备忘录名称，统一映射为 `.md`；
- 拒绝绝对路径、路径分隔符、`.`、`..`、控制字符、符号链接和非普通文件；
- `create` 排他创建，不覆盖同名文件；
- `update` 使用同目录临时文件原子替换；
- 单文件内容上限 64 KiB，文件权限 `0600`；
- 不提供删除、shell、脚本、配置、任意 Agent 或任意目录访问。

生产配置只做三处增量：

1. `plugins.allow` 增加 `life-memo`；
2. `plugins.entries.life-memo` 启用并固定 `agentId` 与 `memoDir`；
3. `agents.list[id=life].tools.allow` 增加 `life_memo`。

既有 `read/write/edit/apply_patch/exec/process/gateway/message/sessions_history` deny 保持不变。

## 四、实施顺序

1. 备份 `openclaw.json`、`agents/life` 五件套和已安装插件目录清单，记录 SHA-256。
2. 本地完成插件编译、单元/集成测试和路径逃逸测试。
3. 把插件部署到新的独立目录，不覆盖 `life-automation`。
4. 对生产配置执行按键增量合并，先离线 JSON 校验和 `openclaw config validate`。
5. 重启 Gateway 一次，检查插件 doctor、Gateway 健康和八 Agent/Bot 基线。
6. 使用新的 `life` 隔离会话发出真实“创建备忘录”请求。
7. 从 transcript 确认真实调用 `life_memo`，并从磁盘回读目标文件、核对内容、权限与 SHA-256。
8. 验证其他 Agent 不可见该工具，通用文件和 shell deny 未回退。
9. 更新角色卡、部署状态、当前进度、来源索引和修复验收报告，再同步 Git 分支。

## 五、回滚

如插件、配置、Gateway 或回归验收失败：

1. 恢复备份的 `openclaw.json`；
2. 重启 Gateway；
3. 核验 `life_memo` 不再可见且原 `life_automation`、Telegram、Workboard 和 sessions 保持；
4. 保留失败证据与已创建备忘录，不自动删除用户数据；
5. 插件目录只在确认不再加载后归档，不直接删除。

## 六、资料依据

- OpenClaw Building plugins：<https://docs.openclaw.ai/plugins/building-plugins>
- OpenClaw Tool plugins：<https://docs.openclaw.ai/plugins/tool-plugins>
- OpenClaw Gateway security：<https://github.com/openclaw/openclaw/blob/main/docs/gateway/security/index.md>
- OpenClaw Exec tool：<https://docs.openclaw.ai/bash>
- 项目角色卡：`001-OpenClaw规划设计/AgentCards角色卡/life-蕭觀音/`
- 项目既有插件：`001-OpenClaw规划设计/Plugins插件/life-automation/`
