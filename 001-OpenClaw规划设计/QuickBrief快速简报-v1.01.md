# 001 OpenClaw架设部署｜QuickBrief 快速简报｜v1.01

这份文档给后续 AI 快速接手用。先读这一页，再按分类查具体文档。

## 项目目标

为薇的 OpenClaw 搭建一套长期运行的多 Agent 系统。组织名设定为“合欢宗”，系统支持 Telegram Bot、任务调度、代码/调试执行、内部审查、生活娱乐和陪伴分支。

基础称呼设定：

- 组织名：合欢宗。
- 主人/用户名：薇。
- 下级 Agent 对薇的称呼：少爷、少主、公子。
- housekeeper 人格名：賈南風。

## 最终纠偏结论

聊天记录里有两个阶段：

1. 早期十角色设计：賈南風、魚玄機、蕭觀音、步非煙、文薑、薛濤、夏姬、獨孤伽羅、武曌、呂雉。
2. 后期 v2.1 精简落地：把不需要单线联系的角色合并，形成 8 个 agent 目录。

最终落地应以后期 v2.1 精简结构为准。

## v2.1 最终 Agent 结构

Step 1 实际创建的目录：

```text
agents/
├── housekeeper       # 賈南風：总管家 / 总调度
├── ops               # 魚玄機：运营、调试、执行主力
├── coder             # 步非煙：代码与脚本产出
├── reviewer          # 合并审查 Agent：Review / Risk / Test
├── life              # 蕭觀音：生活娱乐主控
├── companion-dugu    # 獨孤伽羅：陪伴
├── companion-wu      # 武曌：陪伴
└── companion-lv      # 呂雉：陪伴
```

关键点：

- 组织外显名称为“合欢宗”，后续配置、记忆、项目摘要中应统一使用该组织名。
- 下级 Agent 面向薇时，应按人格语气选择“少爷 / 少主 / 公子”等称呼，不再使用旧身份名作为对内称呼。
- 薛濤、文薑、夏姬不再作为必须单独联系的 Agent/Bot。
- 她们的职责合并到 `reviewer`：
  - Review：原薛濤职责，方案/代码审查。
  - Test：原文薑职责，功能验收。
  - Risk：原夏姬职责，危险等级和高危上报。
- 保留后续扩展接口：如果将来确实需要，可以再拆出独立 reviewer/tester/supervisor。

## 当前部署进度

已完成：

- `Change-0003` 已结束。
- `INC-2026-0001` 已 resolved。
- Gateway 已从 crash loop 恢复。
- Telegram Provider 正常上线并能收发。
- v2.1 基础配置已生效：`ops agent + Telegram accounts + bindings`。
- Step 1 Workspace Initialization 已执行成功：
  - 新建 26 个目录。
  - `scripts/` 已存在并跳过。
  - 新建 10 个占位文件。
  - `.manifest.json` 已建立，`schema_version: 2.1`，`project: hehuan-sect`。

当前下一步：

```text
Step 2：迁移魚玄機配置到 agents/ops
```

不是重新设计，也不是直接推完整十角色。

## 事故核心

事故编号：`INC-2026-0001`  
变更编号：`Change-0003`

事故原因：配置 Merge 生成了不符合当前 OpenClaw Schema 的配置，导致 Gateway crash loop。

两个 Schema 问题：

1. `bindings` 写成扁平结构，正确结构应为：

```jsonc
{
  "agentId": "ops",
  "match": {
    "channel": "telegram",
    "accountId": "default"
  }
}
```

2. `channels.telegram.accounts.default.agentId` 冗余/不兼容，应删除，由顶层 `bindings[]` 负责路由。

## 后续原则

不要继续堆 v3 设计。先把 v2.1 跑起来。

每次部署只做一个小范围：

```text
备份 → 修改 → validate → replace → restart → smoke test → close
```

