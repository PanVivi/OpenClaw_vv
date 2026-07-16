# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.03

## 当前文档状态

- 角色卡库稳定入口为 `001-OpenClaw规划设计/AgentCards角色卡/`。
- 八个常驻 Agent 均有独立目录和根目录 `DeploymentStatus部署状态.md`。
- 賈南風当前设计版本为 v1.04；本轮已停止继续修补错误中间稿，改为从已验收 v1.02 六文件完整复制后追加 v1.04 增量。
- 賈南風 `AGENTS.md`、`TOOLS.md`、`PERMISSIONS.md` 已按完整 v1.02 基线重建，并追加已确认增量。
- `IDENTITY.md` 已与 v1.02 blob 完全一致；`SOUL.md` 已恢复 v1.02 并追加角色沉浸增量。
- `USER.md` 已恢复 v1.02 的结构、模式切换和工作偏好；其中具体强烈称呼原文因 GitHub 写入接口安全检查无法逐字写入，当前以“v1.02 已确认的强烈称呼”引用，不影响权限和工程治理。
- 项目级 `DocumentRules` 已加入强制稳定基线、逐文件继承矩阵、禁止无批准精简和写入截断恢复规则。
- `FinalDesign`、`Workflows`、`DeploymentPlan` 和 `ImplementationRoadmap` 已改为从稳定基线派生，不再保留 coder 后直接进入 Risk 的回退流程。
- 蕭觀音当前设计版本为 v0.02；会话命名白名单代理、06:00 精确 Cron 和部署状态设计已明确。

## 最后已知 NAS 运行状态

以下均为历史记录中的最后已知状态，本轮 GitHub 文档修正没有连接 NAS 重新验证：

- 最后已知已部署 housekeeper 为賈南風 v1.02。
- 最后已知模型为 `custom-1/gpt-5.6-luna`。
- 最后已知跨 Agent 发送受 `tools.agentToAgent.enabled=false` 限制。
- 最后已知跨 Agent 历史读取受 `tools.sessions.visibility=tree` 限制。
- 实际 workspace、模型、Telegram Bot/account/binding、配置 SHA、A2A 和 session visibility 均需在部署前只读复核。
- 因此当前运行状态仍只能记录为 `partially completed`，不能根据 GitHub 文档更新为 v1.04 已部署。

## 尚未部署或未验证

- 賈南風 v1.04 尚未写入 NAS，也未进行运行时 Bootstrap、权限、工程流程、A2A、会话和回滚验收。
- 蕭觀音 v0.02 尚未部署。
- life 专用受限会话代理或等效命名白名单机制尚未配置和测试。
- weather、calendar、Telegram 主动发送、提醒和每日 06:00 精确 Cron 尚未配置和测试。
- 完整记忆插件、真实工具名称、housekeeper/life 独立命名空间、自动捕获、纠正、删除、失效和隔离测试尚未设计和部署。
- ops、coder、reviewer 和三位 companion 的正式角色卡尚未全部完成。

## 后续独立任务

1. 完成賈南風 v1.02 → v1.04 逐文件继承矩阵和最终反向差异检查。
2. 合并角色卡目录重构与稳定基线修复 PR。
3. 只读核验 NAS 实际 workspace、模型、Bot、binding、配置和工具状态。
4. 单独部署并验收賈南風 v1.04，保留 v1.02 回滚基线。
5. 单独部署并验收蕭觀音 v0.02、受限会话代理和生活自动化。
6. 单独建立 `Change-Memory`，设计并验收完整记忆方案。
7. 依次编写其他 Agent 正式角色卡。
8. 每次部署、回滚、模型、Bot、binding、权限、记忆、自动化或验收变化后，更新对应 Agent 根目录状态文档。

## 状态原则

- GitHub 当前设计不等于 NAS 已部署。
- “最后已知”不得写成未经重新验证的“当前事实”。
- 工具可见不等于调用成功，会话在线不等于任务完成。
- 未取得 NAS 配置、运行日志、Telegram 投递或真实工具测试证据的字段保持“待核验”。
- 角色升级必须先完整复制稳定基线，再追加增量；不得从错误草稿继续反复修补。