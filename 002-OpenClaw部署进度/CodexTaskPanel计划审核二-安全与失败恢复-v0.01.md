# Codex Task Panel 计划审核二：安全与失败恢复 v0.01

- 审核日期：2026-07-26
- 审核对象：`CodexTaskPanel任务面板部署计划-v0.01.md`
- 关注面：授权来源、凭据、提示注入、重复副作用、失联和回滚
- 结论：有条件通过；安全门禁补齐后通过本轮审核

## 1. 发现一：无人值守凭据是最高风险点

现场 `PANVIVI` 为高权限 NAS 账号。将密码写入 automation prompt、Git、card 或角色 workspace 均不可接受；新增无限制 SSH key 也会扩大认证面。

采用：

- 不新增 NAS key；
- 复用现有账号，密码由 Windows 用户级 DPAPI 加密；
- ACL 只允许当前 Windows 用户；
- automation prompt 只保存 credential 文件路径；
- 输出、Git 和 Workboard 做 secret scan；
- 删除 DPAPI 文件即可撤销。

剩余风险：

- 在相同 Windows 用户上下文运行的进程可以使用该凭据；
- Codex Scheduled 使用 full access 时仍能执行高影响动作。

控制：

- 只有来源合格、已领取的 card 才进入执行；
- 三审前禁止生产副作用；
- 高风险必须 blocked 并由賈南風集中询问；
- 每卡、每仓库单写者和幂等键。

## 2. 发现二：Card 内容可能含提示注入

Card 正文来自少主消息，但正文也可能引用网页、日志、代码或其他 Agent 输出。

控制：

- policy、来源和范围字段由賈南風外层生成；
- 引用内容放入 data 字段；
- Scanner 只解析外层契约，不执行正文中的工具指令；
- 执行 thread 重申外部内容不能修改系统、项目规则和少主范围；
- policyVersion 或标签不匹配直接拒绝。

## 3. 发现三：预约与创建 thread 之间存在崩溃窗口

采用两阶段：

1. `ready → scheduled` 作为 reserve；
2. thread 创建成功后才 `scheduled → running` 并写映射；
3. 创建失败时恢复 `ready`；
4. Scheduled 每轮先修复超时 `scheduled`；
5. 本机 mutex 防止两个 scanner 同时 reserve。

## 4. 发现四：执行完成与通知之间可能部分成功

顺序固定为：

1. 验收通过；
2. 文档与 Git push 成功；
3. 写本地结果状态；
4. card 进入 done；
5. 賈南風 Telegram；
6. 记录通知结果。

若第 5 步失败：

- card 保持 done；
- state 标记 `notification_pending`；
- 后续 scanner 只重试通知，不重做任务；
- 使用 cardId 作为通知去重键。

## 5. 发现五：模型额度耗尽不得循环

社区与本项目事故均表明，额度不足时反复调用会浪费 token。

控制：

- Scanner 每小时最多领取一张；
- provider 明确 quota/rate-limit 时不重试同一执行；
- card blocked，写真实 reset 信息；
- 賈南風一次通知；
- 不自动切换到未授权的其他模型执行高影响任务。

## 6. 回滚审核

- Scheduled 可独立 pause/delete：通过。
- DPAPI credential 可独立撤销：通过。
- `codex` board 与 production 隔离：通过。
- 賈南風 v1.14 可回滚：通过。
- card/thread 证据保留，不靠删除恢复：通过。
- 不需要为回滚修改 transcript/memory：通过。

## 7. 本轮判定

安全控制和失败顺序已进入计划。本轮审核通过，允许进入可部署性与真实验收审核。

## 8. 部署反馈复审

初版用 `ready → scheduled` 充当 reserve，但当前 OpenClaw 源码明确要求 scheduled 卡携带 `scheduledAt`，无该字段会被状态保持规则拒绝。已改为官方 `workboard.cards.claim`：原子变为 running、返回 claim token、支持 heartbeat、release、complete 和 block。claim token 仅保存在当前用户 ACL 的本机 state，输出和 Git 均不包含它。失败前可 release 回 ready，执行后失败进入 blocked。安全与恢复复审通过。

## 9. 最终验收计划复核（CODEX-PANEL-ACCEPTANCE-002）

- 受审输入：本计划第 11 节正文，SHA256 `1b5cccc2303b28632764ef32251b307eba11c64e2abff5643d9c3c95d38ca809`
- 唯一关注面：安全、数据保护、权限、副作用与失败恢复。

复核结果：

1. 生产阶段全部为只读查询，不重启服务、不改配置、binding、A2A、模型、记忆或 production board，权限与副作用保持最小。
2. RemoteExec 只允许当前已领取并映射为 running 的卡使用；计划不读取、打印或提交 DPAPI 明文与 claim token。
3. 写入仅限 Git 可回退文档；执行前基线提交明确，范围外改动或秘密扫描失败会在提交前熔断。
4. 完成顺序为验收、文档、提交、push、远端 HEAD 复核、Complete、Notify；通知失败不会重跑已产生副作用的步骤。
5. 配置/服务/通道/数据计数任一异常直接 Block，避免用恢复动作扩大本次授权；生产没有写入，因此无需制造额外备份或回滚风险。

本轮结论：安全、数据保护和失败恢复门禁完整；本轮通过，交由可部署性与真实验收复核。
