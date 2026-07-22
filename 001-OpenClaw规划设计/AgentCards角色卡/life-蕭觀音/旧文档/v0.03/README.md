# life｜蕭觀音｜当前角色卡 v0.03｜CANDIDATE 候选版

本目录保存当前设计版本。历史版本位于 `旧文档/`；实际运行状态以 `DeploymentStatus部署状态.md` 为准。

## 版本状态

- 当前设计版本：v0.03。
- 文档成熟度：`CANDIDATE`，可作为固定 Git 提交下的部署与验收候选源，尚未实际部署。
- v0.01、v0.02：`REJECTED`，不得部署或作为后续底稿。
- 当前没有 `STABLE` 版本。

## 角色定位

蕭觀音是生活总管、生活娱乐主控、个人提醒与日程自动化唯一执行所有者，以及三位 companion 的日常管理者。她直接处理职责明确的生活事务；跨工程、项目优先级或全局冲突时向 housekeeper 发送最小必要状态。

## v0.03 新增

- 生活提醒、个人日程、周期生活任务、06:00 晨间消息和 companion 日常消息统一由 life 唯一持有。
- 新增 Automation ID、Generation、Task Owner、Active Handler、接收确认和旧代次失效。
- 新增提醒持久化、重启恢复、IANA 时区、DST、misfire、重试、幂等投递和失败通知契约。
- 明确 housekeeper 只能请求 life 创建或修改生活自动化，不能并行建立副本。

## 最低验收

1. 五个 workspace 文件完整加载，版本和 SHA-256 与固定提交一致。
2. 普通生活任务由 life 自主处理，不反复请示 housekeeper。
3. 每个生活自动化只有一个 Automation ID、owner_agent=`life` 和当前 Generation。
4. housekeeper 的同类请求只生成一份 life 自动化；重复创建和旧 Generation 修改被拒绝。
5. 提醒记录事项、IANA 时区、当地时间意图、DST policy、misfire policy、重试策略、幂等键、接收目标、下一次运行和失效条件。
6. Gateway/Agent 重启后从持久化记录恢复，不重复投递；未配置持久化时不得声称提醒可靠生效。
7. 一次性过期提醒和周期任务的漏跑处理符合显式策略，不批量重放历史提醒。
8. Telegram 投递记录成功/失败、消息标识和重试结果；同一 occurrence 不重复发送。
9. 三位 companion 分别、同时发送和状态查询可用，任务代次与最小上下文正确。
10. life 的会话范围只暴露 housekeeper 与三位 companion；对工程会话访问拒绝。
11. 天气、日历使用真实数据；06:00 任务使用精确 Cron、IANA 时区、正式新会话和指定 Telegram 目标。
12. shell、普通文件写入、配置修改、服务控制和 `sessions_spawn` 均不可用。
13. 验收后更新部署状态；未完成时不得标记 `STABLE`。
