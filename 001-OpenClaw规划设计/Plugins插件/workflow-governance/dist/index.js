import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
const HASH = /^[a-f0-9]{64}$/i;
const ParamsSchema = Type.Object({
    action: Type.Union([
        Type.Literal("create"), Type.Literal("list"), Type.Literal("inspect"),
        Type.Literal("set_plan"), Type.Literal("record_review"),
        Type.Literal("begin_execution"), Type.Literal("set_stage"),
        Type.Literal("ready_to_notify"), Type.Literal("acknowledge_notification"),
        Type.Literal("block")
    ]),
    flow_id: Type.Optional(Type.String({ minLength: 1 })),
    goal: Type.Optional(Type.String({ minLength: 1, maxLength: 4000 })),
    plan_hash: Type.Optional(Type.String({ pattern: "^[A-Fa-f0-9]{64}$" })),
    acceptance_criteria: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 1000 }), { minItems: 1, maxItems: 100 })),
    review_number: Type.Optional(Type.Integer({ minimum: 1, maximum: 3 })),
    review_scope: Type.Optional(Type.Literal("independent_complete")),
    review_evidence_hash: Type.Optional(Type.String({ pattern: "^[A-Fa-f0-9]{64}$" })),
    review_nonce: Type.Optional(Type.String({ minLength: 8, maxLength: 200 })),
    finding_count: Type.Optional(Type.Integer({ minimum: 0, maximum: 10000 })),
    stage: Type.Optional(Type.Union([
        Type.Literal("implementation"), Type.Literal("validation"),
        Type.Literal("documentation"), Type.Literal("sync")
    ])),
    acceptance_evidence: Type.Optional(Type.Array(Type.String({ pattern: "^[A-Fa-f0-9]{64}$" }), { minItems: 1, maxItems: 200 })),
    unfixable_items: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 2000 }), { maxItems: 100 })),
    notification_message_id: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    blocked_reason: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 }))
}, { additionalProperties: false });
function result(value) {
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], details: value };
}
function text(value, name) {
    if (typeof value !== "string" || !value.trim())
        throw new Error(`${name} is required`);
    return value.trim();
}
function stateOf(flow) {
    const state = flow?.stateJson;
    if (!state || state.schema !== "workflow-governance/v1" || !Array.isArray(state.reviews)) {
        throw new Error("flow is not governed by workflow-governance/v1");
    }
    return structuredClone(state);
}
function requireApplied(mutation) {
    if (!mutation?.applied)
        throw new Error(`Task Flow mutation failed: ${mutation?.code ?? "unknown"}`);
    return mutation.flow;
}
export function riskDecision(command) {
    const rules = [
        [/\b(rm\s+-rf|remove-item\b.*-recurse|mkfs|format\s+[a-z]:|dd\s+if=)\b/i, "删除或覆写重要资料", "最坏可能造成不可恢复的数据丢失", "先确认精确目标并保留可核验备份，失败时从备份恢复", "先改为只读核对，或把删除范围缩到一个可恢复的明确对象"],
        [/\b(reboot|shutdown|systemctl\s+(stop|restart)|openclaw\s+gateway\s+(stop|restart))\b/i, "停止或重启正在运行的服务", "会短暂中断 Telegram 与正在进行的任务", "先保留当前状态，如果启动失败就恢复原配置并重启原服务", "先完成无需重启的检查，等没有活动任务时再处理"],
        [/\b(funnel|public\s+exposure|0\.0\.0\.0\b|firewall.*allow)\b/i, "把服务开放到公共网络", "可能扩大未授权访问和攻击面", "保留原有内网路径，异常时立即关闭公开入口", "继续使用现有内网或已认证的私有通道"],
        [/\b(git\s+push\b.*--force|git\s+reset\s+--hard|chmod\s+777|disable.*auth|token|credential|password)\b/i, "改动认证、权限或不可回退的版本历史", "最坏可能导致访问边界失效或有效历史被覆盖", "先保留当前配置或引用，失败时恢复原值", "使用普通推送、最小权限或可回退的增量修改"],
    ];
    const match = rules.find(([pattern]) => pattern.test(command));
    if (!match)
        return undefined;
    return { goal: match[1], impact: match[2], rollback: match[3], alternative: match[4] };
}
export function highRiskBlockReason(command) {
    const decision = riskDecision(command);
    if (!decision)
        return undefined;
    return `这一步属于高风险操作，鱼玄机尚未执行。准备做的是${decision.goal}；${decision.impact}。回退办法：${decision.rollback}。较稳妥的替代办法：${decision.alternative}。请鱼玄机先用自然中文向少主说明这些内容，并只询问一次是否继续；在已有专用受控能力并取得这一次明确同意前，不得调用通用执行工具，也不得弹出原生审批卡。`;
}
export default definePluginEntry({
    id: "workflow-governance",
    name: "Workflow Governance",
    description: "Deterministic workflow and risk gates backed by official Task Flow.",
    register(api) {
        const cfg = (api.pluginConfig ?? {});
        const agents = new Set(Array.isArray(cfg.agents) ? cfg.agents.filter((v) => typeof v === "string") : ["housekeeper", "ops"]);
        const riskAgentId = typeof cfg.riskAgentId === "string" ? cfg.riskAgentId : "ops";
        api.on("before_tool_call", async (event, ctx) => {
            if (ctx.agentId !== riskAgentId || !["exec", "process"].includes(event.toolName))
                return;
            const command = [event.params.command, event.params.cmd, event.params.script].find((v) => typeof v === "string");
            const blockReason = command ? highRiskBlockReason(command) : undefined;
            if (!blockReason)
                return;
            // Never hand a Telegram user the native exec approval surface.  High-risk
            // work must be performed by an explicitly-scoped controlled tool after a
            // role-level decision; generic exec remains a fail-closed backstop.
            return { block: true, blockReason };
        });
        api.registerTool((ctx) => {
            if (!ctx.agentId || !agents.has(ctx.agentId) || !ctx.sessionKey)
                return null;
            const flows = api.runtime.tasks.flow.fromToolContext(ctx);
            return {
                name: "workflow_governance",
                label: "Workflow Governance",
                description: "Persist formal plan, three independent complete reviews, execution, acceptance, sync and final notification in official Task Flow.",
                parameters: ParamsSchema,
                async execute(_id, raw) {
                    const p = raw;
                    try {
                        if (p.action === "list")
                            return result({ ok: true, flows: flows.list() });
                        if (p.action === "create") {
                            const criteria = Array.isArray(p.acceptance_criteria) ? p.acceptance_criteria : [];
                            if (!criteria.length)
                                throw new Error("acceptance_criteria is required");
                            const created = flows.createManaged({
                                controllerId: "workflow-governance/v1", goal: text(p.goal, "goal"), status: "queued",
                                currentStep: "research", notifyPolicy: "silent",
                                stateJson: { schema: "workflow-governance/v1", acceptanceCriteria: criteria, reviews: [], stage: "research" }
                            });
                            return result({ ok: true, flow: created });
                        }
                        const flow = flows.get(text(p.flow_id, "flow_id"));
                        if (!flow)
                            throw new Error("Task Flow not found");
                        if (p.action === "inspect")
                            return result({ ok: true, flow, taskSummary: flows.getTaskSummary(flow.flowId) });
                        const state = stateOf(flow);
                        if (p.action === "set_plan") {
                            const hash = text(p.plan_hash, "plan_hash").toLowerCase();
                            if (!HASH.test(hash))
                                throw new Error("plan_hash must be SHA-256");
                            state.planHash = hash;
                            state.reviews = [];
                            state.stage = "review_1";
                            delete state.acceptanceEvidence;
                            delete state.notification;
                            const updated = requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: "review_1", stateJson: state }));
                            return result({ ok: true, reviewsReset: true, flow: updated });
                        }
                        if (p.action === "record_review") {
                            const planHash = text(p.plan_hash, "plan_hash").toLowerCase();
                            if (!state.planHash || planHash !== state.planHash)
                                throw new Error("review plan hash does not match the current plan");
                            if (p.review_scope !== "independent_complete")
                                throw new Error("each review must be independent_complete");
                            if (p.finding_count !== 0)
                                return result({ ok: false, planRevisionRequired: true, reviewsInvalidatedOnPlanChange: true });
                            const number = Number(p.review_number);
                            if (![1, 2, 3].includes(number))
                                throw new Error("review_number must be 1, 2 or 3");
                            if (state.reviews.some((r) => r.reviewNumber === number))
                                throw new Error("this review number is already recorded");
                            const evidenceHash = text(p.review_evidence_hash, "review_evidence_hash").toLowerCase();
                            if (!HASH.test(evidenceHash))
                                throw new Error("review evidence must be SHA-256");
                            const nonce = text(p.review_nonce, "review_nonce");
                            if (state.reviews.some((r) => r.evidenceHash === evidenceHash || r.reviewNonce === nonce))
                                throw new Error("each full review needs independent evidence and nonce");
                            state.reviews.push({ reviewNumber: number, scope: "independent_complete", planHash, evidenceHash, reviewNonce: nonce, reviewedAt: new Date().toISOString() });
                            state.reviews.sort((a, b) => a.reviewNumber - b.reviewNumber);
                            state.stage = state.reviews.length === 3 ? "review_complete" : `review_${state.reviews.length + 1}`;
                            const updated = requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: state.stage, stateJson: state }));
                            return result({ ok: true, flow: updated });
                        }
                        if (p.action === "begin_execution") {
                            if (!state.planHash || state.reviews.length !== 3 || state.reviews.some((r, i) => r.planHash !== state.planHash || r.reviewNumber !== i + 1))
                                throw new Error("execution requires three independent complete reviews of the current plan");
                            state.stage = "implementation";
                            return result({ ok: true, flow: requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: "implementation", stateJson: state })) });
                        }
                        if (p.action === "set_stage") {
                            const next = text(p.stage, "stage");
                            const allowed = { implementation: "validation", validation: "documentation", documentation: "sync" };
                            if (allowed[state.stage] !== next)
                                throw new Error(`invalid stage transition from ${state.stage} to ${next}`);
                            state.stage = next;
                            return result({ ok: true, flow: requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: next, stateJson: state })) });
                        }
                        if (p.action === "ready_to_notify") {
                            if (state.stage !== "sync")
                                throw new Error("documentation and sync must finish before notification");
                            const summary = flows.getTaskSummary(flow.flowId);
                            const total = Number(summary?.total ?? 0);
                            const active = Number(summary?.active ?? 0);
                            const terminal = Number(summary?.terminal ?? 0);
                            const failures = Number(summary?.failures ?? 0);
                            if (active > 0 || failures > 0 || terminal < total) {
                                throw new Error("all child tasks must reach successful terminal state before final notification");
                            }
                            const evidence = Array.isArray(p.acceptance_evidence) ? p.acceptance_evidence : [];
                            if (evidence.length < state.acceptanceCriteria.length || evidence.some((v) => !HASH.test(v)))
                                throw new Error("acceptance evidence is incomplete");
                            state.acceptanceEvidence = evidence;
                            state.unfixableItems = Array.isArray(p.unfixable_items) ? p.unfixable_items : [];
                            const eventKey = `workflow:${flow.flowId}:${state.planHash}:completion`;
                            state.notification = { eventKey };
                            state.stage = "notification_pending";
                            const updated = requireApplied(flows.setWaiting({ flowId: flow.flowId, expectedRevision: flow.revision, currentStep: "notification_pending", stateJson: state, waitJson: { kind: "owner_notification", eventKey } }));
                            return result({ ok: true, eventKey, flow: updated });
                        }
                        if (p.action === "acknowledge_notification") {
                            if (state.stage !== "notification_pending" || !state.notification)
                                throw new Error("no final notification is pending");
                            state.notification.messageId = text(p.notification_message_id, "notification_message_id");
                            state.notification.acknowledgedAt = new Date().toISOString();
                            state.stage = "completed";
                            return result({ ok: true, flow: requireApplied(flows.finish({ flowId: flow.flowId, expectedRevision: flow.revision, stateJson: state })) });
                        }
                        if (p.action === "block") {
                            const reason = text(p.blocked_reason, "blocked_reason");
                            state.stage = "blocked";
                            return result({ ok: true, flow: requireApplied(flows.setWaiting({ flowId: flow.flowId, expectedRevision: flow.revision, currentStep: "blocked", blockedSummary: reason, stateJson: state, waitJson: { kind: "blocked", reason } })) });
                        }
                        throw new Error(`unknown action: ${String(p.action)}`);
                    }
                    catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        api.logger.warn(`workflow_governance rejected: ${message}`);
                        return result({ ok: false, error: message });
                    }
                }
            };
        }, { name: "workflow_governance", optional: true });
    }
});
