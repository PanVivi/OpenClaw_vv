# 001 OpenClaw架设部署｜DeploymentPlan 部署方案｜v0.09

## 一、部署目标

八个常驻 Agent 已完成五文件基础部署。后续目标是在保留既有 transcript、session、个人记忆和 Telegram routing 的前提下，增量更新角色内容和已批准配置。不要先建设新的任务控制服务或完整记忆系统。

## 二、Phase 0：无损门控

每次写 NAS 前固定 Git commit，并按 `LosslessContentUpdate无损内容更新任务-v0.01.md` 完成：

1. 只读盘点实际版本、服务 Node、Agent、权限、Sandbox、A2A、Bot/binding 和 session；
2. 停止 Gateway 后制作带 SHA-256 manifest 的一致性备份；
3. 只修改明确文件或配置键，不整份覆盖；
4. 离线 validate，启动最多一次；
5. 按 Gateway → Telegram → session/记忆 → 权限/A2A → 本次功能顺序验收；
6. 任何不可破坏项减少或串线时立即回滚。

## 三、Phase 1：基础 Agent 集合

对八个 Agent 统一执行：

1. 只读盘点现有 Agent、workspace、模型、Bot、account、binding 和工具。
2. 固定 Git 提交，备份现有五文件和配置。
3. 写入五个 workspace 文件并核对 SHA-256。
4. 配置最小权限：只开放角色基础职责需要的能力，其他默认拒绝。
5. validate 后做必要重启，创建普通正式新会话。
6. 验证身份、称呼、直接会话、停止口令和禁止能力。

基础完成标准：八个 Agent 都能通过各自 Bot/会话独立工作，且不会越权。

## 四、Phase 2：基础协作

- 八个固定 Agent 可通过 A2A 投递消息，正式工作仍按职责路由；
- housekeeper → ops/coder/reviewer/life 的结构化发送；
- 当前会话内的 Task ID、材料版本和 Review/Risk/Test 输出；
- 賈南風简单生活直接回答、设置型任务转 life；
- life 使用现有工具创建生活任务，或正确 blocked；
- companion 独立并行，协调能力可用则启用。

当前 `sessions.visibility=all` 只用于目标解析，`sessions_history` 对八个 Agent 保持拒绝。A2A 不授予另一 Agent 的 workspace、工具、个人记忆或现实授权。

## 五、Phase 3：增强

按独立 Change 逐项增加：

- Task/Stage/Gate 专用持久化与跨重启恢复；
- 精细历史授权/受限代理；
- life 自动化 DST/misfire/幂等/重试/恢复；
- companion 主动协调；
- 技术子 Agent；
- 完整记忆。

每项增强独立验收和回滚，不反向阻塞 Phase 1。

## 六、角色重点

- 賈南風 v1.09：直接回答与正确转交、无工程工具、稳定基线完整继承。
- 蕭觀音 v0.06：生活设置唯一所有者、按现有工具真实执行。
- 工程组三角色：魚玄機 v0.07、步非煙 v0.07、夏姬 v0.05 职责分离；Review/Risk/Test 不跳过。
- 三 companion v0.04：独立直接陪伴、并行、工程权限拒绝。
- 新版本只增加 A2A/历史和个人记忆来源隔离，不改变人物属性或职责。
