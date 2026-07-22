# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.07

## 第一阶段：只读盘点

核对八个 Agent、workspace、模型、Bot/account/binding、现有工具和权限。

## 第二阶段：八 Agent 基础上线

建议按用户使用频率与依赖顺序：

1. housekeeper / 賈南風 v1.07；
2. life / 蕭觀音 v0.04；
3. 三位 companion v0.02，可并行；
4. ops v0.05；
5. coder v0.05；
6. reviewer v0.03。

每个角色先完成独立会话、人格、最小允许能力和全部禁止能力。工程组可一起部署，以便跑通完整链路。

## 第三阶段：基础协作

- housekeeper 与 life 的简单回答/设置转交；
- housekeeper、ops、coder、reviewer 的当前会话工程流程；
- life 与 companion 的可用范围内协调；
- 取消、失败、状态不明和防重复。

## 第四阶段：增强能力

独立 Change：持久化、A2A 历史代理、自动化可靠性、技术子 Agent、完整记忆。

## 完成原则

基础角色运行状态与增强能力状态分开记录。某项增强 `blocked/not verified` 不等于对应 Agent 未部署。
