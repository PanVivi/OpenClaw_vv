# 001 OpenClaw架设部署｜AgentCards 角色卡库

本目录是八个常驻 Agent 当前角色卡的稳定入口。根目录保存当前版本，旧版本位于各 Agent 的 `旧文档/<版本>/`；实际运行状态只以各 `DeploymentStatus部署状态.md` 为准。

## 当前版本

| Agent ID | 角色 | 当前设计 | 实际部署 |
| --- | --- | --- | --- |
| `housekeeper` | 賈南風 | v1.06 `CANDIDATE` | 最后已知 v1.02 `STABLE` |
| `life` | 蕭觀音 | v0.03 `CANDIDATE` | 未部署 |
| `ops` | 魚玄機 | v0.05 `CANDIDATE` | `partially verified`，版本待核验 |
| `coder` | 步非煙 | v0.05 `CANDIDATE` | `not verified` |
| `reviewer` | 合并审查 | v0.03 `CANDIDATE` | `not verified` |
| `companion-dugu` | 獨孤伽羅 | v0.01 `CANDIDATE` | `not verified` |
| `companion-wu` | 武曌 | v0.01 `CANDIDATE` | `not verified` |
| `companion-lv` | 呂雉 | v0.01 `CANDIDATE` | `not verified` |

## 接手顺序

1. DeploymentStatus；2. VERSION-STATUS；3. README；4. 五个 workspace 文件；5. PERMISSIONS；6. 仅复盘时读旧文档。

## 当前跨角色协议

- Assignment Generation：当前 Active Handler 的处理权租约。
- Stage Record：reviewer 对特定材料/哈希的审查事实。
- Gate Record：Review/Risk 通过后的一次性指定下一跳凭证。
- 正常指定交接消费 Gate，不会因预期 Generation 递增自我失效。
- Gate 重复、错误角色、材料变化、取消、过期或非预期改派必须拒绝。
- life 是全部个人生活自动化的唯一执行所有者。

## 部署原则

固定 Git 提交；备份五文件和配置；按 PERMISSIONS 转换真实权限；创建正式新会话；测试允许、禁止、恢复、Gate 单次消费和自动化可靠性；最后更新 DeploymentStatus。`CANDIDATE` 未验收前不得写成 `STABLE`。
