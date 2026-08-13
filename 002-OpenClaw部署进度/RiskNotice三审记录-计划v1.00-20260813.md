# RiskNotice 三次计划审核记录

> 审核日期：2026-08-13
> 审核对象：RiskNotice最小正式修复计划-v1.00.md
> 计划 SHA-256：`8bc65de90152b39ee335498c15ab03498205a5b57bfaeff4114b838511af5d60`
> 审核员：夏姬（三个独立会话，互不读取前次结论）
> 审核标准：仅判断四件事——用户目标、接口一致性、安全缺陷、边界控制
> 审核规则：不得因 root/SSH、人工 CLI 等边界外能力未治理而判失败

## 三审结果汇总

| 审核 | 判定 | 标准1: 用户目标 | 标准2: 接口一致 | 标准3: 安全缺陷 | 标准4: 边界控制 | Findings |
|------|------|----------------|----------------|----------------|----------------|----------|
| 第一审 | ✅ PASS | pass | pass | pass | pass | [] |
| 第二审 | ✅ PASS | pass | pass | pass | pass | [] |
| 第三审 | ✅ PASS | pass | pass | pass | pass | [] |

**结论：三次审核全部通过，计划进入实施阶段。**

---

## 第一审完整结果

```json
{
  "verdict": "approve",
  "criterion_1_user_goal": "pass",
  "criterion_1_reason": "计划准确实现了用户目标：(1) 用三个全新独立会话按顺序审核同一份完整资料三次（§4.3：按顺序启动、不接收前次输出、deliver:false、工具调用被前置闸门拦截、只返回严格JSON）；(2) 贾南风发送事前告知且不要求回复（§4.4：正文包含'这是事前告知，不用回复'）；(3) Telegram返回有效messageId后才允许执行一次（§4.4：适配器返回非空messageId且回写状态匹配才记为notified；§4.5：notified→executing后放行、后续同fingerprint一律拦截）。低风险自动执行和中风险内部预检保持不变（§6.1）。原流程中after_tool_call出错恢复approved的缺陷被修复为execution_failed终态、不再自动重试。",
  "criterion_2_api_compatibility": "pass",
  "criterion_2_reason": "计划引用的接口与声明核对的官方资料一致：§3明确声明before_tool_call hook由现有插件已使用并保持原入口；runtime.subagent.run和通道outbound adapter由官方Plugin SDK提供；deliver:false用于reviewer和草拟会话。§4.4使用housekeeper的Telegram account经outbound adapter发送、适配器返回非空messageId的描述与runtime.channel.outbound.loadAdapter('telegram').sendText(...)返回messageId的用法一致。内层前置闸门在before_tool_call内对注册会话拦截工具调用，是对现有hook机制的内部扩展，不引入新API。所有接口用法内部自洽且与现有插件行为一致。",
  "criterion_3_safety_defects": "pass",
  "criterion_3_reason": "逐项检查无明显安全缺陷：(1) 并发审核被阻止——§4.2串行状态更新只允许一次preflight_required→reviewing并写入不可变reviewRunId，第二个并发调用直接拒绝。(2) 终态不可逆——review_blocked、completed、execution_failed均为不可逆终态。(3) 失败禁止重试——§4.5 after_tool_call报错记execution_failed终态，不再恢复为可执行状态。(4) 通知失败不执行——§4.4发送失败或结果不明时停止、不自动补发也不执行；状态未达notified则before_tool_call不会放行。(5) 参数变化重新审核——§4.1参数变化产生新fingerprint须重新走完整流程。(6) reviewRunId拒绝迟到结果——§4.2每条结果回写须同时核对当前状态与reviewRunId，迟到结果不得改变新状态。(7) reviewer/草拟会话工具调用被实时拦截——§4.3/§4.4启动前登记会话、before_tool_call内层前置闸门拒绝所有工具调用，不依赖提示词或事后检查。(8) 通知前再次核对状态——§4.4发送前再次核对记录仍为同一reviewRunId的待通知状态，返回messageId后回写时再次核对状态和运行编号匹配。",
  "criterion_4_scope": "pass",
  "criterion_4_reason": "计划未越出§2声明的明确边界：不扩展为通用安全平台（仅给现有workflow-governance新增review_high_risk内部动作）；不接管root/SSH/人工CLI/Gateway管理RPC/其他插件（§5.4不主动重启Gateway，若需重启则另作新高风险动作处理）；不新建密钥服务（使用现有housekeeper的Telegram account）；不重构全部工具（最小改动）；不修改角色人格（§4.6只增加行为规则不改人格）；保护范围仍为现有插件拦截的riskAgentIds中Agent经exec或process发起且关联正式工作单元的命令。",
  "findings": []
}
```

---

## 第二审完整结果

```json
{
  "verdict": "approve",
  "criterion_1_user_goal": "pass",
  "criterion_1_reason": "计划准确将人工逐命令批准替换为三次独立审核+事前告知（不要求回复）+Telegram确认后执行一次。第一节步骤1-5清晰描述该流程；第二节明确不做范围外事项；第六节验收标准1确认低风险仍自动执行、中风险仍内部预检不询问少主。",
  "criterion_2_api_compatibility": "pass",
  "criterion_2_reason": "before_tool_call hook 用于拦截高风险命令及审核/草拟会话的工具调用（4.3/4.4节，内层高优先级前置闸门，启动前登记）；runtime.subagent.run 用于启动 deliver:false 的审核和草拟新会话（4.3/4.4节）；Telegram outbound adapter 由 housekeeper 账户发送并检查非空 messageId（4.4节）。第三节声明均已与官方文档和生产源码核对，无矛盾。",
  "criterion_3_safety_defects": "pass",
  "criterion_3_reason": "并发：4.2节只允许一次 preflight_required→reviewing 且写入不可变 reviewRunId，第二个并发调用直接拒绝。终态：review_blocked/completed/execution_failed 均为不可逆终态（4.2节）。失败重试：4.5节 after_tool_call 报错记 execution_failed 不再恢复，修复了原 approved 回退缺陷。通知失败不执行：4.4节发送失败或结果不明时停止，不自动补发不执行；1.5节通知未确认送达不执行。参数变化：4.1节新 fingerprint 必须重走完整流程。迟到结果：4.2节每次回写核对当前状态与 reviewRunId，迟到结果不得改变新状态。",
  "criterion_4_scope": "pass",
  "criterion_4_reason": "第二节明确不扩展为通用安全平台，不接管 root/SSH/人工 CLI/Gateway 管理 RPC/其他插件/OpenClaw 之外操作，不新建密钥服务，不重构全部工具，不修改角色人格身份和核心职责。4.6节仅增加行为规则不改人格。保护范围限于现有插件拦截的 riskAgentIds 中 Agent 通过 exec 或 process 发起的已关联工作单元的命令。",
  "findings": []
}
```

---

## 第三审完整结果

```json
{
  "verdict": "approve",
  "criterion_1_user_goal": "pass",
  "criterion_1_reason": "计划第一节明确取消人工逐命令批准，对高风险工程命令改为三审+事前告知+一次放行；第六节验收标准1明确低风险仍自动执行、中风险仍内部预检不询问少主。与用户目标'以三审+告知（不要求回复）+Telegram确认后执行一次'替代人工批准完全对应，低/中风险流程不变。",
  "criterion_2_api_compatibility": "pass",
  "criterion_2_reason": "第三节引用 before_tool_call hook（官方支持工具调用前阻止）、runtime.subagent.run（官方 Plugin SDK 提供）、deliver:false（用于 reviewer/草拟会话不外发消息）、通道 outbound adapter（4.4节用 housekeeper Telegram account 发送并要求非空 messageId）。四处接口引用与官方资料描述一致，计划中均作为既有能力使用，未发明不存在的方法。",
  "criterion_3_safety_defects": "pass",
  "criterion_3_reason": "逐项核对：(1)并发—4.2节串行状态更新只允许一次 preflight_required→reviewing 并写入不可变 reviewRunId，第二个并发调用直接拒绝，验收标准4确认。(2)终态不可逆—review_blocked/completed/execution_failed 为不可逆终态，4.5节 after_tool_call 不再恢复可执行状态。(3)失败禁重试—4.5节 execution_failed 后不再恢复，验收标准8确认。(4)通知失败不执行—4.4节发送失败或结果不明时停止不补发不执行，验收标准7确认无有效 messageId 不执行。(5)参数变化重审—4.1节新 fingerprint 须重新走完整流程。(6)reviewRunId 拒迟到—4.2节每条回写须同时核对当前状态与 reviewRunId，迟到结果不得改变新状态。审核会话工具调用拦截用 before_tool_call 内层前置闸门实现而非仅提示词，4.3/4.4节明确。未发现会导致未通知就执行、重复执行或无法回退的缺陷。",
  "criterion_4_scope": "pass",
  "criterion_4_reason": "第二节明确不扩展为通用安全平台，不接管 root/SSH/人工 CLI/Gateway 管理 RPC/其他插件/OpenClaw 之外操作，不新建密钥服务，不重构全部工具，不修改角色人格身份核心职责。4.6节仅增加行为规则不改人格。保护范围仍为现有插件拦截的 riskAgentIds 中 Agent 通过 exec/process 发起且关联正式工作单元的命令。未越出边界。",
  "findings": []
}
```
