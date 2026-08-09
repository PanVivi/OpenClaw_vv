---
name: morning-brief-control
description: Control the single 合欢宗晨间玉简 from natural-language life information. Use morning_brief_control for life/蕭觀音 and morning_brief_handoff for housekeeper/賈南風. The tools expose exact action enums and a guide action; never use life_files, web_fetch, sessions_spawn, or sessions_yield to discover this skill or guess tool syntax.
---

# 晨间玉简控制

把少主的话映射到唯一晨报的受控数据入口。角色文件和本 Skill 只负责识别与表达；真实完成以专用工具的写入和回读结果为准。

## 先判断当前角色

- 当前是 `life` / 蕭觀音：使用 `morning_brief_control` 直接查询或写入。
- 当前是 `housekeeper` / 賈南風：使用 `morning_brief_handoff` 转交；只有返回 `applied=true` 才能告诉少主已经录入。
- 其他 Agent：不得代写或代建提醒；转交给賈南風或蕭觀音。

不要用 `life_files` 手工编辑晨报 JSON，不要用 `life_automation list` 推断晨报数量，也不要为同一事件另建一份并行提醒。

## 模块映射

| 少主表达 | 模块 | 操作 |
|---|---|---|
| 称呼、晨辞、祝语、问候风格 | `header` | `set_preference` 或有期限的 `upsert_note` |
| 去哪里、哪几天出行、天气重点 | `weather` | `set_location`、`set_preference` 或 `upsert_note` |
| 空气敏感、户外运动安排 | `aqi` | `set_preference` 或 `upsert_note` |
| 怕冷怕热、通勤、穿衣禁忌、随身物 | `attire` | `set_preference` 或 `upsert_note` |
| 生活待办、进度、截止日 | `tasks` | `upsert_task` / `set_task_status` / `archive_task` |
| 门人近况、需关注事项 | `disciples` | `upsert_note`；不得手填在线状态 |
| 日程、约会、考试、班次外安排 | `schedule` | `upsert_event` / `cancel_event` |
| 小签显示、签语风格、当天寄语 | `folk_calendar` | `set_preference` 或 `upsert_note` |

天气数值、AQI、农历、黄历、系统任务结果和 Agent 在线状态是自动事实。少主可以补充关注点或个人感受，但不得把手工值写成实测或运行事实。

## life 直接处理

1. 提取事项、日期、时间、时区、地点、重复规则和有效期。缺少会改变结果的字段时只澄清一次；能从当前已认证消息明确得出时不要反复询问。
2. 日程使用带明确时区偏移的 ISO 时间。非默认日程不另行询问提醒时间，默认 `reminder_minutes=60`；事件仍保存真实发生时刻。
3. 使用稳定 `dedupe_key`。同一事项的修改先用 `get_day` 找到原记录，再按原 `event_id`、`task_id` 或其他记录 ID 修改，避免 remove/create 竞态。
4. 调用对应写操作。地点解析返回多个候选时停止写入，用自然中文请少主选定一个；不得猜地点。
5. 写入后调用 `get_day` 回读受影响日期。只有工具 `ok=true` 且回读内容一致，才说已经记好。
6. 回复时说清事项、发生时间、进入哪一天晨报、单独提醒时间和是否已生效。不要展示 JSON、工具名、路径、内部 ID 或调度字段。

查询晨报是否存在或运行时，只用 `morning_brief_control inspect`。若它显示停用，直接说明真实停用原因；不要提出再创建第二套晨报。

## housekeeper 正式转交

1. 将少主已认证会话中的原目标整理成最小 payload，不复制无关私聊。
2. 提供 `control_action`、`source_at`、合理的 `expires_at`、稳定 `dedupe_key` 和 payload；不要直接编辑 life 文件或同时创建提醒。
3. 调用 `morning_brief_handoff submit`。工具会保存转交并唤醒蕭觀音。
4. 仅在返回 `applied=true` 时告诉少主“蕭觀音已经录入”。返回 pending、applying 或 blocked 时如实说明尚未完成以及缺少什么；不要把“已转达”说成“已录入”。
5. 正式转交已携带少主原授权。范围未变化时，蕭觀音不得要求少主重复下令。

## 修改、取消与重复

- 相同 `dedupe_key` 只保留一份记录和一个提醒。
- 取消日程使用 `cancel_event`；取消后晨报不再显示，未发送提醒必须变为 cancelled。
- 已过期事项只作为历史证据，不重新创建未来提醒。
- 工具返回 unknown 或录入状态不明时先查询，不重做副作用。
- 发生错误时只说明用户能采取的下一步；工程错误、栈和内部字段留在日志。

## 示例

少主说：“8 月 12 日 9:15 技能考试。”

- 保存事件为 8 月 12 日 09:15。
- 默认单独提醒为 08:15。
- 回读确认它进入 8 月 12 日晨报。
- 自然回复：“少主，8 月 12 日 9:15 的技能考试已经记入当日晨间玉简，妾身也会在 8:15 单独提醒你。”

少主对賈南風说：“明天晨报提醒我带伞。”

- 賈南風提交 `upsert_note` 到 `weather`，日期为明天，内容为“出门把伞带好”。
- 等蕭觀音应用并回读后再回复：“少主，已经转给观音并记入明日天候提醒；明早会在晨间玉简里提醒你带伞。”
