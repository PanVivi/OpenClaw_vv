# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.05

本路线图基于稳定角色卡目录推进。賈南風 v1.04 必须由完整 v1.02 复制后增量升级，不得继续修补错误中间稿。

## 一、当前角色状态

| Agent | 当前设计 | 当前部署 |
| --- | --- | --- |
| 賈南風 / housekeeper | v1.04 | NAS 最后已知仍为 v1.02，待重新核验 |
| 蕭觀音 / life | v0.02 | 尚未部署 |
| 魚玄機 / ops | 待正式角色卡整理 | 以 NAS 实际状态为准 |
| coder / reviewer / companions | 待正式角色卡整理 | 按实际部署记录判断 |

## 二、近期 Change

| Change | 目标 | 状态 |
| --- | --- | --- |
| Change-RoleCards-01 | 合并角色卡目录重构、稳定基线恢复和文档同步 | 进行中 |
| Change-HK-Upgrade | 部署賈南風 v1.04，保留 v1.02 回滚 | 待办 |
| Change-Life-Deploy | 部署蕭觀音 v0.02 | 待办 |
| Change-A2A | 配置受限 A2A | 待办 |
| Change-Life-Session-Proxy | 仅向 life 暴露 housekeeper 与三位 companion | 待办 |
| Change-Life-Automation | 配置 weather、calendar、Telegram、提醒和每日 06:00 Cron | 待办 |
| Change-Memory | 单独设计并部署 housekeeper/life 完整记忆方案 | 待办 |
| Change-Other-Cards | 编写其他正式角色卡 | 待办 |

## 三、賈南風 v1.04 文档基线

1. 从 `housekeeper-賈南風/旧文档/v1.02/` 完整复制 `IDENTITY.md`、`SOUL.md`、`AGENTS.md`、`USER.md`、`TOOLS.md` 和 `PERMISSIONS.md`。
2. 核对复制后内容与 v1.02 blob 一致。
3. 在各文件末尾建立独立 v1.04 增量章节。
4. 只追加已确认的共同协议、life 分支、三 companion 并行、角色沉浸和记忆另立任务。
5. 不扩大 companion 直达权限；只有薇直接要求时 housekeeper 才绕过 life。
6. 建立逐文件继承矩阵和反向差异检查。
7. 未经薇明确批准，不删除、合并、精简、改写旧条款。

## 四、賈南風 v1.04 部署

1. 固定通过继承检查的角色卡提交与路径。
2. 备份 NAS 最后已知 v1.02 五文件和配置。
3. 只读核对实际 workspace、模型、Bot、binding、A2A、session visibility 和工具。
4. 配置受限 A2A；本 Change 不配置完整记忆插件。
5. 写入五文件，validate 通过后只进行一次必要重启。
6. 创建普通正式新会话，完成正反向权限、工程双审、状态机、取消、防重复和熔断验收。
7. 未通过时回滚 v1.02，不误报完整成功。

## 五、蕭觀音 v0.02 部署

1. 固定角色卡路径和提交。
2. 配置 weather、calendar、cron、Telegram 主动投递和最小提醒权限。
3. 配置三位 companion 通信及专用受限会话代理；不得用 `visibility=all` 加提示词自律。
4. 写入五个 workspace 文件并创建正式新会话。
5. 测试人格、生活自主处理、三位 companion 分别和同时通信。
6. 对 housekeeper 与三位 companion 做正向测试，对 ops、coder、reviewer 和其他对象做拒绝测试。
7. 测试提醒创建、查询、修改、暂停、恢复、取消和投递。
8. 手动运行每日 06:00 精确任务，验证中文单条角色消息、真实数据、指定 Bot 和失败通知。
9. 验证普通项目写入、shell、配置、服务控制和 `sessions_spawn` 仍不可用。

## 六、独立完整记忆任务

`Change-Memory` 在角色卡修复和基础部署完成后单独推进：

- 选择实际可用插件或工具；
- 建立 housekeeper 与 life 独立命名空间；
- 明确自动捕获、人工确认、查询、纠正、删除和失效；
- 验证跨角色隔离和普通文件写入拒绝；
- 未完成前不声称完整记忆可用。

不在角色卡或路线图中预先固定未经验证的插件名称和目录路径。

## 七、总体完成标准

- 新角色卡稳定目录成为唯一当前入口。
- 賈南風当前六文件以完整 v1.02 为基线，v1.04 增量独立可识别，无未经批准的删减或权限扩大。
- FinalDesign、Workflows、DeploymentPlan 与角色卡工程流程一致。
- 蕭觀音会话硬隔离、天气、日历、提醒、Telegram 和晨间消息通过真实测试。
- 完整记忆保持独立 Change，不与本轮角色部署混写。
- 所有禁止能力测试通过。
- 每项变更保留备份、diff、SHA、validate、重启、验收和回滚证据。