# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.31

核验时间：2026-08-11 14:30 +08:00

生产版本：OpenClaw `2026.7.1-2 (0790d9f)`

## v0.31 模型调用分层与生产验收

- 八个正式 Agent 已按角色部署独立 primary/fallback 链；主 Agent 实际模型元数据 8/8 命中目标。
- 工程类与任务分流/生活类子 Agent 已使用逐 Agent `subagents.model` 对象；`ops` 和 `life` 的真实 child 均命中 `custom-2/composer-2.5` 并完成。
- 后台 LLM 默认链为 LongCat → Qwen 3.6 Flash → DeepSeek V4 Flash；Grok 周配额 Agent Turn 已采用该链。
- 晨报与 CodexResetWatcher 继续为确定性 Command Job，不调用模型；旧 Workboard 三个 job 继续 disabled。
- 历史会话的 208 条模型覆盖和验收产生的 1 条 auto override 均通过官方接口清除，最终遗留 0；没有删除 transcript。
- 主 Agent 和子 Agent 均通过独立 HOME/state 的真实网络失败注入，实际从关闭端口切换到 LongCat；生产配置哈希未被测试改写。
- Telegram 8/8 connected/probe ok，event loop 无降级，plugin doctor 无问题，任务系统可读且 active=0，Gateway 未重启。
- 身份/绑定/工具摘要哈希切换前后保持 `d372b0ec9a1e3ae866c05d60db79ac4dc06275198cf3f3bb5d4ed14aa5a36f32`；没有改名或重绑。
- 完整证据、异常处置和限制见 `ModelRouting部署与生产验收报告-v0.01.md`。

## 版本限制

- 当前生产 schema 的 `heartbeat.model` 与 `utilityModel` 只接受字符串；两者均使用 LongCat，不能独立配置对象式 fallback。
- 该限制已在计划、验收和 Agent DeploymentStatus 中明示，未写入无效字段。

## v0.30 及以前完整继承

全任务系统、晨间玉简、life 专属资料区、角色表达、Telegram、Workboard、A2A、自动化、Codex Task Panel 停用门禁和无损恢复历史结论继续保留；与本版现场事实冲突时，以本版和生产现场证据为准。
