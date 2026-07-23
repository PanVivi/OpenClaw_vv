# reviewer｜夏姬（合并审查）｜部署进度

- Agent ID：`reviewer`
- 当前设计版本：v0.04 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前运行状态：`not verified`
- 本轮只修改 GitHub 文档，没有部署 v0.04

## 已完成设计

Review/Risk/Test、材料绑定、返工、取消、独立性和熔断已定义；基础层可使用当前会话 Stage/Review/Risk 记录，专用持久化、硬 Gate 和精确 A2A 保留为增强层。

## 待核验

基础待核验：v0.04 五文件与只读权限、当前会话记录单次使用、重复/错误目标拒绝、材料变化失效、方案 Review 只给 coder、Risk 只给 ops、Test 不生成执行许可、生产写入拒绝。

增强待核验：专用 Stage/Gate 持久化、目标 Generation、硬单次消费、精确 A2A 和跨重启恢复。

## 当前运行要素

- 模型：待核验。
- Telegram Bot、account、binding：待核验。
- 只读工具、记录写入与生产 allow/deny：待核验；不得因角色卡存在而视为已配置。
- A2A、会话与历史可见性：待核验；基础部署只要求当前任务结构化收发，历史默认关闭。
- 记忆与自动化：无已验收能力记录，不属于 reviewer 基础上线前置。
- 已知限制：没有 NAS 运行证据，不能确认夏姬人格、三阶段行为或候选版加载状态。

## 下一步与证据

1. 只读盘点现有 reviewer、workspace、模型、Bot/account/binding、工具和权限。
2. 固定提交并核对五文件 SHA-256 后，验证 Review/Risk/Test、记录单次使用和全部生产拒绝。

- 证据来源：来源提交 `90cb37404f575a39d97230f3342e8c2afc597b24` 与本地候选文档；本轮未连接 NAS。
- 最后文档核验时间：2026-07-23（Asia/Taipei）；运行环境仍待核验。

全部通过后才能升级为 `STABLE`。
