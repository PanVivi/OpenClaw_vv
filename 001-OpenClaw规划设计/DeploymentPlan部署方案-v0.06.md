# 001 OpenClaw架设部署｜DeploymentPlan 部署方案｜v0.06

## 一、部署对象

- housekeeper / 賈南風 v1.06；保留实际稳定 v1.02 回滚。
- life / 蕭觀音 v0.03。
- ops / 魚玄機 v0.05。
- coder / 步非煙 v0.05。
- reviewer / 合并审查 v0.03。
- 三位 companion 另按其候选版分 Change 部署。

本轮文档修改没有部署 NAS。

## 二、部署前只读盘点

1. 固定 Git 提交和角色目录。
2. 核对 NAS Agent、workspace、模型、Bot、binding、Telegram account/chat ID。
3. 记录五文件路径、大小、mtime、权限和 SHA-256。
4. 备份五文件、OpenClaw 配置、任务/审查/自动化记录。
5. 核对实际工具名、allow/deny、sandbox、A2A、session visibility、持久化、weather、calendar、Cron 和 Telegram。
6. 生成完整 diff、权限方案、验证和回滚条件。

缺少事实时只读调查，不覆盖生产。

## 三、运行数据能力

必须有可持久化的：

- Task Record：Owner、Active Handler、Assignment Generation、输入哈希、授权、状态、去重键、证据。
- Stage Record：阶段、受审 Generation、输入集合/哈希、结论、条件和失效规则。
- Gate Record：来源 Stage、唯一下一角色/阶段、目标 Generation、范围、有效期、消费状态。
- Automation Record：owner、Automation Generation、IANA/DST/misfire、occurrence、幂等、重试、投递和失败状态。

若 OpenClaw 原生能力不能精确实现，应使用专用受限代理/记录工具；不得靠提示词冒充硬约束。

## 四、写入顺序

1. 备份目标五文件与配置。
2. 写入角色五文件并核对 SHA-256。
3. 按 PERMISSIONS 转换真实 sandbox、路径、会话和工具 allow/deny。
4. 配置 Task/Stage/Gate/Automation 持久化。
5. 配置 A2A 命名白名单或受限代理。
6. 配置 life weather/calendar/reminder/Telegram/06:00 Cron。
7. validate 后仅做一次必要重启。
8. 创建普通正式新会话，不能跳过 Bootstrap。
9. 按角色和跨角色矩阵验收。

## 五、工程验收

### 处理权

- 新 Generation 接收确认后获得权限；旧处理权拒绝。
- 取消、改派、暂停、超时和恢复撤权正确。

### Stage/Gate

- Stage Record 对特定哈希保持审查历史。
- 方案 Review Gate 只允许指定 coder Generation。
- Risk Gate 只允许指定 ops 执行 Generation。
- 正常指定交接单次消费；重复、错误目标、材料变化、取消、过期和非预期改派拒绝。
- Test 不生成执行 Gate。
- 返工不复用已消费初次实现 Gate。

### 权限

- housekeeper 不具工程执行权限。
- ops 默认只读，生产副作用需现实授权和有效 Risk Gate。
- coder 只能隔离实现，生产全部拒绝。
- reviewer 只能只读审查和写专用 Stage/Gate Record。

### 流程

分别测试简单命令、只交付代码、代码执行、方案失败、产物返工、部署失败、五次熔断、状态不明和恢复。

## 六、生活验收

- life 与 housekeeper 不重复创建生活自动化。
- Automation ID/Generation、持久化、重启恢复、DST、misfire、grace window、幂等、有限重试和失败通知。
- 06:00：Cron `0 6 * * *`、IANA 时区、Exact、life Agent、正式新会话、指定 Telegram account/chat ID、单条中文角色消息。
- life 会话只暴露 housekeeper 和三位 companion；工程会话拒绝。

## 七、证据与回滚

保留源提交、旧版/稳定基线 SHA、备份、diff、写入前后 SHA、配置 validate、重启次数、Bootstrap、Task/Stage/Gate/Automation 记录、正反向测试、Telegram 投递和回滚结果。

任何异常停止新步骤并核对真实状态。賈南風 v1.06 未完成验收前不得删除 v1.02 回滚备份。
