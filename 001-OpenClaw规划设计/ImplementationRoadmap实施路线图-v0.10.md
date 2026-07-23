# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.10

## 第一阶段：已完成的基础部署

八个 Agent、workspace 和五文件已部署，八条 account-scoped binding 与八个有效 Bot probe 已存在。ops、housekeeper、life、reviewer、companion-wu、companion-lv 六条 connected 正常；coder 与 companion-dugu 因连续热重载触发 `channel stop timed out`，等待完整 Gateway 重启后复验。

## 第二阶段：当前角色内容无损更新

当前设计与 NAS 部署差异：

1. housekeeper / 賈南風 v1.10：已同步；
2. life / 蕭觀音 v0.07：已同步；
3. ops / 魚玄機 v0.11：NAS v0.10，待部署原生 Telegram 绑定文本；
4. coder / 步非煙 v0.07：NAS v0.06；
5. reviewer / 夏姬 v0.05：NAS v0.04；
6. 三位 companion v0.04：NAS v0.03，可并行。

按无损更新任务先备份，再逐 Agent 替换五文件；保留原会话、记忆和 binding。魚玄機 v0.11 不改变人格、职责或工程门控，只移除已停用插件流程。

## 第三阶段：缺失 Telegram 增量

八个 Token 与 binding 已写入。停止继续改配置，执行一次完整 Gateway 重启，确认八个 account 均 `running/connected/probe ok`、无 `restartPending/lastError`，再逐个做真实收发；不重复新增账号或 binding。

## 第四阶段：增强能力

独立 Change：任务持久化、精细历史授权、自动化可靠性、技术子 Agent、完整记忆。

## 完成原则

基础角色运行状态与增强能力状态分开记录。某项增强 `blocked/not verified` 不等于对应 Agent 未部署。
