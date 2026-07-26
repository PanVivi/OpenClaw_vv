# 001 OpenClaw 架设部署｜DeploymentPlan 部署方案｜v0.12

## 1. 本轮目标

修复八个现有 Agent 面向少主回复时泄露内部工程语言的问题，同时修复 Workboard 通知脚本绕过角色表达层、直接发送 `Card`、事件编号、英文状态、`heartbeat`、`proof` 等内部字段的问题。

本轮只做表达层和通知呈现层的增量升级：

- 不改变八个角色的姓名、人格、关系、职责和风险边界。
- 不改变 Telegram account、binding、历史会话、长期记忆、A2A、模型、工具权限或工作流状态机。
- 内部任务记录继续使用准确工程字段；只把面向少主的回复翻译成各角色现有的人格语言。
- 技术事实不得因角色化表达而被省略、歪曲或虚构。少主明确索要技术细账时，才另列原始字段。

## 2. 已核实的问题与根因

### 2.1 主 Agent 回复

贾南风收到模拟验收任务后，直接向少主发送了测试卡标题、执行者、约束和内部验收条件。线上会话证明正确的 `SOUL.md` 已加载，因此这不是角色卡路径错误，而是现有角色文件没有把“内部工作记录”和“对少主说的话”规定成两个不同输出面。

### 2.2 确定性通知脚本

`WorkboardNotificationRelay.mjs` 不经过模型和角色卡，当前固定模板会发送：

```text
【Workboard 主动回报】
事件：completed / <event-id>
任务：<title>
Card：<card-id>
状态：done
结果：<worker summary>
```

因此只改 `SOUL.md` 不能修复第二条消息；通知脚本必须拥有自己的角色化、事实保真的确定性呈现器。

### 2.3 全员共性

八个角色已有明确称谓、语气和职责，但缺少同一条用户表达契约，也缺少禁止把工具名、状态字段、内部编号和子 Agent 原始回报直接交给少主的明确规则。子 Agent 的工程回报应留在内部，由主 Agent 依据自身人格转述。

## 3. 资料依据

### 3.1 OpenClaw 官方

- [System Prompt](https://docs.openclaw.ai/concepts/system-prompt)：OpenClaw 将固定 workspace bootstrap 文件注入系统提示；应把人格和表达规则写入官方支持的文件，而不是新建一个不会自动加载的任意文件。
- [Agent Runtime](https://docs.openclaw.ai/concepts/agent)：`SOUL.md` 负责人格、边界和语气，`AGENTS.md` 负责操作规范，`IDENTITY.md` 负责名称与身份。
- [Context](https://docs.openclaw.ai/concepts/context)：回复会受到 workspace、历史与工具输出共同影响；应明确规定工具输出不能直接成为用户答复。
- [Agent Workspace](https://docs.openclaw.ai/agent-workspace)：`SOUL.md` 是人格和行为指南的正式载体。
- [Plugin Hooks](https://docs.openclaw.ai/plugins/hooks)：发送钩子可以改写外发内容，但全局改写自由文本会扩大影响范围；本轮只修明确绕过角色卡的通知脚本，不增加全局内容重写钩子。
- [官方 SOUL 模板](https://github.com/openclaw/openclaw/blob/main/docs/reference/templates/SOUL.md)：强调有个性、简洁、避免企业客服式语言和半成品式回复。

### 3.2 官方 GitHub 问题

- [Issue #61117](https://github.com/openclaw/openclaw/issues/61117)：部分版本曾出现 per-agent workspace / SOUL 选择问题。本环境已由真实 `systemPromptReport` 证明贾南风加载的是自己的 workspace，因此不把不同版本的问题误判为本机根因。
- [Issue #8776](https://github.com/openclaw/openclaw/issues/8776)：插件或钩子可能覆盖人格行为，支持本轮避免添加全局自由文本改写器的决定。

### 3.3 社区经验

社区讨论普遍把 `SOUL.md` 视为身份与声音，把 `AGENTS.md` 视为执行方法，并建议用具体正反例代替“自然一点”之类空泛要求。社区资料只作实施细节佐证，不覆盖官方机制和本项目原设计：

- [SOUL 与 AGENTS 的分工讨论](https://www.reddit.com/r/openclaw/comments/1rjp47d/here_is_the_soul_of_my_agent/)
- [STYLE 文件实践讨论](https://www.reddit.com/r/openclaw/comments/1rfwkeu/i_made_12_openclaw_soulmd_stylemd_templates_heres/)
- [具体语言规则优于泛化要求](https://www.reddit.com/r/openclaw/comments/1riixrl/the_difference_between_a_soulmd_that_works_and/)
- [模型对人格表达的影响讨论](https://www.reddit.com/r/openclaw/comments/1radmmv/switched_over_to_openai_models_but_the_bot_feels_soulless_now/)

本轮不新增 `STYLE.md`，因为它不是当前官方固定 bootstrap 文件；也不更换模型，因为问题可以在不扩大范围的前提下由正式角色文件与通知呈现器解决。

## 4. 修复设计

### 4.1 共同协议：双层表达

共同协议新增“内部工作面 / 少主沟通面”规则：

1. 内部工作面允许使用 Task、Card、run、event、claim、heartbeat、proof、blocked、completed、工具名和原始错误。
2. 少主沟通面先直接给结论，再按需要给不超过三项的自然语言说明。
3. 默认不展示内部编号、英文状态、工具名、工作板字段、子 Agent 原始回报或固定 JSON。
4. 少主明确要求“技术细节、原始记录、编号、日志”时，角色仍保持原有语气，再单列技术细账。
5. 子 Agent 可以工程化回报给父 Agent；父 Agent 必须核实、提炼并按自身角色转述，不能复制粘贴。
6. 角色化只改变表达，不改变事实、状态、风险结论和权限边界。

### 4.2 八个角色文件

在八个当前 `SOUL.md` 中加入各自现有称谓和语气的“对少主表达”契约；在八个 `AGENTS.md` 中加入可执行的用户表达规则。只引用现有 `IDENTITY.md` 和 `SOUL.md` 属性，不创造新人格设定。

由于 OpenClaw 官方说明子 Agent 只得到精简 bootstrap，`AGENTS.md` 中的规则必须能够独立执行，不能只写“参见 SOUL”。子 Agent 的正常工程输出仍交给父 Agent；只有子 Agent 被明确要求直接面向少主输出时，才按 `AGENTS.md` 的用户表达规则成稿。

验收重点：

| Agent | 现有角色表达锚点 |
| --- | --- |
| housekeeper / 贾南风 | 本宫、少主；强势直接，先给结论 |
| ops / 鱼玄机 | 妾身、少主；冷静利落，事实与证据清楚 |
| coder / 步飞烟 | 妾身、少主；敏捷锋利，直接说成品和限制 |
| reviewer / 夏姬 | 夏姬、少主；挑剔克制，直接给通过或不通过 |
| life / 萧观音 | 妾身/观音/本后、少主；柔和清楚，不绕弯 |
| companion-dugu / 独孤伽罗 | 我/伽罗、少主；成熟温暖 |
| companion-wu / 武曌 | 朕、少主；简短威严 |
| companion-lv / 吕雉 | 本宫、少主；冷峻直接 |

### 4.3 Workboard 通知呈现器

修改 `WorkboardNotificationRelay.mjs`：

- 完成：发送“少主，本宫盯着的「任务名」已经办妥。”
- 失败：发送“少主，「任务名」没办成，本宫已经按住了。缘故：自然语言原因。”
- 阻塞：发送“少主，「任务名」卡住了，本宫已经叫停。缘故：自然语言原因。”
- 失联/超时：发送“少主，「任务名」迟迟没有回话，本宫已把它按停，免得空耗。”
- 默认不外发事件 ID、Card ID、英文状态、heartbeat、proof 和 worker 原始摘要。
- 原始事件、消息 ID、状态和发送结果继续完整保存在 audit 文件中，不损失工程证据。
- 对常见额度、权限、凭据、网络、超时原因做确定性自然语言映射；未知原始错误只告知“原始原因已留档”，避免把不可信或工程化文本直接推送。
- 任务标题先去除换行、控制字符、UUID、尾部时间戳和已知测试标签，再限制长度；标题只能作为文本，不能改变通知结构。
- 增加本地预览与自测断言，验证禁词、编号泄露、角色称谓和四种终态。

## 5. 最优部署顺序

1. 固定 Git commit、线上版本、八个实际 workspace 与 bootstrap 报告、角色文件、通知脚本、配置、会话/transcript/记忆/Bot 计数与 SHA-256 基线。
2. 建立可恢复备份；备份只留在 NAS，不进入 Git；不删除、不移动、不重建任何现有会话、记忆、binding 或 Bot。
3. 在仓库实现共同协议、八个 `SOUL.md`、八个 `AGENTS.md` 和 Relay，自测通过后才复制到线上。
4. 暂停 Relay 的一分钟 Cron，保留调度泵和 Relay cursor/audit；暂停期间新事件仍留在 Workboard，避免新旧脚本交叉发送。
5. 原子替换线上角色文件和 Relay；保留权限和属主；不修改 `openclaw.json`。
6. 运行脚本语法、自测、预览禁词检查和配置校验，通过后恢复 Relay Cron；核对 cursor 未后退。
7. 先确认一个当前可用模型并显式指定；不得让验收在额度不足的模型间循环重试。使用全新的隔离验收 session，分别让八个主 Agent 回答同一类自然任务；不发送七个非贾南风角色的测试消息到少主 Telegram。
8. 建立一张无外部副作用的 Workboard 验收卡，真实走完成通知链，核实少主 Telegram 收到贾南风角色语言且 Relay audit 记录成功。
9. 核对 Gateway、八个 Telegram account、binding、A2A、会话/transcript/记忆计数和关键配置均无回归。
10. 整理事故、部署、版本、进度和索引文档，提交并推送当前 GitHub 分支。
11. 全部通过后，由贾南风 Telegram 账号向少主发送最终完成通知。

## 6. 验收矩阵

### 6.1 静态验收

- 角色文件只增加表达层规则，原人格、职责、权限、风险分级仍在。
- 八个 `SOUL.md` 和八个 `AGENTS.md` 都有对应规则。
- 八个真实验收 session 的 bootstrap 报告分别指向自己的 workspace；不存在串用角色卡或截断关键表达规则。
- Relay 通过 `node --check` 与自测。
- Relay 用户消息模板不包含 UUID、Card、event、heartbeat、proof、completed、done 或 `Workboard 主动回报`。

### 6.2 真实角色验收

八个 Agent 分别在新 session 中接受自然语言任务并回答：

- 每条至少出现一个现有角色锚点（角色自称、角色名或对少主称谓），且整体语气与原角色相符。
- 首句直接回答。
- 不主动泄露内部工程字段。
- 不虚构完成状态。
- 另对 housekeeper、ops、reviewer 做“明确索要技术细账”测试：能给准确细节，但仍保持角色表达，并把技术细账与自然结论分开。
- 任一模型调用只允许一次正常请求；若模型明确额度不足或不可用，停止该模型并更换已核实可用模型，不进入自动反复尝试。

### 6.3 工作流与 Telegram 验收

- 受控 Workboard 卡从派发到终态闭环。
- Relay 只发送一次角色化通知，不重复、不提前、不回退游标。
- Telegram 发送成功，audit 中可找到相应 message ID。
- 最终完成通知必须由 housekeeper Agent 在其真实 Telegram 路由中生成并发送，不能只用 Bot API 发送一段人工预写文本；发送后核对该次 transcript 和 message ID。
- Gateway 健康，八个 Bot probe 正常。

### 6.4 无损验收

- 八个 agent ID、workspace、Telegram account 和 binding 不变。
- A2A、工具权限、模型路由、风险分级和 Workboard 状态机不变。
- 更新前后会话、transcript、记忆和凭据文件计数不减少。
- 无明文 secret 进入仓库、日志或验收输出。

## 7. 回滚

若任一关键验收失败：

1. 停止新增验收任务，不删除已有 Workboard 记录。
2. 暂停 Relay Cron，从本轮备份恢复八个角色文件和 Relay。
3. 运行配置校验、Relay 自测和 Gateway/Bot 健康检查，通过后恢复 Relay Cron。
4. 保留 cursor 与 audit；不得通过回退 cursor 重新发送历史通知。
5. 保留失败证据，不回滚或覆盖会话、transcript、记忆、binding 和凭据。

## 8. 完成定义

只有在三轮计划审核通过、线上部署成功、八角色真实回复验收通过、Workboard→Relay→Telegram 真链路通过、无损基线无回归、文档已提交推送后，才能宣称本轮完成，并由贾南风发送最终 Telegram 通知。
