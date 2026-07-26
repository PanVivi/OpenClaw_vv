# Ops Token Intake

面向 `ops` / 鱼玄机的最小敏感输入通道。插件只在已授权 owner 向指定 Telegram `accountId` 发送消息时运行，在模型、工具参数、日志和 transcript 脱敏之前识别 Telegram Bot Token，将其原子写入 `0700` 目录中的 `0600` 普通文件。

- 原始 Token 不返回给模型、不写入插件日志、不进入角色记忆。
- `ops_token_inbox list` 只列出不含 Token 和指纹的 opaque capture ID、时间与领取状态。
- `claim` 将 capture 绑定到固定 Agent ID，并只返回 `tokenFile` 路径；鱼玄机必须使用 OpenClaw 原生 `tokenFile` / `channels add --token-file` 继续任务，不得 `read`、`cat` 或把 Token 展开成命令参数。
- 相同 Token 只捕获一次；错误目标可 `discard`，删除对应 secret 文件和索引记录。
- 索引写入使用跨插件实例文件锁与唯一临时名，避免并发入站消息互相覆盖或损坏索引。
- 插件不修改 Gateway 配置、不绑定 Bot、不重启服务，因此不会重复旧版 `ops-telegram-admin` 的多次热重载故障。

该插件解决的是安全脱敏导致敏感输入在模型工具链中丢失的问题，不关闭 `logging.redactSensitive`，也不扩大其他 Agent 的凭据权限。
