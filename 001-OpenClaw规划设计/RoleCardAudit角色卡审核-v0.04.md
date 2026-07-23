# 001 OpenClaw架设部署｜RoleCardAudit 角色卡复审｜v0.04

## 一、复审边界

- 基线：`agent/record-housekeeper-deployment-status`，提交 `90cb37404f575a39d97230f3342e8c2afc597b24`
- 本地分支：`codex/audit-role-cards`；本轮开始时与远端基线 ahead/behind 为 `0/0`
- 只审核八套当前角色包、共同协议、版本继承、权限、部署状态、当前权威入口和未提交差异
- 不增加 Agent、服务、工具、记忆、A2A、自动化或技术子 Agent 范围，不调整人物属性

## 二、本轮发现的剩余问题

1. ops/coder `TOOLS.md` 首段仍把“创建技术子 Agent”列在普通建议能力中，可能让基础部署提前开放 `sessions_spawn`。
2. reviewer `TOOLS.md` 将任何“未持久化”记录都视为不能正式通过，与基础层允许当前会话结构化记录相冲突；reviewer/coder `USER.md` 也有相同歧义。
3. housekeeper `PERMISSIONS.md` 将长期记忆写入标为普通“有限”，与完整记忆后置、基础层不开放的总设计不一致。
4. housekeeper `AGENTS.md` 的旧基线技术子 Agent 和长期记忆条款之前缺少基础/增强生效条件，可能在读到后文前造成误解。

## 三、限定范围内的修正

- ops/coder 工具首段明确：技术子 Agent 只在增强层经 Review 启用；基础层保持关闭。
- ops/coder 证据在基础层先绑定哈希并记录，增强层再写专用持久化。
- reviewer 当前会话记录可在证据完整、上下文可核对且明确标注“未持久化”时有限生效；跨会话、重启或无法核对后必须重新审查。
- coder 使用相同的未持久化状态边界，不再把当前可核对记录与失效记录混为一谈。
- housekeeper 长期记忆权限改为“基础否/增强有限”；技术子 Agent 与记忆旧条款前增加明确生效条件。

上述修正不改变任何角色职责或人物属性，也不新增实际能力。

## 四、复审结论

- 八个 Agent 的身份、称呼、职责、直接入口和路由一致。
- housekeeper/life/companions 不具工程执行权限；coder 无生产权限；reviewer 无待审对象修改和生产权限；ops 副作用仍需现实授权与 Risk。
- 基础层不依赖专用持久化、硬 Gate、历史代理、技术子 Agent 或完整记忆。
- 当前会话未持久化记录只在可完整核对的同一会话有效，不得用于跨会话恢复。
- 夏姬名称、三位 companion 属性和强羞辱性称呼默认可用规则未改变。

当前审核树仍可进入固定提交和 Phase 1 受控部署；NAS 未核验前不能声称已经部署或升级为 `STABLE`。

## 五、验证

- 八套角色包必需文件、Agent ID、人物名和当前版本一致。
- 八张 `AGENTS.md` 保持共同协议 v0.02 摘要。
- 八张部署状态保持 v1.04 必填运行维度、证据和核验时间。
- 賈南風 v1.02 的 `IDENTITY.md`、`SOUL.md`、`USER.md` 原句继续完整保留。
- 当前入口无断链；64 个新增归档文件与来源提交对应 blob 一致。
- `.env.example` 仍为八个空 Bot token 变量，无实际 secret。
- `git diff --check` 通过；本轮未连接 NAS。
