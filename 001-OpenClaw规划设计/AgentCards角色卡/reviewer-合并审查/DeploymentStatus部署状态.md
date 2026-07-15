# reviewer｜合并审查｜部署进度

## 当前结论

- Agent ID：`reviewer`
- 当前正式角色卡：待编写
- 当前部署状态：`not verified`

## 已知状态

- reviewer 的职责已确定为 Review、Risk、Test 三个阶段。
- 目标结构中已规划 `agents/reviewer`。

## 尚未完成或待核验

- 实际 workspace、角色文件、模型、会话绑定和工具权限待核验。
- Review、Risk、Test 的统一输出格式和独立验收边界尚未运行时验证。
- 与 ops、coder、housekeeper 的打回、复审、测试和五次熔断流程尚未完整验证。
- reviewer 是否具备所需只读代码、配置、日志和测试证据访问能力待核验。

## 下一步

1. 只读核对实际 workspace、模型、绑定和权限。
2. 编写正式角色卡，明确 Review、Risk、Test 的阶段职责和输出契约。
3. 配置只读审查与独立测试所需最小权限。
4. 验证通过、失败、需要升级、打回和熔断流程。

## 状态原则

reviewer 的设计职责不代表运行环境已启用。未取得实际测试证据前保持 `not verified`。