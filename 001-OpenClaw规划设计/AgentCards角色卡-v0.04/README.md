# 001 OpenClaw架设部署｜AgentCards 角色卡库｜v0.04

本目录集中保存合欢宗常驻 Agent 的版本化角色包，供其他 AI、Codex、OpenClaw 部署执行者和审查者直接读取和调用。

本次 `v0.04` 在 `v0.03` 基础上补充依赖不可用与降级规则、分阶段启用、首期 companion 经由 life 路由、bootstrap 注入完整性检查，以及部署批准绑定具体 Git commit SHA。

## 当前角色包

| Agent ID | 正式角色名 | 版本 | 状态 | 路径 |
| --- | --- | --- | --- | --- |
| `housekeeper` | 賈南風 | `v1.02` | 角色文件已定稿，可进入受管部署 | [`housekeeper-賈南風-v1.02/`](housekeeper-賈南風-v1.02/) |

## 使用规则

1. 每个角色使用独立、版本化角色包目录。
2. 角色包内的 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md` 可复制到对应 Agent 的实际 workspace。
3. “角色文件已定稿”不等于运行时权限、依赖 Agent 和会话路由已经配置完成；必须按部署文档执行受管部署和验收。
4. `PERMISSIONS.md` 是权限设计和配置核对依据，不等同于实际 OpenClaw 配置。
5. 部署前必须核对实际 Agent ID、workspace 路径、工具名称、会话可见性、授权身份、secret profile、状态存储、bootstrap 注入限制和当前 OpenClaw 版本。
6. 不得把角色包中的权限描述当作已经生效；实际限制必须由工具策略、`tools.agentToAgent` 白名单、sandbox、workspace 访问控制、会话可见性和 sender 身份策略实现。
7. 部署批准必须绑定具体角色包版本、目标路径、完整 diff、运行环境和不可变 Git commit SHA；仅批准可变分支名不构成最终部署批准。
8. 新增或更新角色包时，必须同步仓库根目录 `README.md`、最终设计、工作流程、部署方案和实施路线图中的明确版本路径。
9. 旧版本角色包从当前主线移除，避免多个“最新版”并存。

## 分阶段启用

### 阶段 A：角色文件受限试运行

可在确认 workspace、备份、diff、权限拒绝和 bootstrap 注入完整性后，加载五个 workspace 文件，验证人格、称呼、模式切换、授权识别和拒绝边界。

在 `ops`、`coder`、`reviewer`、`life` 等依赖尚未完成配置或无法核验时：

- 正式工程和跨 Agent 任务必须标记为 `blocked`。
- housekeeper 不得代替缺失的专业 Agent。
- 只能完成自身允许范围内的普通问答、文本整理和无副作用任务。

### 阶段 B：正式协调启用

只有在依赖 Agent、会话白名单、授权身份、权限策略和状态存储均完成实机验证后，才允许賈南風作为正式工程总入口投入使用。

首期 companion 路由统一采用：

```text
housekeeper / 賈南風
→ life / 蕭觀音
→ companion
```

housekeeper 不直接获得 companion 会话可见性。少主仍可直接联系任一 companion。

## 正式名称规则

- `housekeeper` 的正式角色名统一为繁体“賈南風”。
- 其他说明文字使用简体中文。
- Agent ID 使用稳定英文标识，不因人格名称或版本变化而改变。

## 设计依据

- `FinalDesign最终设计-v1.02.md`
- `Workflows工作流程-v0.05.md`
- `DeploymentPlan部署方案-v0.04.md`
- `ImplementationRoadmap实施路线图-v0.04.md`
- `DocumentRules文档编号规则-v1.01.md`

## 后续扩展

后续角色包按以下格式新增：

```text
ops-魚玄機-v0.01/
coder-步非煙-v0.01/
reviewer-合并审查-v0.01/
life-蕭觀音-v0.01/
companion-dugu-獨孤伽羅-v0.01/
companion-wu-武曌-v0.01/
companion-lv-呂雉-v0.01/
```

新增前必须完成角色职责、权限边界、隐私范围、授权来源、任务隔离、依赖降级和实际部署能力核对。