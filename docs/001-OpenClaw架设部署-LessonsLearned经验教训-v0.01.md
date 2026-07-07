# 001 OpenClaw架设部署｜LessonsLearned 经验教训｜v0.01

## 1. 技术经验

### 1.1 Schema validation 是 fail-fast

不要以为一次 `config validate` 会暴露全部问题。

正确预期：

```text
发现第一个错误
↓
修复
↓
再次 validate
↓
暴露第二个错误
↓
继续修复
```

这次事故中：

- 第一轮暴露 `bindings` 结构错误。
- 第二轮暴露 `accounts.default.agentId` 不兼容。

### 1.2 bindings 是路由权威

Telegram account 只负责账号和 token。

路由应该由顶层 `bindings[]` 控制。

### 1.3 不要让 Merge 脚本自由生成生产配置

Merge 脚本必须有：

- Schema 版本意识。
- 输出前校验。
- 变更 diff。
- 备份。
- 回滚路径。

## 2. 流程经验

### 2.1 Minimal Change Principle

一次只改一个已确认问题。

不要在修复 `bindings` 的时候顺手重构别的字段。

### 2.2 Repair Design → Approval → Execution

后续修复都走：

```text
Repair Design
↓
Approval
↓
Repair Execution
↓
Evidence
↓
Approval
↓
Next Repair
```

### 2.3 执行者只报告事实

执行者必须报告：

- 做了什么。
- 改了什么。
- 命令输出是什么。
- 日志显示什么。
- 是否符合验收标准。

不要替审批者做扩大范围的判断。

### 2.4 审批者负责判断

审批者判断：

- 是否继续。
- 是否回滚。
- 是否进入下一阶段。
- 是否关闭 Change。

### 2.5 先完整读完，再一次性列修改意见

不要一边改一边审。

推荐：

1. 完整阅读报告。
2. 一次列出全部意见。
3. 执行者统一修改。
4. 再整体审核。
5. 没问题直接批准。

## 3. 部署经验

### 3.1 高风险变更必须有 Go / No-Go Pre-check

Replace/Restart 前检查：

- 是否有备份。
- 新配置是否 validate 通过。
- 回滚路径是否明确。
- 重启命令是否明确。
- Smoke Test 是否定义。
- 谁负责判断失败后是否回滚。

### 3.2 Smoke Test 必须验证真实业务流量

不能只看进程启动。

至少验证：

- Gateway 日志无 crash loop。
- Telegram Provider 正常上线。
- Telegram 实际能收发。
- session/routing 不串线。

### 3.3 Incident 和 Observation 分开

这次 `OpenAI API Key 缺失` 被记录为 `OBSERVATION-001`，而不是并入 `INC-2026-0001`。

这个做法正确：

- Incident 只处理本次导致服务中断的直接问题。
- Observation 记录独立的已知问题。
- 避免 Change 范围膨胀。

## 4. 给后续 AI 的工作要求

后续 AI 接手时必须遵守：

- 先读完整上下文，不要只看单段对话。
- 明确区分“中间讨论”和“最后确定”。
- 明确区分“设计目标”和“已经部署”。
- 任何部署建议必须考虑 Schema、备份、validate、回滚、smoke test。
- 不要说“全部部署好了”，除非有对应证据。

