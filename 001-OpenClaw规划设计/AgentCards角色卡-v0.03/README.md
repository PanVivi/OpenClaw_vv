# 001 OpenClaw架设部署｜AgentCards 角色卡库｜v0.03

本目录集中保存合欢宗常驻 Agent 的版本化角色包，供其他 AI、Codex、OpenClaw 部署执行者和审查者直接读取和调用。

本次 `v0.03` 补充授权来源真实性、外部提示注入防护、只交付不执行分支、Task ID 隔离、熔断计数范围、标准委派信封、取消规则和状态存储边界。

## 当前角色包

| Agent ID | 正式角色名 | 版本 | 状态 | 路径 |
| --- | --- | --- | --- | --- |
| `housekeeper` | 賈南風 | `v1.01` | 已定稿，可直接部署 | [`housekeeper-賈南風-v1.01/`](housekeeper-賈南風-v1.01/) |

## 使用规则

1. 每个角色使用独立、版本化角色包目录。
2. 角色包内的 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md` 可直接复制到对应 Agent 的实际 workspace。
3. `PERMISSIONS.md` 是权限设计和配置核对依据，不等同