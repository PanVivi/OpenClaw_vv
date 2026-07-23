# 001 OpenClaw架设部署｜FinalDesign 最终设计｜v1.06

## 一、组织结构

八个常驻 Agent 保持不变：housekeeper、life、ops、coder、reviewer 与三位 companion。

## 二、部署原则

采用两层部署：

### 基础层

- 八个独立 Agent、workspace、五文件、模型、Bot/account/binding 和普通会话；
- 角色身份、职责与直接交流；
- 最小 allow/deny；
- 当前会话内的结构化任务与审查记录；
- 生活问题的正确直接回答/转交；
- companion 独立并行；
- 工程权限正反向测试。

### 增强层

- Task/Stage/Gate 专用持久化、硬单次消费和跨重启恢复；
- 精确 A2A 与历史代理；
- life 自动化可靠性；
- 技术子 Agent；
- 完整记忆。

增强层不得成为基础层上线前置。

## 三、生活路由

賈南風直接处理简单、一次性、无需工具和未来状态的生活问答。需要设置、定时、未来主动消息、持续跟踪、专用生活工具或 companion 协调时转给蕭觀音。life 是生活自动化唯一执行所有者。

## 四、工程路由

工程职责链保持：housekeeper 登记与协调 → ops 调查/方案 → reviewer.Review → coder 实现 → ops 核对 → reviewer.Review 产物 → 只交付停止，或 reviewer.Risk → ops 执行/自检 → reviewer.Test → housekeeper 汇总。

基础部署阶段，Review/Risk 的正式结构化输出可作为当前会话的一次性门控记录。未配置持久化时，重启或上下文丢失后停止并重新核对，不得自动续跑。

## 五、companion

三位 companion 的基础运行只依赖独立 Bot/会话、角色加载、直接陪伴、并行和工程权限拒绝。life 主动协调、跨会话历史与记忆属于后续增强。

## 六、权限原则

- housekeeper 无工程副作用权限；
- life 无工程权限；
- ops 默认只读，执行需现实授权和 Risk；
- coder 仅隔离实现；
- reviewer 不修改待审对象；
- companion 只有陪伴会话能力；
- 无法硬隔离历史时保持历史能力关闭，不使用 `visibility=all` 冒充隔离。
