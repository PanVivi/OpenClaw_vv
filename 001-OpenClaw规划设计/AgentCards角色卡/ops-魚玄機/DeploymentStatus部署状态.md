# ops｜魚玄機｜部署进度

## 当前结论

- Agent ID：`ops`
- 当前正式角色卡：待整理
- 当前运行状态：`partially verified`

## 已知已完成

- NAS 中已存在 `agents/ops` 目录。
- 现有记录显示 ops Agent、Telegram accounts 和 bindings 的基础配置已生效。
- 魚玄機曾作为工程调查与执行角色参与 OpenClaw 部署工作。

## 尚未完成或待核验

- 当前 workspace 中实际加载的五个角色文件、版本、大小、权限和 SHA-256 待核验。
- 从旧 workspace 到 `agents/ops` 的配置迁移完成度待核验。
- 当前模型、Telegram Bot、会话绑定和工具 allow/deny 待核验。
- 正式角色卡尚未按当前目录规则整理、审查和版本化。
- 与 housekeeper、coder、reviewer 的 A2A 流程尚未完成统一验收。

## 下一步

1. 对 `agents/ops`、旧 workspace、账号绑定和工具配置做只读盘点。
2. 对照实际运行文件整理正式角色卡。
3. 明确迁移差异、备份、回滚和验收标准。
4. 完成工程方案、执行、自检和跨 Agent 通信验收。

## 状态原则

本文件只记录已确认事实。未取得 NAS 证据的能力保持“待核验”，不得根据历史对话推定已完成。