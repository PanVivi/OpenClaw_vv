# 001 OpenClaw架设部署｜RoleCardAudit 角色卡复审｜v0.05

## 一、复审边界

- 基线：`agent/record-housekeeper-deployment-status`，提交 `90cb37404f575a39d97230f3342e8c2afc597b24`
- 本地分支：`codex/audit-role-cards`；本轮开始时与远端基线 ahead/behind 为 `0/0`
- 只复核八套当前角色包、共同协议、版本继承、权限、部署状态、当前权威入口和未提交差异
- 不增加 Agent、服务、工具、记忆、A2A、自动化或技术子 Agent 范围，不调整人物属性

## 二、本轮发现与修正

ops、coder、reviewer 的入口 `README.md` 仍有一处共同歧义：将增强层硬 Gate 写成基础层执行或通过的必备授权，和当前候选版允许同一正式会话内使用一次性 Review/Risk 通过记录的规则冲突。

已限定修正为：

- ops 基础层由当前会话内可核对的一次性 Risk/Review 通过记录授权指定下一跳；增强层才由 Gate Record 承载硬授权。
- coder 基础层由一次性方案 Review 通过记录授权指定实现轮次；增强层才用 Review Gate 绑定目标 Generation。
- reviewer 基础层形成当前会话内只使用一次的 Review/Risk 通过记录；增强层才生成专用 Gate Record。
- 三张入口页同步区分两类记录的失效、消费和写入边界。
- coder、reviewer 部署状态中的字段名由“当前部署状态”统一为八张共用的“当前运行状态”；状态值没有改变。

没有修改角色身份、性格、称呼、职责、权限或版本号。

## 三、继承与批准证据

賈南風 v1.02 六文件继承与批准矩阵继续以 [RoleCardAudit v0.03](RoleCardAudit角色卡审核-v0.03.md#賈南風-v102-继承与批准矩阵) 为证据。本轮复核确认：

- `IDENTITY.md`、`SOUL.md`、`USER.md` 的 v1.02 非空原句继续完整保留。
- `AGENTS.md`、`TOOLS.md`、`PERMISSIONS.md` 的增量仍只属于已经确认的生活路由、life 自动化唯一所有权、companion 历史最小化和基础/增强分层。
- 本轮未产生新的覆盖项或需要用户批准的人物属性定义。

该链接补回当前审计链，避免只读取最新审核文件时遗漏 v1.02 继承矩阵。

## 四、复审结论

- 八个 Agent 的身份、称呼、职责、直接入口和路由一致。
- 基础层与增强层边界现已在候选说明、工具/权限规则和入口 README 中一致。
- housekeeper/life/companions 不具工程执行权限；coder 无生产权限；reviewer 无待审对象修改和生产权限；ops 副作用仍需现实授权与 Risk。
- 夏姬名称、三位 companion 属性和强羞辱性称呼默认可用规则未改变。

当前审核树可以形成固定提交并进入 Phase 1 受控部署；由于尚未提交且 NAS 未核验，不能声称已部署或升级为 `STABLE`。

## 五、验证

- 八套角色包必需文件、Agent ID、人物名和当前版本一致。
- 八张 `AGENTS.md` 保持共同协议 v0.02 摘要；八张部署状态保持 v1.04 必填字段。
- 当前权威入口无断链；64 个新增归档文件与来源提交对应 blob 一致。
- 賈南風 v1.02 三份稳定人格文件的原句继续完整保留。
- `.env.example` 仍为八个空 Bot token 变量，无实际 secret。
- UTF-8、NUL、语义断言和 `git diff --check` 校验通过；本轮未连接 NAS。
