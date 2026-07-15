# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.02

这份文档供后续 AI 快速接手。先读本页，再按仓库根目录 README 的明确版本路径读取具体文档。

## 项目目标

为薇的 OpenClaw 搭建长期运行的多 Agent 系统。组织名为“合欢宗”，支持 Telegram Bot、任务调度、代码与部署、内部审查、生活娱乐和陪伴分支。

基础身份：

- 主人/用户名：薇。
- 下级 Agent 对薇的称呼：少爷、少主、公子。
- housekeeper 正式人格名：賈南風。

## v2.1 最终 Agent 结构

```text
agents/
├── housekeeper       # 賈南風：总管家 / 总调度
├── ops               # 魚玄機：工程方案、调试和执行主力
├── coder             # 步非煙：代码与脚本产出
├── reviewer          # Review / Risk / Test
├── life              # 蕭觀音：生活与陪伴分支主控
├── companion-dugu    # 獨孤伽羅
├── companion-wu      # 武曌
└── companion-lv      # 呂雉
```

薛濤、文薑、夏姬不再作为必须单独联系的 Agent；职责合并到 `reviewer`。

## 当前部署进度

已完成：

- `Change-0003` 和 `INC-2026-0001` 已关闭。
- Gateway 和 Telegram Provider 正常。
- `ops agent + Telegram accounts + bindings` 基础配置已生效。
- Step 1 Workspace Initialization 已创建八个 Agent 目录和基础目录。

当前下一步仍是：

```text
Step 2：迁移魚玄機配置到 agents/ops
```

仓库中的賈南風角色卡已经定稿，但 NAS 上的 housekeeper、coder、reviewer、life 和 companions 尚未完成正式配置。

## 賈南風部署结论

当前角色包：

```text
AgentCards角色卡-v0.04/
└── housekeeper-賈南風-v1.02/
```

部署分两阶段：

### 阶段 A：角色文件受限试运行

- 核对实际 workspace。
- 备份、diff、批准具体版本和不可变 Git commit SHA。
- 写入五个 workspace 文件。
- 配置最小权限和 A2A 白名单。
- 验证人格、授权来源、拒绝权限、依赖 `blocked` 和 bootstrap 完整性。

阶段 A 不代表賈南風已经成为正式工程总入口。

### 阶段 B：正式协调启用

只有 ops、coder、reviewer、life、A2A 白名单、sender 授权身份、状态存储和真实权限全部验证通过后，才能正式启用。

依赖不可用时，賈南風必须将任务标记为 `blocked`，不得越权代替专业 Agent。

## 首期 companion 路由

```text
賈南風 / housekeeper
→ 蕭觀音 / life
→ companion
```

housekeeper 首期不访问 companion 会话。薇仍可直接联系任一 companion。

## 核心工作流

正式工程任务：

```text
薇
→ 賈南風建立 Task ID、范围和授权记录
→ 魚玄機制定方案
→ reviewer.Review
→ 薇批准具体版本、范围和 commit SHA
→ 步非煙按需实现
→ 魚玄機核对或执行
→ reviewer.Risk / Test
→ 賈南風汇总
```

只交付任务不得自动进入运行、部署或应用。

## 部署原则

```text
只读核对
→ 建立 Task ID / Change ID
→ 备份
→ 完整 diff
→ Review
→ 绑定版本、路径、环境和不可变 commit SHA
→ Approval
→ 写入或执行
→ validate / static test / smoke test / bootstrap test
→ Evidence
→ Close / Block / Cancel / Rollback
```

文件写入成功不等于角色规则已经完整加载。新会话必须检查 bootstrap truncation warning，并验证 `AGENTS.md` 后半段关键规则。
