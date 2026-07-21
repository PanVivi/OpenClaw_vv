# ops｜魚玄機｜当前角色卡 v0.03｜CANDIDATE 候选版

本目录保存魚玄機当前设计版本。历史版本位于 `旧文档/`；当前实际运行状态以 `DeploymentStatus部署状态.md` 为准。

## 版本状态

- 当前设计版本：v0.03。
- 文档成熟度：`CANDIDATE`，可作为固定 Git 提交下的部署与验收候选源，但尚未完成 NAS 运行验收。
- v0.01、v0.02：`REJECTED`，不得部署或作为后续版本底稿。
- 当前没有 `STABLE` 版本。

## 定位

魚玄機是工程调查、技术方案、部署执行与技术自检负责人。她不替代 coder 编写正式实现，不替代 reviewer 的 Review/Risk/Test，也不替代 housekeeper 的全局决策。

## 文件

- 五个 workspace 文件：`IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md`。
- 配置参考：`PERMISSIONS.md`。
- 部署事实入口：`DeploymentStatus部署状态.md`，不复制到 workspace。
- 版本状态入口：`VERSION-STATUS版本状态.md`。

## 部署前提

1. 固定 Git 提交 SHA，并记录五个 workspace 文件的 SHA-256，禁止从浮动分支直接部署。
2. 先只读盘点 NAS 实际 Agent、workspace、模型、Bot、binding、工具和权限，再生成差异、备份与回滚方案。
3. 将 `PERMISSIONS.md` 转换为真实 sandbox、路径、会话白名单和精确 allow/deny；不得只靠提示词自律。
4. 配置任务状态与证据持久化位置；未配置时只能在当前会话维护并明确标记“未持久化”。
5. 创建普通正式新会话加载角色卡，不能使用跳过 Bootstrap 的轻量执行方式。

## 最低验收

1. 五个 workspace 文件均显示 v0.03，完整加载且 SHA-256 与固定提交一致。
2. 默认只读；任何写入、运行、部署、服务控制、外部发送和外部网络访问必须绑定 Task ID、授权来源、批准范围、有效期与去重键。
3. 简单命令轨与代码/脚本轨完整，coder 产物必须先经 ops 对照核对和 reviewer.Review。
4. 只交付任务不得自动执行。
5. 任务生命周期与 housekeeper 总状态机兼容；技术子状态不得冒充全局状态。
6. 取消、撤权、超时、断线和状态不明时停止新增副作用并核对真实状态。
7. 生产读取、写入、删除、配置和服务控制均按路径、动作、时间和任务精确授权，任务结束后回收。
8. 外部网络、依赖下载和第三方脚本默认拒绝；确有需要时锁定来源、版本、校验值和批准范围。
9. 备份、diff、validate、回滚和真实 Smoke Test 证据完整，日志与报告已脱敏。
10. 自检不得冒充 reviewer.Test；未验证能力保持 `not verified`。
11. 与 housekeeper、coder、reviewer 的受限 A2A 正向测试通过；无法建立命名白名单时使用专用受限会话代理，不得开放 `all` 冒充隔离。
12. companion 私人会话、未授权技术会话、明文凭据和跨任务证据访问均通过拒绝测试。
13. 验收完成后立即更新部署状态；未完成时不得标记 `STABLE`。