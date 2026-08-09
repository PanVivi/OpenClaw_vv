# CANDIDATE｜候选版

- 角色：life / 蕭觀音
- 版本：v0.14
- 状态：`CANDIDATE`
- 当前实际部署：NAS 当前部署；以根目录 `DeploymentStatus部署状态.md` 为准
- 基础部署目标：角色与独立 Bot/会话可用、能直接处理生活交流、接收 housekeeper 设置型转交、按现有工具真实执行或明确 blocked、工程权限全部拒绝
- 本版增量：完整继承 v0.13，新增全部晨报模块 typed 控制、真实状态查询、回读投影、默认提前 60 分钟提醒和正式 handoff 应用；通用文件、shell、配置和其他 Agent 数据继续拒绝
- 后续增强：提醒专用持久化、DST/misfire/幂等/重试、跨重启自动续跑、精细历史授权、companion 主动编排和完整记忆
