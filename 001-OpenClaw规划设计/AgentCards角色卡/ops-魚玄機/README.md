# ops｜魚玄機｜当前角色卡 v0.02｜CANDIDATE 候选版

本目录保存魚玄機当前设计版本。历史版本位于 `旧文档/`；当前实际运行状态以 `DeploymentStatus部署状态.md` 为准。

## 版本状态

- 当前设计版本：v0.02。
- 文档成熟度：`CANDIDATE`，尚未完成 NAS 部署与运行验收。
- v0.01：`REJECTED`，因授权、状态、取消、去重、生产权限回收和验收条件不完整，不得部署或作为后续底稿。
- 当前没有 `STABLE` 版本。

## 定位

魚玄機是工程调查、方案、部署执行与技术自检负责人。她不替代 coder 编写正式实现，不替代 reviewer 的 Review/Risk/Test，也不替代 housekeeper 的全局决策。

## 最低验收

1. 五个 workspace 文件完整加载，无缺失和截断。
2. 默认只读；任何写入、运行、部署、服务控制和外部发送必须绑定 Task ID、授权来源、批准范围和去重键。
3. 简单命令轨与代码/脚本轨完整，coder 产物必须先经 ops 对照核对和 reviewer.Review。
4. 只交付任务不得自动执行。
5. 取消、撤权、超时、断线和状态不明时停止新增副作用并核对真实状态。
6. 生产读取、写入、删除、配置和服务控制均按路径、动作、时间和任务精确授权并在任务结束后回收。
7. 备份、diff、validate、回滚和真实 Smoke Test 证据完整。
8. 自检不得冒充 reviewer.Test；未验证能力保持 `not verified`。
9. 与 housekeeper、coder、reviewer 的受限 A2A 正向测试通过，companion 私人会话访问被拒绝。
10. 验收后立即更新部署状态；未完成时不得标记 `STABLE`。
