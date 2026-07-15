# 001 OpenClaw架设部署｜AgentCards 角色卡库｜v0.02

本目录集中保存合欢宗常驻 Agent 的版本化角色包，供其他 AI、Codex、OpenClaw 部署执行者和审查者直接读取和调用。

## 当前角色包

| Agent ID | 正式角色名 | 版本 | 状态 | 路径 |
| --- | --- | --- | --- | --- |
| `housekeeper` | 賈南風 | `v1.0` | 已定稿，可直接部署 | [`housekeeper-賈南風-v1.0/`](housekeeper-賈南風-v1.0/) |

## 使用规则

1. 每个角色使用独立、版本化角色包目录。
2. 角色包内的 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md` 可直接复制到对应 Agent 的实际 workspace。
3. `PERMISSIONS.md` 是权限设计和配置核对依据，不等同于实际 OpenClaw 配置。
4. 部署前必须核对实际 Agent ID、workspace 路径、工具名称、会话可见性和当前 OpenClaw 版本。
5. 不得把角色包中的权限描述当作已经生效；实际限制必须由工具策略、白名单、sandbox 和 workspace 访问控制实现。
6. 新增或更新角色包时，必须同步仓库根目录 `README.md`、最终设计和相关部署文档中的明确版本路径。

## 正式名称规则

- `housekeeper` 的正式角色名统一为繁体“賈南風”。
- 其他说明文字使用简体中文。
- Agent ID 使用稳定英文标识，不因人格名称或版本变化而改变。

## 设计依据

- `FinalDesign最终设计-v1.02.md`
- `Workflows工作流程-v0.03.md`
- `DocumentRules文档编号规则-v1.01.md`

## 后续扩展

后续可增加：

```text
ops-魚玄機-v0.01/
coder-步非煙-v0.01/
reviewer-合并审查-v0.01/
life-蕭觀音-v0.01/
companion-dugu-獨孤伽羅-v0.01/
companion-wu-武曌-v0.01/
companion-lv-呂雉-v0.01/
```

新增前必须完成角色职责、权限边界、隐私范围和实际部署能力核对。
