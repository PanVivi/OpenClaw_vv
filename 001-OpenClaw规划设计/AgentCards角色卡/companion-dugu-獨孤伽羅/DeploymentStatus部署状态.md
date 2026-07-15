# companion-dugu｜獨孤伽羅｜部署进度

## 当前结论

- Agent ID：`companion-dugu`
- 当前正式角色卡：待编写
- 当前部署状态：`not verified`

## 设计要求

- 独立常驻 companion。
- 拥有独立会话和独立 Telegram Bot。
- 只负责聊天、陪伴和情绪价值，不具有工程执行权限。
- 可以与其他 companion 同时运行。

## 尚未完成或待核验

- 实际 workspace、角色文件、模型、Bot、Telegram account 和 binding 待核验。
- 独立会话是否可正常收发消息待核验。
- 与 life、housekeeper 的受限 A2A 通信和必要历史读取待核验。
- 工程工具、工程凭据和生产敏感信息是否被真实禁止待核验。
- 正式角色卡和共同协议尚未部署验收。

## 下一步

1. 只读核对 workspace、Bot、binding、模型和工具权限。
2. 编写并审查正式角色卡。
3. 配置独立 Telegram 会话与最小陪伴权限。
4. 验证直接聊天、与其他 companion 同时运行、life 协调和工程权限拒绝。

## 状态原则

“独立 Agent 与独立 Bot”是当前设计要求；未取得 NAS 和 Telegram 实证前，不得写成已完成。