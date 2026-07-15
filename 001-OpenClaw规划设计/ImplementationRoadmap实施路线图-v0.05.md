# 001 OpenClaw架设部署｜ImplementationRoadmap 实施路线图｜v0.05

本路线图基于当前多 Agent 结构和稳定角色卡目录推进。

## 一、当前角色状态

| Agent | 当前设计 | 当前部署 |
| --- | --- | --- |
| 賈南風 / housekeeper | v1.04 | NAS 当前仍为 v1.02，跨 Agent 能力部分受限 |
| 蕭觀音 / life | v0.02 | 尚未部署 |
| 魚玄機 / ops | 待正式角色卡整理 | 以 NAS 实际状态为准 |
| coder / reviewer / companions | 待正式角色卡整理 | 按实际部署记录判断 |

## 二、角色卡结构迁移

目标入口：

```text
001-OpenClaw规划设计/AgentCards角色卡/
```

- 每位 Agent 使用独立目录。
- 当前文件直接显示在 Agent 目录。
- 历史版本移入该 Agent 的 `旧文档/<版本>/`。
- 旧的 `AgentCards角色卡-v*` 顶层目录完成内容核对和历史同步后退出当前入口。

## 三、近期 Change 建议

| Change | 目标 | 状态 |
| --- | --- | --- |
| Change-RoleCards-01 | 合并本次角色卡目录重构与文档同步 | 进行中 |
| Change-HK-Upgrade | 部署賈南風 v1.04，保留 v1.02 回滚 | 待办 |
| Change-Life-Deploy | 部署蕭觀音 v0.02 | 待办 |
| Change-A2A | 审查并启用受限 Agent-to-Agent 与会话可见性 | 待办 |
| Change-Memory | 配置 housekeeper 与 life 专用长期记忆写入 | 待办 |
| Change-Life-Automation | 配置天气、日历、Telegram、提醒和每日 06:00 Cron | 待办 |
| Change-Other-Cards | 依次编写 ops、coder、reviewer 和三位 companion 角色卡 | 待办 |

## 四、賈南風 v1.04 部署

1. 固定角色卡提交与 `housekeeper-賈南風/` 路径。
2. 备份 NAS 当前 v1.02 五文件和配置。
3. 核对 v1.04 保留 v1.02 的全部治理规则。
4. 配置受限 A2A、会话可见性和专用长期记忆。
5. 写入五文件，配置 validate，通过后仅进行一次必要重启。
6. 创建普通正式新会话，完成正反向权限和治理验收。
7. 未通过时回滚 v1.02，不误报完整成功。

## 五、蕭觀音 v0.02 部署

1. 固定 `life-蕭觀音/` 路径和提交。
2. 配置 weather、calendar、cron、Telegram 主动投递、sessions 工具和专用 life 记忆。
3. 配置三位 companion 的受限通信和有限历史读取。
4. 写入五个 workspace 文件并创建新会话。
5. 测试人格、生活自主处理、三位 companion 分别和同时通信。
6. 测试提醒创建、查询、修改、暂停、恢复、取消和投递。
7. 手动运行每日 06:00 任务，验证自然口语消息、真实数据和指定 Bot 投递。
8. 验证普通项目文件写入、shell、配置和服务控制仍不可用。

## 六、专用记忆方案

为 housekeeper 与 life 分别建立受限记忆存储。可以使用专用记忆插件或明确目录，例如：

```text
memory/agents/housekeeper/
memory/agents/life/
```

实际路径必须以当前 OpenClaw 配置支持为准。权限只允许对应 Agent 写自己的记忆区域，不允许写其他 Agent、项目或生产文件。

每条长期记忆保存内容、来源、确认状态、适用范围、更新时间和失效条件，并支持查询、纠正和删除。

## 七、总体完成标准

- 新角色卡稳定目录成为唯一当前入口。
- 每位常驻 Agent 都有独立目录。
- 賈南風和蕭觀音当前文件完整，历史版本进入各自旧文档目录。
- 说明文档全部指向新路径和当前版本。
- 賈南風 v1.04 无 v1.02 能力回退。
- 蕭觀音天气、日历、提醒、Telegram、晨间消息、companion 管理和专用记忆通过真实测试。
- A2A 与会话可见性满足职责但不无意扩大工程权限。
- 所有禁止能力测试通过。
- 每项变更保留备份、diff、SHA、validate、重启、验收和回滚证据。