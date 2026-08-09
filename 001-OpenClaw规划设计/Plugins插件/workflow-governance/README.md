# Workflow Governance

当前版本：1.0.2

面向 `housekeeper` 和 `ops` 的 OpenClaw 2026.7.1+ 治理插件。它把正式计划 SHA-256、三次独立完整审查、执行阶段、验收证据和唯一最终通知写入官方 Task Flow。

计划哈希变更会清空全部审查；少于三次或不是 `independent_complete` 的审查不能开启执行。验收、文档和同步结束后，flow 先进入 `notification_pending`；只有记录真实通知 message ID 才终结。

若受管 Flow 下存在子任务，任何子任务仍在运行、尚未终结或以失败终结，都会阻止进入最终通知；不能先把父项写成完成。

插件同时把 `ops` 的通用 `exec/process` 高风险请求在副作用前拦下，并返回自然中文的目标、最坏影响、回退和替代办法。它不调用 OpenClaw 原生审批卡；只有已有专用受控能力且少主已作一次明确决定时，才允许走该专用能力。未覆盖的高风险操作保持 blocked，不能偷退回通用 shell。低风险和中风险不弹用户询问；中风险的完整检查、备份、回滚和验证由 `workflow-execution` 技能及受控工具共同落实。
