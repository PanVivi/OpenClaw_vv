# 001 OpenClaw架设部署｜RoleCardAudit 角色卡复审｜v0.07

## 一、审核边界

- 基线：远端 `main` 提交 `cfb4edad793be6df0fb2a690dc5185bb1c1b44ba`
- 运行证据：2026-07-23 NAS 只读核验和已验证部署/恢复报告
- 只处理部署后暴露的 A2A、会话历史、个人记忆来源、实际部署状态与无损更新问题
- 不新增 Agent，不改变人格、称呼、职责、生活路由、工程门控或默认角色表达

## 二、发现

1. 旧角色卡把“不能开放 `visibility=all`”与“不能读取全局历史”写成同一件事，但当前 OpenClaw 需要 `visibility=all` 才能解析八个固定 A2A 目标。
2. 当前实际配置已允许全员 A2A，同时对八个 Agent 明确拒绝 `sessions_history`；旧文档没有记录这一区分。
3. 恢复包中的通用部署摘要曾被误用为 housekeeper 的个人记忆，说明角色卡缺少“个人 transcript 与全局运维事实分离”规则。
4. 八张 DeploymentStatus 仍把已完成的五文件部署写成待核验或未部署，与 NAS 证据冲突。
5. 五个缺失 Telegram Bot 从未建立，旧状态不能继续只写“待核验”，必须明确为缺 token。

## 三、限定修正

- 共同协议升级到 v0.03：
  - 全员可以投递 A2A 消息；
  - `sessions.visibility=all` 仅用于目标解析；
  - `sessions_history` 保持拒绝；
  - A2A 不继承工具、workspace、个人记忆或现实授权；
  - 维护消息不进入个人长期记忆；
  - 个人恢复只能使用该 Agent 自己的 transcript。
- 八张角色卡分别递增一个小版本并完整归档旧版。
- 所有 `AGENTS.md` 内嵌共同协议 v0.03 完整执行摘要。
- `TOOLS.md` 与 `PERMISSIONS.md` 同步实际 A2A/history 边界，但不扩大角色职责。
- DeploymentStatus 分开记录当前设计版与 NAS 实际部署版。

## 四、版本与继承

| Agent | 已归档完整基线 | 当前设计 | 人物/职责变化 |
| --- | --- | --- | --- |
| 賈南風 | v1.08，8 文件 | v1.09 | 无 |
| 蕭觀音 | v0.05，8 文件 | v0.06 | 无 |
| 魚玄機 | v0.06，8 文件 | v0.07 | 无 |
| 步非煙 | v0.06，8 文件 | v0.07 | 无 |
| 夏姬 / reviewer | v0.04，8 文件 | v0.05 | 无 |
| 獨孤伽羅 | v0.03，8 文件 | v0.04 | 无 |
| 武曌 | v0.03，8 文件 | v0.04 | 无 |
| 呂雉 | v0.03，8 文件 | v0.04 | 无 |

归档时根目录与历史副本逐文件 SHA-256 一致，随后才修改当前文件。`IDENTITY.md`、`SOUL.md` 和 `USER.md` 的人物与用户偏好语义保持不变；工程角色仅同步版本标记。

## 五、名称核对

固定名称仍为：

- `reviewer`：夏姬；
- `companion-dugu`：獨孤伽羅；
- `companion-wu`：武曌；
- `companion-lv`：呂雉。

不存在“吴绛仙”或“吕玲绮”角色；这些错误名称没有写入仓库角色卡或 OpenClaw 配置。

## 六、部署判断

新版本可以作为无损部署候选，但尚未部署，因此全部保持 `CANDIDATE`。部署时不得整份覆盖 OpenClaw 配置，也不得重建 session、memory 或 Telegram routing。

## 七、验证要求

- 八套角色包必需文件、版本、Agent ID、人物名和协议版本一致；
- 每个旧版本归档包含 README、CANDIDATE、IDENTITY、SOUL、AGENTS、USER、TOOLS、PERMISSIONS；
- 全员 A2A 与 `sessions_history` 拒绝同时成立；
- 角色卡中没有把通用运维摘要当成个人记忆；
- 当前权威入口无断链；
- `.env.example` 不含实际 secret；
- 当前角色文件和新权威文档的 UTF-8、NUL、尾随空白与 diff 检查通过；
- v1.08 `IDENTITY.md` 原件含 5 个 Markdown 硬换行尾随空格，归档为保证 Git blob 完整继承而原样保留，不在历史副本中改写。
