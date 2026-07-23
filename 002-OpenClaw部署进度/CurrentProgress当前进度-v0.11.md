# 002 OpenClaw架设部署｜CurrentProgress 当前进度｜v0.11

- 状态时间：2026-07-23 11:06 +08:00
- Git 设计基线：`cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`
- 本轮分支：`agent/lossless-content-update`

## 当前设计版本

- 賈南風 v1.09 `CANDIDATE`；NAS 实际 v1.08 `CANDIDATE`。
- 蕭觀音 v0.06 `CANDIDATE`；NAS 实际 v0.05 `CANDIDATE`。
- 魚玄機 v0.07、步非煙 v0.07 `CANDIDATE`；NAS 实际各 v0.06。
- 夏姬 / reviewer v0.05 `CANDIDATE`；NAS 实际 v0.04。
- 獨孤伽羅、武曌、呂雉各 v0.04 `CANDIDATE`；NAS 实际各 v0.03。

本轮角色卡只增加共同协议 v0.03 的 A2A 传输/历史隔离和个人记忆来源隔离，不改变人物属性、称呼、职责、生活路由、工程门控或 companion 直达规则。

## 当前运行事实

- OpenClaw `2026.7.1-2`；system-level Gateway `active`，`NRestarts=0`。
- Gateway 实际服务运行时 Node `v22.22.3`。
- 八个 Agent 和 40 个 workspace 角色文件均已部署，部署时与固定提交一致。
- Telegram 当前三条真实路由：
  - `default` → `ops` / 魚玄機；
  - `housekeeper` → `housekeeper` / 賈南風；
  - `life` → `life` / 蕭觀音。
- coder、reviewer、獨孤伽羅、武曌、呂雉缺 Bot token，account/binding 从未建立，不是事故中丢失。
- coder 使用 `sandbox.mode=all` 且已通过 Docker/工具集成测试；其他七个 Agent 关闭 Sandbox。
- 八 Agent A2A 已启用并分别完成发送验证；`sessions.visibility=all` 只解析目标，`sessions_history` 对八个 Agent 保持拒绝。
- 八个 Agent 都有连续性恢复包；原始 transcript 没有删除。
- housekeeper 已建立仅由自己 transcript 派生的个人聊天恢复索引；ops/life 已确认维护测试不作为个人记忆。

## 本轮文档完成

1. 新建部署后故障与修复复盘；
2. 新建可重复执行的无损内容更新任务；
3. 文档规则增加运行态资料保护和无损更新规则；
4. 共同协议升级到 v0.03；
5. 八张角色卡按小版本完整归档旧版并追加隔离条款；
6. 更新 DeploymentStatus、版本状态、权限建议、工具说明和当前权威索引；
7. 更新 QuickBrief、FinalDesign、Workflows、DeploymentPlan 和 ImplementationRoadmap。

## 未完成

1. 本分支的新角色版本尚未部署到 NAS；
2. 五个缺失 Telegram Bot 仍等待用户提供 token；
3. 专用任务持久化和跨重启自动续跑未部署；
4. 完整长期记忆系统和精细历史授权未部署；
5. 新角色版本完成 NAS 无损部署与真实验收前不得标记 `STABLE`。

## 下一步

1. 固定并推送本分支 commit；
2. 另立 NAS Change，严格执行 `LosslessContentUpdate无损内容更新任务-v0.01.md`；
3. 先备份所有 session、transcript、memory、配置和 Telegram routing；
4. 只更新八套五文件，保留现有配置和会话；
5. 按 Gateway、三条既有 Telegram、个人记忆、A2A/history、coder Sandbox 顺序验收；
6. 五个 Bot token 到位后逐个增量绑定。
