# 001 OpenClaw架设部署｜FinalDesign 最终设计｜v1.05

## 一、组织结构

| Agent ID | 角色 | 核心职责 |
| --- | --- | --- |
| `housekeeper` | 賈南風 | 目标理解、正式任务登记、Task Owner、处理权/门控调度、全局汇总 |
| `ops` | 魚玄機 | 工程调查、方案、执行、自检和回滚证据 |
| `coder` | 步非煙 | 隔离实现、测试和产物交付 |
| `reviewer` | 合并审查 | Review / Risk / Test、Stage/Gate Record |
| `life` | 蕭觀音 | 生活事务、提醒自动化和 companion 日常管理 |
| `companion-dugu` | 獨孤伽羅 | 独立陪伴 |
| `companion-wu` | 武曌 | 独立陪伴 |
| `companion-lv` | 呂雉 | 独立陪伴 |

三位 companion 独立会话、独立 Bot、可同时运行，不进入工程流程。

## 二、正式任务数据模型

正式工程、跨 Agent、长期或现实副作用任务记录：Task ID/Change ID、父/分支 ID、Task Owner、Active Handler、Assignment Generation、目标、范围、禁止事项、输入版本/哈希、授权、状态、去重键、证据位置和失效条件。

### Assignment Generation

表示 Active Handler 的处理权租约。每次处理角色转交、退回、重新分派、恢复或 Handler 改变时递增。接收方确认后取得新代次副作用权限；旧处理权撤销。

### Stage Record

reviewer 每个 Review/Risk/Test 阶段对特定输入集合、哈希和环境形成的持久化审查事实。预期交接导致的 Generation 变化不自动抹去材料未变的 Stage Record；材料变化后必须重新审查。

### Gate Record

Review/Risk 通过或附条件通过且需要正式下一跳时生成。包含 Gate ID、来源 Stage、受审哈希、允许唯一下一角色/阶段、目标 Generation、范围、有效期、单次消费状态和失效条件。

正常指定交接时，接收方确认并单次消费 Gate。错误下一跳、重复使用、材料/权限/环境变化、取消、过期或非预期改派使 Gate stale。Gate 不能替代后续门控；Test 不签发生产执行 Gate。

## 三、工程流程

### 方案阶段

housekeeper 分配 ops 调查代次 → ops 确认、只读调查和方案 → reviewer.Review 方案哈希 → 生成一次性 coder 实现 Gate。

### 代码阶段

housekeeper/task controller 创建 Gate 指定 coder Generation → coder 确认并消费 Gate → 隔离实现和测试 → 交付产物哈希 → 新 ops Generation 核对 → reviewer.Review 当前产物。

只交付任务在产物 Review 通过后结束。

返工时不复用已消费的初次实现 Gate。方案不变时依据原方案 Stage Record 和最新产物失败 Stage Record建立新 coder Generation；方案变化则重新方案 Review。

### 执行阶段

ops 形成固定命令/配置/权限/环境/备份/回滚包 → reviewer.Risk → 一次性 ops 执行 Gate → housekeeper 按风险边界决定推进或上报 → ops 指定执行 Generation 确认、消费 Gate、执行和自检 → reviewer.Test → housekeeper 汇总。

## 四、生活与自动化

life 是个人生活提醒、日程、周期生活任务、06:00 晨间消息和 companion 日常消息的唯一执行所有者。每个自动化有 Automation ID、owner_agent、Automation Generation、IANA 时区、当地时间或 UTC 意图、DST/misfire、去重、重试、投递目标、状态和失效条件。

housekeeper 只拥有项目、工程协调、状态汇总和跨域父级自动化。混合任务拆成父任务和专业子任务，不共享写权限或去重键。

## 五、权限与隔离

- housekeeper 无 shell、普通写入、删除、配置、服务控制和 `sessions_spawn`。
- ops 默认只读，生产副作用需当前处理权、现实授权和有效 Risk Gate。
- coder 仅隔离实现；生产能力全部拒绝。
- reviewer 只读审查，仅写专用 Stage/Gate Record，不修改待审对象。
- life 无工程执行权限；会话仅暴露 housekeeper 和三位 companion。
- 无法使用命名白名单时必须使用专用受限代理，不得开放 `all` 后靠提示词自律。

## 六、取消、恢复与熔断

取消/撤权停止未开始步骤；旧处理权和未消费 Gate 失效；在途副作用先核对真实状态再安全收尾。恢复时核对最新任务记录、Generation、Stage/Gate 状态、输入哈希和实际副作用。

coder 被打回五次或 reviewer.Test 连续失败五次时停止原路径，由 housekeeper 重新规划、缩小范围、更换方案、重新分派或暂停。

## 七、版本与部署

当前设计：賈南風 v1.06、蕭觀音 v0.03、魚玄機 v0.05、步非煙 v0.05、reviewer v0.03。设计完成不等于部署完成；固定 Git 提交、五文件 SHA、真实权限及正向/拒绝/恢复测试完成后才能标记 `STABLE`。
