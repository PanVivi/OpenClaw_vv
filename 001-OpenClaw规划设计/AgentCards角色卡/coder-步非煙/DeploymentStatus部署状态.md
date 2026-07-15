# coder｜步非煙｜部署进度

## 当前结论

- Agent ID：`coder`
- 当前正式角色卡：待编写
- 当前部署状态：`not verified`

## 已知状态

- NAS 目标结构中已规划 `agents/coder`。
- coder 的职责已确定为代码、脚本和技术产出。

## 尚未完成或待核验

- workspace 是否已实际创建、是否加载角色文件，待 NAS 证据确认。
- 模型、Telegram Bot、账号绑定、工具权限和会话能力待核验。
- 正式角色卡尚未编写和审查。
- 与 ops、reviewer、housekeeper 的代码交付和返工流程尚未运行时验收。
- `sessions_spawn` 是否按设计仅用于受审查的技术子 Agent，尚未配置和验证。

## 下一步

1. 只读核对实际 workspace、模型、绑定和权限。
2. 编写并审查正式角色卡与权限矩阵。
3. 配置最小代码产出权限，区分“只交付”和“允许执行”。
4. 验证 ops 方案输入、coder 产出、reviewer 审查和打回流程。

## 状态原则

目录规划或设计职责不等于角色已经部署。未获得运行证据前保持 `not verified`。