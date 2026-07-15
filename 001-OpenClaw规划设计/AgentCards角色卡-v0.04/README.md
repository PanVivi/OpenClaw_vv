# 001 OpenClaw架设部署｜AgentCards 角色卡库｜v0.04

本目录集中保存合欢宗常驻 Agent 的版本化角色包，供其他 AI、Codex、OpenClaw 部署执行者和审查者直接读取和调用。

## 当前角色包

| Agent ID | 正式角色名 | 版本 | 状态 | 路径 |
| --- | --- | --- | --- | --- |
| `housekeeper` | 賈南風 | `v1.02` | 可直接交给其他 AI 阅读并进入受管部署 | [`housekeeper-賈南風-v1.02/`](housekeeper-賈南風-v1.02/) |

## 使用规则

1. 每个角色使用独立、版本化角色包目录。
2. 角色包内的 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md` 可复制到对应 Agent 的实际 workspace。
3. `PERMISSIONS.md` 是权限设计和配置核对依据，不等同于实际 OpenClaw 配置。
4. 部署前必须确认实际 Agent ID、workspace 路径和当前 OpenClaw 支持的工具名称。
5. 角色包中的禁止规则必须由实际工具 allow / deny、sandbox、workspace 和会话访问控制落实。
6. 复制完成后必须创建新会话，验证人格、职责、路由和权限拒绝是否生效。
7. 旧版本角色包从当前主线移除，避免多个“最新版”并存。

## 正式名称规则

- `housekeeper` 的正式角色名统一为繁体“賈南風”。
- 其他说明文字使用简体中文。
- Agent ID 使用稳定英文标识，不因人格名称或版本变化而改变。

## 设计依据

- `FinalDesign最终设计-v1.03.md`
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
