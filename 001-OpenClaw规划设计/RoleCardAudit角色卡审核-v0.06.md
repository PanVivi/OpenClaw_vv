# 001 OpenClaw架设部署｜RoleCardAudit 角色卡复审｜v0.06

## 一、复审边界

- 基线：`agent/record-housekeeper-deployment-status`，提交 `90cb37404f575a39d97230f3342e8c2afc597b24`
- 本地分支：`codex/audit-role-cards`；本轮开始时与远端基线 ahead/behind 为 `0/0`
- 只复核八套当前角色包、跨角色基础流程、权限、部署状态、版本继承、当前权威入口和未提交差异
- 不增加 Agent、服务、工具、记忆、A2A、自动化或技术子 Agent 范围，不调整人物属性

## 二、本轮发现

1. 上轮已修正 ops、coder、reviewer 入口 README 的基础/增强层表述，但三张详细 `AGENTS.md` 的流程、交付、取消、执行边界和 A2A 段仍残留无条件 Gate/Gate ID 写法。
2. reviewer `AGENTS.md` 先写 Stage Record 必须进入专用持久化，随后才说明当前会话兼容，顺序上仍可能把持久化误读为基础部署前置。
3. ops、coder、reviewer 的共同协议执行摘要列出长期记忆允许内容，却没有同时声明实际权限和部署验收前不得写入，可能被误读成角色已经取得记忆能力。

这些都是部署层次和能力状态的一致性问题，不涉及角色人格、职责或用户偏好定义。

## 三、限定修正

- ops 的执行报告、方案/代码流程、取消恢复、执行权限和正式消息，统一要求基础层一次性 Review/Risk/Stage 记录；增强层才追加 Gate ID、硬消费和目标绑定。
- coder 的正式输入、返工、交付、执行交接、取消、记录和正式消息采用相同分层；Assignment Generation 继续表示基础任务处理权，没有被改成增强能力。
- reviewer 的 Stage、方案 Review、产物 Review、Risk、流程、取消、生产测试和正式消息统一分层；专用 Stage 持久化明确为增强层。
- 三个工程角色的长期记忆摘要增加实际权限与部署验收条件；当前部署状态仍是“无已验收能力记录”，没有新增记忆权限。
- ops/coder 的证据权限矩阵区分基础审查记录与增强 Gate 状态。

角色版本号保持不变，因为候选树尚未形成固定提交或发布。

## 四、继承与属性核对

- 賈南風 v1.02 六文件继承与批准矩阵继续以 [RoleCardAudit v0.03](RoleCardAudit角色卡审核-v0.03.md#賈南風-v102-继承与批准矩阵) 为证据。
- v1.02 `IDENTITY.md`、`SOUL.md`、`USER.md` 非空原句继续完整保留。
- reviewer 固定 Agent ID 仍为 `reviewer`，展示人格仍为夏姬，Review/Risk/Test 合并职责未改变。
- 三位 companion 属性和强羞辱性称呼默认可用规则未改变。
- 本轮没有需要用户确认的新人物属性问题。

## 五、部署判断

八套角色卡及基础流程仍可形成固定提交并进入 Phase 1 受控部署。当前本地修正尚未提交，且 NAS 未核验，不能声称已经部署或将候选版升级为 `STABLE`。

## 六、验证

- 八套角色包必需文件、Agent ID、人物名、版本、共同协议摘要和部署状态字段一致。
- 当前权威入口和当前角色链接无断链；64 个新增归档文件与来源提交对应 blob 一致。
- 基础记录/增强 Gate、记忆验收和禁止能力语义断言通过。
- `.env.example` 保持八个空 Bot token 变量，无实际 secret。
- UTF-8、NUL、稳定基线继承和 `git diff --check` 校验通过；本轮未连接 NAS。
