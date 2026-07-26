# Codex Task Panel 计划审核三：可部署性与真实验收 v0.01

- 审核日期：2026-07-26
- 审核对象：`CodexTaskPanel任务面板部署计划-v0.01.md`
- 关注面：当前版本能否部署、测试是否证明真实目标、是否有假阳性
- 结论：通过；按计划顺序执行

## 1. 现场可部署性

| 前置 | 现场证据 | 结论 |
| --- | --- | --- |
| Workboard 多 board | 2026.7.1-2 CLI/官方文档支持 `--board` | 通过 |
| production 隔离 | 现有 pump 固定 `--board production` | 通过 |
| Codex Scheduled | 当前 Codex app 暴露 automation create/update 能力 | 通过 |
| 后台 thread | 当前 Codex app 暴露 create/read/wait thread 能力 | 通过 |
| 本机 SSH | OpenSSH 与 PuTTY 可用，9222 已验证 | 通过 |
| GitHub 同步 | 当前分支与 origin 同步，可 push | 通过 |
| Telegram 最终通知 | 现有 housekeeper account/session 与 relay 已验证 | 通过 |

## 2. 发现一：不能只验证“卡被看到”

仅能 list card 不证明执行闭环。真实验收必须包含 reserve、thread、policy、三审、结果回写、去重和 Telegram。

结果：计划列出 15 项端到端验收，任一失败不通过。

## 3. 发现二：定时器本身与手动脚本必须分别验证

手动运行客户端只能证明脚本；Scheduled `active` 只能证明声明存在。

验收分为：

1. 客户端离线单元测试；
2. 客户端连接生产只读测试；
3. Codex automation 配置 view 核验；
4. 一次手动等价完整链路；
5. Scheduled 首次空扫描或任务扫描的 run 记录。

如果无法在本轮时间窗口等待一小时，不得伪造周期已自然触发；必须将“声明与手动等价链通过”与“首个自然小时 run”分开记录。

## 4. 发现三：角色入口验收不能污染私人记忆

使用独立 housekeeper 验收 session 或直接官方 Workboard CLI 建只读测试卡；不得把测试对话写入少主私人 Telegram transcript 或长期记忆。最终只发送一次自然语言完成通知。

## 5. 发现四：历史 tasks warning 不能被误算成新故障

基线有一条旧 Cron `lost` warning、无 error。验收标准：

- 新 error 必须为 0；
- warning 不高于基线，或能证明仍是同一历史 taskId；
- 不为本任务清理历史 ledger，避免扩大范围。

## 6. 最终准入清单

- 计划审核一通过；
- 计划审核二通过；
- 当前第三审通过；
- Git worktree clean 或仅含本任务改动；
- 备份和 SHA256 完成；
- 无需少主提供新凭据或 OAuth；
- 所有生产修改均有单独回滚；
- 测试卡只读、无真实业务副作用。

## 7. 本轮判定

三个审核关注面不同，未发现阻止部署的问题。允许从阶段 A 开始执行；每阶段必须记录实际动作、证据、结果和下一阶段许可。

## 8. 部署反馈复审

真实调度先安全暴露了两个假阳性风险：当前 card JSON 的 board 位于 `metadata.automation.boardId`，`show` 结果含 `card` 包装；以及 standalone Scheduled 不应依赖嵌套 `create_thread`。客户端已按现场 schema 修正并通过离线测试；真实 Scheduled 已完成 Discover、claim、heartbeat、三面只读审核和受控 blocked，证明失败不会假写 done。最终可完成卡已由 `CODEX-PANEL-ACCEPTANCE-002` 承担，并按第 9 节新复核门禁执行。可部署性复审通过。

## 9. 最终验收计划复核（CODEX-PANEL-ACCEPTANCE-002）

- 受审输入：本计划第 11 节正文，SHA256 `1b5cccc2303b28632764ef32251b307eba11c64e2abff5643d9c3c95d38ca809`
- 唯一关注面：当前版本兼容、可部署性和假阳性。

现场前置证据：

- OpenClaw `2026.7.1-2 (0790d9f)`；`config validate` 返回 `valid=true`、warnings 为空。
- Gateway service 为 `active/running`，RPC `ok=true`，CLI/Gateway/server 均为 `2026.7.1-2`，插件版本无 drift。
- 客户端离线 Test 的七个契约与负向 case 全部为 true。
- Codex automation TOML 为 `ACTIVE`、`FREQ=HOURLY;INTERVAL=1`、local project、`gpt-5.6-sol`，提示词包含本次完整政策和禁止 `codex` dispatch。

反假阳性门禁：

1. 后续生产验收必须读取结构化字段与八个通道/绑定/数据计数，不能用单一退出码或配置文本替代。
2. 每小时声明与本次真实 Scheduled 领取/执行分开取证；当前卡的 claim、bind、heartbeat 已形成实际运行证据。
3. GitHub 同步必须在 push 后比较本地与 `origin` HEAD；文档中不得保留未完成占位。
4. Workboard 必须由 Complete 返回真实 `done` 和 proof 后才可 Notify；Notify 返回请求成功才算闭环。

本轮结论：当前版本与执行环境具备实施条件，验收设计能识别主要假阳性；第三审通过，允许进入限定实施与真实验证。
