# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.05

本路线图基于稳定角色卡目录推进。角色卡设计完成不等于 NAS 已部署。

## 一、当前角色状态

| Agent | 当前设计 | 当前部署 |
| --- | --- | --- |
| 賈南風 / housekeeper | v1.04 `CANDIDATE` | NAS 最后已知 v1.02 `STABLE`，待重新核验 |
| 蕭觀音 / life | v0.02 `CANDIDATE` | 尚未部署 |
| 魚玄機 / ops | v0.01 `CANDIDATE` | `partially verified`，实际版本待核验 |
| 步非煙 / coder | v0.01 `CANDIDATE` | `not verified` |
| 合并审查 / reviewer | v0.01 `CANDIDATE` | `not verified` |
| 三位 companion | 各 v0.01 `CANDIDATE` | `not verified` |

## 二、近期 Change

| Change | 目标 | 状态 |
| --- | --- | --- |
| Change-RoleCards-01 | 角色卡目录重构、稳定基线恢复、八个角色卡和文档同步 | 文档阶段已完成，待最终复核与合并 |
| Change-HK-Upgrade | 部署賈南風 v1.04，保留 v1.02 回滚 | 待办 |
| Change-Life-Deploy | 部署蕭觀音 v0.02 | 待办 |
| Change-Engineering-Cards | 核验并部署 ops/coder/reviewer v0.01 | 待办 |
| Change-Companion-Cards | 核验并部署三位 companion v0.01 | 待办 |
| Change-A2A | 配置受限 A2A | 待办 |
| Change-Life-Session-Proxy | 仅向 life 暴露 housekeeper 与三位 companion | 待办 |
| Change-Life-Automation | 配置 weather、calendar、Telegram、提醒和每日 06:00 Cron | 待办 |
| Change-Memory | 单独设计并部署受限完整记忆方案 | 待办 |
| Change-Other-Cards | 编写其余六个正式角色卡 | 已完成为 v0.01 `CANDIDATE` |

## 三、角色卡部署通用顺序

1. 固定目标角色卡路径、版本与 Git 提交。
2. 只读核对 NAS 实际 workspace、模型、Bot、binding、工具和权限。
3. 备份目标五文件与配置，生成完整 diff、权限方案、验证和回滚方案。
4. 按 `PERMISSIONS.md` 配置最小权限，写入五个 workspace 文件。
5. validate 通过后仅进行必要操作，创建普通正式新会话。
6. 验证人格、职责、允许能力、禁止能力、跨 Agent 路由和停止/取消行为。
7. 真实结果写回根目录部署状态；未完整通过时保持 `CANDIDATE`。

## 四、賈南風与蕭觀音

賈南風 v1.04 必须保持完整 v1.02 稳定基线和独立增量；部署失败时回滚 v1.02。蕭觀音需额外完成 life 会话硬隔离、天气、日历、提醒、Telegram 和每日 06:00 精确任务验收。

## 五、工程组三角色

- ops：核验只读调查、方案、执行、自检、备份/diff/validate/回滚/Smoke Test 和技术子 Agent 门控。
- coder：核验隔离实现、只交付停止、ops 核对、reviewer 复审、生产权限拒绝和五次熔断。
- reviewer：核验 Review/Risk/Test 阶段分离、统一输出、独立 Test、打回路径、只读权限和生产写入拒绝。

## 六、三位 companion

分别核验人物辨识度、独立 Bot 与会话、同时运行、life 日常协调、housekeeper 直达条件、私人内容隔离、记忆真实性和全部工程权限拒绝。

## 七、独立完整记忆任务

`Change-Memory` 单独选择实际可用工具，建立角色独立命名空间，明确捕获、确认、查询、纠正、删除、失效与隔离；未完成前不声称完整记忆可用，也不开放普通项目或整个 workspace 写权限。

## 八、总体完成标准

- 八个常驻 Agent 角色卡结构完整且职责不重叠。
- 设计版本、实际部署版本和成熟度分开记录。
- 工程双审、两条工程轨、生活分支和 companion 并行路由一致。
- 所有允许能力与禁止能力均有真实正反向测试。
- 每项变更保留备份、diff、SHA、validate、验收和回滚证据。
