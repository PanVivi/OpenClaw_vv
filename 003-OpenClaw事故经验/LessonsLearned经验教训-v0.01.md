# 001 OpenClaw架设部署｜LessonsLearned 经验教训｜v0.01

## 1. 技术经验

### 1.1 Schema validation 是 fail-fast

不要以为一次 `config validate` 会暴露全部问题。正确过程是发现一个错误、修复、重新 validate，再继续处理后续错误。

本次事故中：

- 第一轮暴露 `bindings` 结构错误。
- 第二轮暴露 `accounts.default.agentId` 不兼容。

### 1.2 bindings 是路由权威

Telegram account 只负责账号和 token；路由由顶层 `bindings[]` 控制。

### 1.3 不要让 Merge 脚本自由生成生产配置

Merge 脚本必须具备：

- Schema 版本意识。
- 输出前校验。
- 变更 diff。
- 备份。
- 回滚路径。

## 2. 流程经验

### 2.1 Minimal Change Principle

一次只改一个明确目标，不在修复一个问题时顺手重构无关字段。

### 2.2 根据风险决定审批方式

不再采用“所有小步骤都必须由薇逐项批准”的机械流程。

低风险、范围明确、容易回退的事项：

```text
Design / Inspection
↓
Review / Risk
↓
賈南風自主决定推进
↓
Execution / Evidence
↓
完成后汇报
```

重大高风险事项：

```text
Design
↓
Review / Risk
↓
賈南風上报薇
↓
薇决定 Go / No-Go
↓
Execution / Evidence
↓
Test / Close / Rollback
```

重大高风险包括可能影响整体系统稳定性、持续运行、重要数据、核心权限、重大成本、公开影响或难以回退的操作。

### 2.3 执行者报告事实，大总管负责判断

执行者必须报告：

- 做了什么。
- 改了什么。
- 命令输出是什么。
- 日志显示什么。
- 是否符合验收标准。

执行者不得隐藏风险或擅自扩大范围。

賈南風负责：

- 判断是否继续、暂停或回滚。
- 协调不同 Agent。
- 低风险事项自主决定。
- 重大高风险事项上报薇。
- 汇总最终结论。

### 2.4 先完整读完，再一次性列修改意见

推荐：

1. 完整阅读报告。
2. 一次列出全部意见。
3. 执行者统一修改。
4. 再整体审核。
5. 没问题直接通过或进入下一阶段。

## 3. 部署经验

### 3.1 重大高风险变更必须有 Go / No-Go Pre-check

Replace / Restart 等可能影响核心运行的操作前检查：

- 是否有备份。
- 新配置是否 validate 通过。
- 回滚路径是否明确。
- 重启命令是否明确。
- Smoke Test 是否定义。
- 谁负责失败后的回滚判断。

低风险测试、只读检查和容易回退的步骤不需要全部上报薇，可由賈南風依据风险结论自主推进。

### 3.2 Smoke Test 必须验证真实业务流量

不能只看进程启动。至少验证：

- Gateway 日志无 crash loop。
- Telegram Provider 正常上线。
- Telegram 实际能收发。
- session / routing 不串线。

### 3.3 Incident 和 Observation 分开

`OpenAI API Key 缺失` 记录为 `OBSERVATION-001`，而不是并入 `INC-2026-0001`。这样可以避免 Change 范围膨胀。

## 4. 给后续 AI 的工作要求

- 先读完整上下文，不只看单段对话。
- 区分中间讨论和最后确定。
- 区分设计目标和已经部署。
- 部署建议必须考虑 Schema、备份、validate、回滚和 smoke test。
- 不要说“全部部署好了”，除非有对应证据。
- 以最新角色包为准理解賈南風：她是自主决策的大总管，不是逐项请示的传话人。
- 低风险事项由賈南風自行决定；只有重大高风险事项事前上报薇。
