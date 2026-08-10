# Housekeeper Workboard Control

当前版本：1.1.0

賈南風仅能通过固定 schema 调用 Workboard 的启动和只读实况接口。1.1.0 已移除 OpenClaw CLI 子进程，改用 `api.runtime.gateway.request` 的同进程 RPC；因此不会因 CLI 自回调制造额外进程、启动竞态或命令解析面。

新任务应优先走 `task_intake`，由任务总入口先持久登记、建立父 Flow 并关联真实 Task。这个插件保留为人工补派和只读检查入口，不拥有任务状态，也不运行分钟轮询。派发固定在配置的独立 `task-system` 工作板，不会顺带启动历史 `production` 卡。

启动入口不接受 board id，工作板由部署配置固定；查看入口只接受完整卡片 UUID。并发仍由官方 Workboard 控制，两项能力都不暴露任意命令、路径、环境、消息、配置或文件访问。Workboard 和 OpenClaw Tasks/Task Flow 仍是权威账本。
