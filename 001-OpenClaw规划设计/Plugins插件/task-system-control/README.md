# Task System Control

当前版本：1.0.0

这是 OpenClaw 2026.7.1+ 的确定性任务入口与协调插件。它不把角色记忆当作工作流执行器，而是在 owner Telegram 消息进入模型前先写入持久 inbox，再向本轮注入明确的分流义务；遗漏分流或模块收据时，`before_agent_finalize` 会要求本轮补做一次。

正式跨轮任务使用固定 `agent:housekeeper:task-system` 所有者建立 managed Task Flow；业务执行仍交给官方 Workboard。新任务使用独立 `task-system` 工作板，因为 2026.7.1 的官方 dispatch 是按整个 board 挑选 ready 卡，不支持只派发某一 card；独立 board 防止新任务顺带启动历史 `production` 卡。Workboard 自动产生的真实 Task 和 `task_mirrored` Flow 不会被复制，插件以 card/run/session 和全局 Tasks 账本进行关联。所有 Workboard 调用使用同进程 Gateway RPC，不启动 OpenClaw CLI 子进程。

三个受控工具：

- `task_intake`：分流、建立/检查正式任务、协调真实终态与最终通知收据；
- `task_handoff`：賈南風向其他角色持久转交，只有目标角色接收并产生应用收据才完成；
- `task_module`：列出晨间玉简八模块能力、登记预期写入并检查工具收据。

低风险自动执行，中风险由受控工具内部核查与回滚；高风险由 `workflow-governance` 的动作指纹闸门处理。用户侧不得出现 Card、Task、Host、CWD、UUID 等工程字段，也不得使用原生执行审批卡。
