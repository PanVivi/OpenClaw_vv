# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.28

核验时间：2026-08-09 20:20 +08:00  
分支：`codex/repair-morning-workflow-20260804`

## v0.28 晨间玉简与确定性工作流

- 晨间玉简已恢复 2026-08-04 11:54 华丽定稿，纠正版 Telegram message ID `278`；每天 06:00、`Asia/Shanghai` 的唯一正式 Cron 已启用。
- 蕭觀音 v0.14 可查询晨报真实状态并维护全部允许人工输入的模块；日程默认提前 60 分钟提醒，人工不能覆盖天气、AQI、农历、在线和系统运行事实。
- 賈南風 v1.17 可代收所有晨报模块信息；`pending → applying → applied/blocked` 持久转交生效，只有 life 实际应用后的 `applied` 才算办妥。
- `morning-brief-control 1.0.2`、`life-automation 1.1.0`、`ops-controlled-exec 1.0.0`、`workflow-governance 1.0.2` 已通过本地和生产验收。
- 高风险通用 exec 在副作用前 blocked，不弹原生审批卡；低中风险继续自动或内部复核。Workboard Relay 对 unknown 不重发，控制词和 malformed 不外发。
- 正式计划包和三份独立完整审查已写入官方受管 Task Flow；计划哈希变化会清空三审，失败/活动子任务阻止父项最终通知。
- 身份未改名：`ops/default`、`housekeeper/housekeeper`、`life/life` binding 保持。
- 当前版本没有 Task/Flow mutation Hook，两个 Workboard 分钟轮询暂时保留；上游事件接口、完成恢复缺口和 Telegram ambiguous 是单列限制。

完整证据：`MorningBriefAndWorkflowRepair修复与生产验收报告-v0.01.md`。

## v0.27 及以前完整继承

v0.27 的 life 专属资料区、v0.26 的 Codex 任务面板、v0.25 的角色表达，以及更早的八角色、Telegram、Workboard、A2A、自动化和无损恢复结论继续保留；本轮没有删除历史证据或重建身份。

