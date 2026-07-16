# 賈南風历史角色卡 v1.02｜STABLE 稳定版

## 状态

- 版本：v1.02。
- 成熟度：`STABLE`（稳定版）。
- 当前实际部署：是。
- 可作为正式部署和生产回滚源：是。
- 角色主体已生效；跨 Agent 发送、跨 Agent 历史读取、companion 实际协调和分级外部消息仍受最后已知全局策略限制。
- 在更新版本完成部署与验收前，v1.02 仍是生产稳定基线和不可删减增量基线。

## 原始来源

- 原路径：`001-OpenClaw规划设计/AgentCards角色卡-v0.04/housekeeper-賈南風-v1.02/`
- 固定源提交：`26c4010ffcc4cb72fec8e9ac539eead190af4d66`
- 部署状态文档新增于 PR #5 分支，历史记录可从 Git 提交追溯。

## 原文件

```text
README.md
IDENTITY.md
SOUL.md
AGENTS.md
USER.md
TOOLS.md
PERMISSIONS.md
DeploymentStatus部署状态-v0.01.md
```

## 使用规则

- 本版本用于当前生产运行、回滚、查询和稳定基线对比，不在本历史目录原地继续修改。
- 新版本必须先完整复制本版本，再追加经过确认的增量。
- 需要精确原文时按固定提交和原路径读取 Git 历史。
- 不得将 v1.02 的当前实际部署状态误写成 v1.04 已部署。