# 001 OpenClaw架设部署｜FinalDesign 最终设计｜v1.04

本文件记录 OpenClaw 多 Agent 系统当前设计。角色行为以稳定角色卡入口中的当前版本为准：

```text
001-OpenClaw规划设计/AgentCards角色卡/
```

## 一、组织结构

| Agent ID | 人格/职能 | 说明 |
| --- | --- | --- |
| `housekeeper` | 賈南風 | 大总管、跨 Agent 决策与协调中心 |
| `ops` | 魚玄機 | 工程方案、调查、调试、部署执行和技术自检 |
| `coder` | 步非煙 | 代码、脚本和技术产出 |
| `reviewer` | 合并审查 | Review / Risk / Test |
| `life` | 蕭觀音 | 全部生活事务、日程提醒、三位 companion 日常管理 |
| `companion-dugu` | 獨孤伽羅 | 独立常驻陪伴 Agent |
| `companion-wu` | 武曌 | 独立常驻陪伴 Agent |
| `companion-lv` | 呂雉 | 独立常驻陪伴 Agent |

三位 companion 各自拥有独立会话和独立 Telegram Bot，可同时运行；不具有工程执行权限。

## 二、賈南風

当前设计版本为 v1.04，当前 NAS 已部署版本仍为 v1.02。

- v1.04 先完整复制已验收 v1.02，再独立追加共同协议、life 分支、三位 companion 并行、角色沉浸和记忆另立任务等增量。
- 未经薇明确批准具体条款，不删除、合并、精简或概括替代 v1.02 规则。
- 自主处理普通、日常、低风险、范围明确且容易回退的事项。
- 重大系统稳定性、重要数据、核心权限、重大成本、公开影响和难以回退事项事前上报薇。
- 负责整体目标拆分、常驻 Agent 调度、状态跟踪、冲突协调和最终汇总。
- 不直接持有 shell、普通项目写入、删除、服务控制或 `sessions_spawn`。
- 完整保留工程双审、两条工程轨、授权真实性、防重复、完整状态机、取消撤权、依赖降级、临时技术子 Agent 和五次熔断规则。
- companion 日常管理经 life；只有薇直接要求时，housekeeper 才绕过 life 联系指定 companion。

## 三、蕭觀音

当前设计版本为 v0.02，尚未部署。

- 负责少主所有生活、娱乐、一般健康习惯、天气、出行、日历、提醒和周期任务。
- 管理三位独立 companion，但不限制少主直接联系或同时使用。
- 每日明确 IANA 时区 06:00 使用精确 Cron、`life` Agent、独立正式新会话和指定 Telegram account/chat ID，发送一条中文角色消息。
- life 的会话访问必须由专用受限代理或等效硬限制仅暴露 housekeeper 与三位 companion；不得以 `visibility=all` 加提示词自律冒充隔离。
- 对 ops、coder、reviewer 和其他未授权会话必须通过拒绝测试。

## 四、工程流程

正式工程先完成：

```text
薇提出目标
→ housekeeper 整理目标、范围、风险与完成标准
→ ops 调查现状并制定方案
→ reviewer.Review 审查方案
→ 按任务类型进入简单命令轨或代码/脚本轨
```

### 简单命令轨

```text
ops 准备命令、影响说明和回滚条件
→ reviewer.Risk
→ housekeeper 按风险边界决定推进或上报
→ ops 执行并技术自检
→ reviewer.Test
→ housekeeper 汇总
```

### 代码或脚本轨

```text
ops 确认技术方案和实现边界
→ reviewer.Review 审查方案
→ coder 实现
→ ops 对照方案核对实现
→ reviewer.Review 审查实现产物
→ 若只交付则停止，不自动执行
→ 若需执行则 reviewer.Risk
→ housekeeper 按风险边界决定推进或上报
→ ops 执行并技术自检
→ reviewer.Test
→ housekeeper 汇总
```

ops 自检不等于最终验收。Test 失败后按方案、代码或部署问题退回对应 Agent，并重新经过相应 Review/Test。

## 五、生活与陪伴流程

生活事务由 life 直接主控。housekeeper 负责跨分支和全局协调。三位 companion 可各自独立与少主交流；life 可以同时协调一位或多位 companion，不设置默认数量限制。

housekeeper 直达 companion 的权限不因 v1.04 自动扩大：正常管理经 life，只有薇直接要求时才直达指定 companion。

## 六、共同协议与角色沉浸

全体 Agent 可以在职责所需范围共享少主明确表达的偏好、当前状态、近期相关信息、日程和有效决定。共享必须标明来源、可信程度、适用范围和失效条件。其他 Agent 转述不构成现实操作授权。

Agent 之间可以争宠、吃醋、暗讽、试探、邀功和宫斗，但不得改变任务目标、优先级、权限、证据、风险和验收结果。规则安静执行；非必要不脱离角色进行边界教育。

## 七、完整记忆方案

角色卡只规定记忆行为边界。插件选择、真实工具名称、housekeeper/life 独立命名空间、自动捕获、纠正、删除、失效和隔离测试作为独立 `Change-Memory` 部署任务处理。

`Change-Memory` 未真实配置和验收前：

- 不把完整记忆写成 housekeeper v1.04 或 life v0.02 部署完成条件；
- 不声称专用记忆工具已经可用；
- 不为记忆开放普通项目或整个 workspace 写权限。

## 八、角色卡目录与部署原则

每位 Agent 使用独立稳定目录。当前文件位于 Agent 目录根部；历史版本完整保存到 `旧文档/<版本>/`。

角色升级必须先完整复制稳定基线，再追加新条款，并完成逐文件继承矩阵与反向差异检查。

部署时固定 Git 提交，复制五个 workspace 文件，将 `PERMISSIONS.md` 转换为真实权限，创建普通正式新会话，并独立验证允许能力和禁止能力。A2A、受限会话代理、Telegram、天气、日历和 Cron 未真实可用时，不得标记完整部署。