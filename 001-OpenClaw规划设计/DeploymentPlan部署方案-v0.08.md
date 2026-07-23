# 001 OpenClaw架设部署｜DeploymentPlan 部署方案｜v0.08

## 一、部署目标

优先让八个常驻 Agent 完整存在、各自可直接交流，并具有最小正确权限。不要先建设新的任务控制服务或完整记忆系统。

## 二、Phase 1：基础 Agent 集合

对八个 Agent 统一执行：

1. 只读盘点现有 Agent、workspace、模型、Bot、account、binding 和工具。
2. 固定 Git 提交，备份现有五文件和配置。
3. 写入五个 workspace 文件并核对 SHA-256。
4. 配置最小权限：只开放角色基础职责需要的能力，其他默认拒绝。
5. validate 后做必要重启，创建普通正式新会话。
6. 验证身份、称呼、直接会话、停止口令和禁止能力。

基础完成标准：八个 Agent 都能通过各自 Bot/会话独立工作，且不会越权。

## 三、Phase 2：基础协作

- housekeeper → ops/coder/reviewer/life 的结构化发送；
- 当前会话内的 Task ID、材料版本和 Review/Risk/Test 输出；
- 賈南風简单生活直接回答、设置型任务转 life；
- life 使用现有工具创建生活任务，或正确 blocked；
- companion 独立并行，协调能力可用则启用。

A2A 无法安全实现时，不开放全局历史；各 Agent 仍可通过用户直接会话运行。

## 四、Phase 3：增强

按独立 Change 逐项增加：

- Task/Stage/Gate 专用持久化与跨重启恢复；
- 精确会话白名单/受限代理；
- life 自动化 DST/misfire/幂等/重试/恢复；
- companion 主动协调；
- 技术子 Agent；
- 完整记忆。

每项增强独立验收和回滚，不反向阻塞 Phase 1。

## 五、角色重点

- 賈南風 v1.08：直接回答与正确转交、无工程工具、稳定基线完整继承。
- 蕭觀音 v0.05：生活设置唯一所有者、按现有工具真实执行。
- 工程组三角色：魚玄機 / ops、步非煙 / coder、夏姬 / reviewer 职责分离；Review/Risk/Test 不跳过，当前会话记录可先运行。
- 三 companion v0.03：独立直接陪伴、并行、工程权限拒绝。
