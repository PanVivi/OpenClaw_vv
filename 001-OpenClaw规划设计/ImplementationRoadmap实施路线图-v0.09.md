# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.09

## 第一阶段：已完成的基础部署

八个 Agent、workspace 和五文件已部署。ops、housekeeper、life 三条 Bot/account/binding 已验证；其余五条因缺 token 保持未配置。

## 第二阶段：当前角色内容无损更新

按用户使用频率与依赖顺序：

1. housekeeper / 賈南風 v1.09；
2. life / 蕭觀音 v0.06；
3. ops v0.07；
4. coder v0.07；
5. reviewer / 夏姬 v0.05；
6. 三位 companion v0.04，可并行。

按无损更新任务先备份，再逐 Agent 替换五文件；保留原会话、记忆和 binding。新版本只增加 A2A/历史与记忆来源隔离，不改变人格或职责。

## 第三阶段：缺失 Telegram 增量

用户提供五个真实 Bot token 后，逐个建立 coder、reviewer 和三位 companion 的 account/binding；每次只增加一个并完成收发测试，不改已有三条。

## 第四阶段：增强能力

独立 Change：任务持久化、精细历史授权、自动化可靠性、技术子 Agent、完整记忆。

## 完成原则

基础角色运行状态与增强能力状态分开记录。某项增强 `blocked/not verified` 不等于对应 Agent 未部署。
