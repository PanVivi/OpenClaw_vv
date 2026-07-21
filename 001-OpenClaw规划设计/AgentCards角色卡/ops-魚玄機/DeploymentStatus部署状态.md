# ops｜魚玄機｜部署进度

## 当前结论

- Agent ID：`ops`
- 当前设计版本：v0.02 `CANDIDATE`
- 当前实际部署版本：待核验
- 当前运行状态：`partially verified`
- 最后已知：NAS 中存在 `agents/ops`，基础 Agent、Telegram accounts 和 bindings 曾生效；魚玄機曾参与工程调查与执行。

## 已完成的设计工作

- 五个 workspace 文件和权限矩阵已按 v0.02 补齐。
- 已明确两条工程轨、授权来源、任务状态、取消、防重复、生产权限回收、凭据和真实性规则。
- v0.01 已标记 `REJECTED`，不得作为部署源。

## 待核验

- 实际 workspace 五文件、模型、Bot、binding、权限和 SHA-256。
- 旧 workspace 到 `agents/ops` 的迁移完成度。
- 默认只读与批准范围内执行是否由真实 allow/deny 落实。
- 与 housekeeper、coder、reviewer 的 A2A、两条工程轨、子 Agent 和拒绝测试。
- 临时生产权限是否可精确授予并在任务结束、取消、失败或超时后回收。
- 备份、diff、validate、回滚和真实 Smoke Test 证据链。

## 下一步

只读盘点实际状态；对照 v0.02 生成差异、备份、精确权限、验证和回滚方案；完成正向与拒绝测试后才能升级为 `STABLE`。

设计完成不等于已部署，未取得 NAS 证据的字段保持待核验。
