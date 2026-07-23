# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.06

## 一、当前设计与部署

| Agent | 当前设计 | 实际部署 |
| --- | --- | --- |
| 賈南風 | v1.06 `CANDIDATE` | 最后已知 v1.02 `STABLE` |
| 蕭觀音 | v0.03 `CANDIDATE` | 未部署 |
| 魚玄機 | v0.05 `CANDIDATE` | 待核验 |
| 步非煙 | v0.05 `CANDIDATE` | 待核验 |
| reviewer | v0.03 `CANDIDATE` | 待核验 |
| 三位 companion | 各 v0.01 `CANDIDATE` | 待核验 |

## 二、Change 顺序

1. `Change-Runtime-Inventory`：只读盘点八个 Agent、workspace、模型、Bot、binding、工具和配置。
2. `Change-Task-Control`：实现 Task Record、Active Handler、Assignment Generation、接收确认和旧处理权撤销。
3. `Change-Review-Gates`：实现 Stage/Gate Record、单次指定过渡、消费和失效。
4. `Change-Engineering-Roles`：部署 ops v0.05、coder v0.05、reviewer v0.03，验收完整工程流。
5. `Change-Housekeeper`：在保留 v1.02 回滚下部署賈南風 v1.06。
6. `Change-Life`：部署蕭觀音 v0.03、会话代理和生活自动化可靠性。
7. `Change-A2A`：统一受限 A2A 与拒绝测试。
8. `Change-Companions`：分别部署三位 companion。
9. `Change-Memory`：单独部署受限完整记忆。

Task Control 和 Review Gates 未实现前，不应把工程角色标记完整部署。

## 三、工程验证矩阵

- 最新处理权允许、旧处理权拒绝、改派撤权、跨重启恢复。
- Stage 历史保持；材料变化后不适用。
- Review Gate→coder 单次消费；Risk Gate→ops 单次消费。
- 重复消费、错误角色、错误 Generation、过期、取消和输入变化拒绝。
- 返工不复用初次 Gate；方案变化重新 Review。
- Test 无执行 Gate；ops 自检不替代 Test。
- 简单命令、只交付、执行、失败路由、熔断和回滚。

## 四、生活验证矩阵

- life 唯一所有者，housekeeper 重复创建拒绝。
- Automation Generation 和旧计划撤销。
- IANA/DST、misfire、grace window、幂等、重试、失败通知和重启恢复。
- life 会话允许对象正向测试和工程对象拒绝。
- companion 并行、最小上下文和 Telegram 投递。

## 五、完成标准

角色卡、真实权限、持久化、A2A、自动化和允许/禁止能力均有证据；实际结果写回 DeploymentStatus 和 CurrentProgress。设计文档不能替代运行证据。
