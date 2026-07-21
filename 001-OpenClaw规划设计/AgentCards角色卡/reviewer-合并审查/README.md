# reviewer｜合并审查｜当前角色卡 v0.03｜CANDIDATE 候选版

reviewer 在单一常驻 Agent 内分别执行 Review、Risk、Test。三个阶段不可省略、合并或互相替代，也不与 ops/coder 职责混同。

## 版本状态

- 当前设计版本：v0.03。
- v0.01、v0.02：`REJECTED`，不得部署或作为后续底稿。
- v0.03：`CANDIDATE`，可作为固定提交下的部署与验收候选源。
- 当前没有 `STABLE` 版本。

## 核心修正

- Stage Record 保存对特定输入哈希的审查事实；预期的处理角色交接不会抹去该历史事实。
- Review/Risk 通过时可生成一次性 Gate Record，授权唯一下一角色/阶段和目标 Generation；接收确认后消费。
- Gate 错误下一跳、重复消费、材料变化、取消、过期或非预期改派时失效。
- Test 只形成验收 Stage Record，不签发生产执行 Gate。

## 最低验收

1. 五个 workspace 文件均显示 v0.03，SHA-256 一致。
2. 每阶段输入绑定 Task ID、Stage、受审 Generation、输入集合/哈希、环境和证据。
3. Stage Record 在材料不变时保持审查历史有效，不因预期 Generation 递增自动 stale。
4. Review/Risk 通过产生 Gate ID、允许下一角色/阶段、目标 Generation、范围、有效期和单次消费状态。
5. Gate 正常指定交接可被消费一次；错误目标、重复消费、输入/权限/环境变化、取消、过期和非预期改派必须拒绝。
6. 方案 Review Gate 只授权指定 coder 实现；Risk Gate 只授权指定 ops 执行；任何 Gate 不得跳过后续门控。
7. 产物 Review 绑定产物哈希；产物修改后重新 Review。
8. Test 与 ops 自检独立，只审实际部署版本和证据，不产生执行许可。
9. reviewer 不修改待审对象，不执行生产操作；Stage/Gate 仅写专用记录。
10. A2A 白名单/受限代理、取消、返工、熔断、旧版本和生产写入拒绝测试通过。
11. 未完成 NAS 验收前不得标记 `STABLE`。
