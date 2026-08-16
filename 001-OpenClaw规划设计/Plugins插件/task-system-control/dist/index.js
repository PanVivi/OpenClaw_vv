import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
const AGENT_IDS = ["housekeeper", "ops", "coder", "reviewer", "life", "companion-dugu", "companion-wu", "companion-lv"];
const PROFILE_VALUES = ["conversation", "direct_module", "simple_task", "governed_change", "research_plan_triple_review"];
const MODULE_VALUES = ["header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"];
const RECEIPT_TOOLS = ["task_work_proof", "task_work_complete"];
const LEGACY_PLACEHOLDER_FINGERPRINT = "03b43bfb126dec5c1d7642383a9d9fa3c86dd6f06ab0ee9e81883b34f3d6a4bc";
const LEGACY_PLACEHOLDER_SHAPE = {
    unitKey: "***",
    title: "执行并验证角色任务",
    objective: "继承原任务包上下文,闭环完成范围确认、核心实施、结果验证和验收证据整理。",
    completionCriteria: [
        "完整确认原任务包的目标、范围、输入、约束和验收条件",
        "完成原任务包要求的全部变更或操作,且关键步骤可追溯",
        "执行覆盖全部验收条件的检查或测试并处理发现的问题",
        "汇总产出物、验证证据、无法修复项和剩余风险,形成可供上游复核的交付摘要"
    ]
};
const CONTROL_TOOLS = new Set(["task_intake", "task_delegate", "task_handoff", "task_module", "task_work_proof", "task_work_complete", "workflow_governance"]);
const CONCRETE_TOOLS = new Set([
    "sessions_list", "sessions_history", "sessions_send", "sessions_spawn",
    "exec", "process", "write", "edit", "apply_patch", "gateway", "message", "morning_brief_control", "life_automation", "life_files",
    "workboard_heartbeat", "workboard_proof", "workboard_complete", "workboard_block"
]);
const MODULE_LABELS = {
    header: "抬头与晨辞", weather: "天候司", aqi: "清气监", attire: "衣行令", tasks: "今日要事",
    disciples: "门下近况", schedule: "今日玉牒", folk_calendar: "今日小签"
};
const DEFAULT_CAPABILITIES = {
    "ops.inspect": { owners: ["ops"], requiredTools: ["read"], readOnly: true, sideEffect: false },
    "ops.change": { owners: ["ops"], requiredTools: ["ops_controlled_exec"], readOnly: false, sideEffect: true },
    "coder.implement": { owners: ["coder"], requiredTools: ["read", "write"], readOnly: false, sideEffect: true },
    "reviewer.verify": { owners: ["reviewer"], requiredTools: ["read"], readOnly: true, sideEffect: false },
    "life.module": { owners: ["life"], requiredTools: ["morning_brief_control"], readOnly: false, sideEffect: true },
    "life.research": { owners: ["life"], requiredTools: ["web_search"], readOnly: true, sideEffect: false },
    "housekeeper.summarize": { owners: ["housekeeper"], requiredTools: [], readOnly: true, sideEffect: false },
    "companion.create": { owners: ["companion-dugu", "companion-wu", "companion-lv"], requiredTools: [], readOnly: true, sideEffect: false }
};
const PacketSchema = Type.Object({
    packet_key: Type.String({ minLength: 1, maxLength: 100 }),
    target_agent: Type.String({ minLength: 1, maxLength: 80 }),
    title: Type.String({ minLength: 1, maxLength: 240 }),
    objective: Type.String({ minLength: 1, maxLength: 4000 }),
    completion_criteria: Type.Array(Type.String({ minLength: 1, maxLength: 1000 }), { minItems: 1, maxItems: 50 }),
    capability: Type.String({ minLength: 1, maxLength: 160 }),
    depends_on: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 100 }), { maxItems: 50 }))
}, { additionalProperties: false });
const UnitSchema = Type.Object({
    unit_key: Type.String({ minLength: 1, maxLength: 100 }),
    title: Type.String({ minLength: 1, maxLength: 240 }),
    objective: Type.String({ minLength: 1, maxLength: 4000 }),
    completion_criteria: Type.Array(Type.String({ minLength: 1, maxLength: 1000 }), { minItems: 1, maxItems: 50 }),
    capability: Type.String({ minLength: 1, maxLength: 160 }),
    depends_on: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 100 }), { maxItems: 50 }))
}, { additionalProperties: false });
const DelegateSchema = Type.Object({
    action: Type.Union(["plan", "decompose_packet", "inspect", "reconcile", "block", "cancel"].map((value) => Type.Literal(value))),
    inbox_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    plan_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    packet_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    handoff_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 240 })),
    goal: Type.Optional(Type.String({ minLength: 1, maxLength: 4000 })),
    packets: Type.Optional(Type.Array(PacketSchema, { minItems: 1, maxItems: 32 })),
    work_units: Type.Optional(Type.Array(UnitSchema, { minItems: 1, maxItems: 64 })),
    reason: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 }))
}, { additionalProperties: false });
const IntakeSchema = Type.Object({
    action: Type.Union(["triage", "start", "inspect", "list", "reconcile", "queue_notification", "block"].map((value) => Type.Literal(value))),
    inbox_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    profile: Type.Optional(Type.Union(PROFILE_VALUES.map((value) => Type.Literal(value)))),
    goal: Type.Optional(Type.String({ minLength: 1, maxLength: 4000 })),
    reason: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
    content_hash: Type.Optional(Type.String({ pattern: "^[A-Fa-f0-9]{64}$" })),
    event_key: Type.Optional(Type.String({ minLength: 1, maxLength: 240 }))
}, { additionalProperties: false });
const HandoffSchema = Type.Object({
    action: Type.Union(["submit", "status", "cancel"].map((value) => Type.Literal(value))),
    handoff_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    capability: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
    payload: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
}, { additionalProperties: false });
const ModuleSchema = Type.Object({
    action: Type.Union(["catalog", "expect", "inspect"].map((value) => Type.Literal(value))),
    inbox_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    module: Type.Optional(Type.Union(MODULE_VALUES.map((value) => Type.Literal(value)))),
    control_action: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
}, { additionalProperties: false });
const WorkReceiptSchema = Type.Object({
    work_unit_id: Type.String({ minLength: 1, maxLength: 100 }),
    generation: Type.Integer({ minimum: 1 }),
    launch_nonce: Type.String({ minLength: 16, maxLength: 100 }),
    summary: Type.String({ minLength: 1, maxLength: 4000 })
}, { additionalProperties: false });
function sha256(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }
function legacyPlaceholderFingerprint(unit) {
    return sha256(JSON.stringify({ unitKey: unit.unitKey, title: unit.title, objective: unit.objective, completionCriteria: unit.completionCriteria }));
}
function isLegacyPlaceholder(unit) {
    return legacyPlaceholderFingerprint(unit) === LEGACY_PLACEHOLDER_FINGERPRINT
        && JSON.stringify({ unitKey: unit.unitKey, title: unit.title, objective: unit.objective, completionCriteria: unit.completionCriteria }) === JSON.stringify(LEGACY_PLACEHOLDER_SHAPE);
}
function nowIso() { return new Date().toISOString(); }
function text(value, field, max = 4000) {
    if (typeof value !== "string" || !value.trim())
        throw new Error(`${field} is required`);
    const normalized = value.normalize("NFKC").trim();
    if (normalized.length > max || /[\u0000-\u001f\u007f]/u.test(normalized))
        throw new Error(`${field} is invalid`);
    return normalized;
}
function strings(value, field) {
    if (!Array.isArray(value) || !value.length)
        throw new Error(`${field} is required`);
    return value.map((item) => text(item, field, 1000));
}
function record(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function detailsOf(value) { const r = record(value); return record(r.details ?? r); }
function toolResult(value) {
    const body = { ...value, replyGuidance: "只用角色口吻说清结果、影响和下一步；不得展示 inbox、packet、work unit、Card、Task、Host、CWD、UUID、session、run、flow、heartbeat 等内部字段。" };
    return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }], details: body };
}
export function classifyWorkflow(prompt) {
    const value = prompt.normalize("NFKC");
    const moduleSubject = /(晨报|晨间玉简|日程|行程|提醒|天气|空气质量|AQI|穿衣|防晒|带伞|待办|要事|门下近况|小签|农历|节气)/iu.test(value);
    const mutation = /(记(?:下|录)|录入|添加|新增|改(?:成|为|一下)?|修改|取消|删除|设置|以后|安排|提醒我|放进|写入|转告)/u.test(value);
    if (moduleSubject && mutation)
        return "direct_module";
    if (/(查询.*官方|官方说明|GitHub.*讨论|社群.*讨论|三次.*审查|完整.*收集|正式修复计划|修复整个|部署.*验收.*文档|全部结束.*通知)/isu.test(value))
        return "research_plan_triple_review";
    if (/(生产|部署|配置|插件|权限|工作流|任务系统|修复|迁移|同步|重启|故障|回滚|验收)/u.test(value) && /(检查|核对|修复|实现|修改|部署|迁移|同步|解决|打通)/u.test(value))
        return "governed_change";
    if (/(请|帮我|查查|调查|检查|核对|搜索|读取|整理|列出|完成|通知|给出方案|处理|录入)/u.test(value))
        return "simple_task";
    return "conversation";
}
export function inferModules(toolName, params, result) {
    if (toolName !== "morning_brief_control")
        return [];
    if (typeof params.module === "string" && MODULE_VALUES.includes(params.module))
        return [params.module];
    const action = typeof params.action === "string" ? params.action : "";
    if (["upsert_event", "cancel_event"].includes(action))
        return ["schedule"];
    if (["upsert_task", "set_task_status", "archive_task"].includes(action))
        return ["tasks"];
    if (["set_location", "clear_location"].includes(action))
        return ["weather", "aqi", "attire"];
    const sections = Array.isArray(detailsOf(result).sections) ? detailsOf(result).sections : [];
    return MODULE_VALUES.filter((module) => sections.includes(MODULE_LABELS[module]));
}
function emptyState() {
    return { schema: "hehuan.task-system-control", schemaVersion: 3, revision: 0, updatedAt: new Date(0).toISOString(), inbox: [], plans: [], packets: [], workUnits: [], links: [], handoffs: [], outbox: [] };
}
export function migrateState(value) {
    const raw = record(value);
    if (raw.schema !== "hehuan.task-system-control")
        throw new Error("task-system state schema is invalid");
    const base = emptyState();
    const inbox = Array.isArray(raw.inbox) ? raw.inbox.map((item) => {
        const r = record(item);
        return { ...r, prompt: typeof r.prompt === "string" ? r.prompt : "", planIds: Array.isArray(r.planIds) ? r.planIds : [], cardIds: Array.isArray(r.cardIds) ? r.cardIds : [], expectedModules: Array.isArray(r.expectedModules) ? r.expectedModules : [] };
    }) : [];
    const outbox = Array.isArray(raw.outbox) ? raw.outbox.map((item) => {
        const existing = record(item);
        if (existing.kind === "ordinary_agent" || existing.kind === "completion_direct")
            return existing;
        const eventKey = typeof existing.eventKey === "string" ? existing.eventKey : "";
        if (eventKey.startsWith("task-plan-completion:")) {
            return { ...existing, kind: "ordinary_agent", status: "quarantined", error: sanitizeLegacyError(existing.error, "旧消息记录占用了完成通知命名空间，已隔离") };
        }
        return { ...existing, kind: "ordinary_agent" };
    }) : [];
    const plans = Array.isArray(raw.plans) ? raw.plans.map((item) => {
        const existing = record(item);
        const plan = { ...existing, delegationMode: existing.delegationMode };
        if (plan.completionWakeAt && !plan.completionNotificationStatus) {
            const direct = outbox.find((candidate) => candidate.kind === "completion_direct" && candidate.eventKey === `task-plan-completion:${plan.id}` && candidate.status === "sent" && candidate.messageId);
            if (direct)
                plan.completionNotificationStatus = "sent";
            else {
                plan.legacyCompletionWakeAt = plan.completionWakeAt;
                delete plan.completionWakeAt;
                plan.completionNotificationStatus = "unknown";
                plan.completionNotificationError = "旧完成标记不能证明 Telegram 已发送，已隔离且不会自动补发";
            }
        }
        return plan;
    }) : [];
    return {
        ...base,
        revision: Number.isInteger(raw.revision) ? Number(raw.revision) : 0,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
        inbox,
        plans,
        packets: Array.isArray(raw.packets) ? raw.packets.map((item) => ({ ...record(item), inputRefs: Array.isArray(record(item).inputRefs) ? record(item).inputRefs : [], workUnitIds: Array.isArray(record(item).workUnitIds) ? record(item).workUnitIds : [] })) : [],
        workUnits: Array.isArray(raw.workUnits) ? raw.workUnits.map((item) => ({ ...record(item), inputRefs: Array.isArray(record(item).inputRefs) ? record(item).inputRefs : [] })) : [],
        links: Array.isArray(raw.links) ? raw.links.map((item) => ({ ...record(item), dispatchKind: record(item).dispatchKind ?? (record(item).cardId ? "workboard_legacy" : undefined) })) : [],
        handoffs: Array.isArray(raw.handoffs) ? raw.handoffs : [],
        outbox
    };
}
function sanitizeLegacyError(value, fallback) {
    const current = typeof value === "string" ? value.trim() : "";
    return current ? `${current}; ${fallback}`.slice(0, 1000) : fallback;
}
async function readStateFile(path) {
    try {
        const info = await stat(path);
        if (!info.isFile() || info.size > 16 * 1024 * 1024)
            throw new Error("task-system state target is invalid");
        return migrateState(JSON.parse(await readFile(path, "utf8")));
    }
    catch (error) {
        if (error.code === "ENOENT")
            return emptyState();
        throw error;
    }
}
async function atomicWrite(path, state) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
}
function providerOf(ctx) {
    const direct = [ctx.messageProvider, ctx.channel].find((item) => typeof item === "string" && ["telegram", "discord", "slack", "whatsapp", "signal", "imessage"].includes(item.toLowerCase()));
    return typeof direct === "string" ? direct.toLowerCase() : "";
}
function sessionKind(sessionKey, controllers) {
    if ([...controllers.values()].includes(sessionKey))
        return "controller";
    if (/:subagent:(?:workboard-|task-system-)/u.test(sessionKey))
        return "worker";
    if (/:cron:|:automation:/u.test(sessionKey))
        return "automation";
    return "main";
}
function assertAcyclic(keys, dependencyMap, label) {
    const allowed = new Set(keys);
    const visiting = new Set();
    const visited = new Set();
    const visit = (key) => {
        if (visiting.has(key))
            throw new Error(`${label} dependency graph contains a cycle`);
        if (visited.has(key))
            return;
        visiting.add(key);
        for (const dep of dependencyMap.get(key) ?? []) {
            if (!allowed.has(dep))
                throw new Error(`${label} dependency references an unknown key`);
            if (dep === key)
                throw new Error(`${label} cannot depend on itself`);
            visit(dep);
        }
        visiting.delete(key);
        visited.add(key);
    };
    for (const key of keys)
        visit(key);
}
function publicPlan(state, plan) {
    const links = state.links.filter((item) => item.planId === plan.id);
    const execution = links.some((item) => item.status === "reconcile_required") ? "reconcile_required"
        : links.some((item) => item.status === "running") ? "running"
            : links.some((item) => item.status === "starting") ? "starting"
                : links.length && links.every((item) => item.status === "succeeded") ? "succeeded" : "not_started";
    return {
        status: plan.status,
        execution,
        statusText: execution === "running" ? "已经开始执行" : execution === "starting" ? "已发起，正在核对启动回执" : execution === "reconcile_required" ? "启动结果未知，正在核对且不会自动重跑" : execution === "succeeded" ? "已经完成" : "已登记，尚未启动",
        title: plan.title,
        branches: plan.packetIds.map((id) => {
            const packet = state.packets.find((item) => item.id === id);
            return packet ? { role: packet.targetAgentId, title: packet.title, status: packet.status, workItems: packet.workUnitIds.length } : undefined;
        }).filter(Boolean)
    };
}
export default definePluginEntry({
    id: "task-system-control",
    name: "Task System Control",
    description: "Durable owner intake with direct, receipt-gated role workers and truthful lifecycle state.",
    register(api) {
        const cfg = record(api.pluginConfig);
        const statePathRaw = typeof cfg.statePath === "string" && cfg.statePath.trim() ? cfg.statePath.trim() : join(process.env.HOME ?? process.cwd(), ".openclaw", "task-system-control", "state.json");
        const statePath = isAbsolute(statePathRaw) ? statePathRaw : resolve(statePathRaw);
        const ownerTelegramId = typeof cfg.ownerTelegramId === "string" ? cfg.ownerTelegramId.trim() : "";
        const leaseMs = Number.isInteger(cfg.controllerLeaseMs) ? Number(cfg.controllerLeaseMs) : 10 * 60_000;
        const accountConfig = record(cfg.agents);
        const accountByAgent = new Map(AGENT_IDS.map((agentId) => [agentId, typeof accountConfig[agentId] === "string" ? String(accountConfig[agentId]) : agentId === "ops" ? "default" : agentId]));
        const controllerConfig = record(cfg.controllerSessions);
        const controllers = new Map(AGENT_IDS.map((agentId) => [agentId, typeof controllerConfig[agentId] === "string" ? String(controllerConfig[agentId]) : `agent:${agentId}:task-controller`]));
        const capabilityConfig = record(cfg.capabilities);
        const capabilities = new Map(Object.entries(DEFAULT_CAPABILITIES));
        for (const [name, rawRule] of Object.entries(capabilityConfig)) {
            const rule = record(rawRule);
            capabilities.set(name, {
                owners: Array.isArray(rule.owners) ? rule.owners.map(String) : [],
                requiredTools: Array.isArray(rule.requiredTools) ? rule.requiredTools.map(String) : [],
                readOnly: rule.readOnly === true,
                sideEffect: rule.sideEffect === true
            });
        }
        const turnInbox = new Map();
        const associations = [];
        let mutationQueue = Promise.resolve();
        const withState = async (mutate) => {
            const operation = mutationQueue.then(async () => {
                const state = await readStateFile(statePath);
                const output = await mutate(state);
                state.revision += 1;
                state.updatedAt = nowIso();
                state.inbox = state.inbox.slice(-5000);
                state.plans = state.plans.slice(-5000);
                state.packets = state.packets.slice(-10000);
                state.workUnits = state.workUnits.slice(-20000);
                state.links = state.links.slice(-20000);
                state.handoffs = state.handoffs.slice(-5000);
                state.outbox = state.outbox.slice(-5000);
                await atomicWrite(statePath, state);
                return output;
            });
            mutationQueue = operation.then(() => undefined, () => undefined);
            return operation;
        };
        const readState = async () => { await mutationQueue; return readStateFile(statePath); };
        const terminal = (status) => ["succeeded", "completed", "failed", "blocked", "cancelled"].includes(status);
        const sanitizeSummary = (value, max = 1000) => String(value).normalize("NFKC").replace(/(token|secret|password|authorization)\s*[:=]\s*\S+/giu, "$1=[redacted]").replace(/[\u0000-\u001f\u007f]/gu, " ").trim().slice(0, max);
        const safeError = (error) => sanitizeSummary(error instanceof Error ? error.message : error, 1000);
        const receiptToolsAllowed = (agentId) => {
            const runtime = record(api.runtime.config.current());
            const agents = record(runtime.agents);
            const list = Array.isArray(agents.list) ? agents.list.map(record) : [];
            const agent = list.find((item) => item.id === agentId);
            const tools = record(agent?.tools);
            const allow = new Set(Array.isArray(tools.allow) ? tools.allow.map(String) : []);
            return RECEIPT_TOOLS.every((name) => allow.has(name));
        };
        const turnKey = (ctx, event) => {
            const runId = typeof event?.runId === "string" && event.runId ? event.runId : typeof ctx.runId === "string" ? ctx.runId : "";
            return runId ? `run:${runId}` : typeof ctx.sessionKey === "string" ? `session:${ctx.sessionKey}` : "";
        };
        const currentInbox = (state, sessionKey, id) => {
            const selected = typeof id === "string" && id ? state.inbox.find((item) => item.id === id) : undefined;
            const found = selected ?? [...state.inbox].reverse().find((item) => item.sessionKey === sessionKey && !["completed", "cancelled"].includes(item.status));
            if (!found)
                throw new Error("本轮任务尚未登记，请稍后重试");
            return found;
        };
        const capabilityRule = (name, owner) => {
            const rule = capabilities.get(name);
            if (!rule || !rule.owners.includes(owner))
                throw new Error(`目标角色不具备声明能力 ${name}，请重新分工`);
            return rule;
        };
        const sendPlanCompletion = async (planId, allowPreflightRetry = false) => {
            const snapshot = await readState();
            const plan = snapshot.plans.find((item) => item.id === planId);
            if (!plan || !terminal(plan.status) || plan.completionNotificationStatus === "sent" || ["acquired", "unknown", "quarantined"].includes(plan.completionNotificationStatus ?? ""))
                return;
            const inbox = snapshot.inbox.find((item) => item.id === plan.inboxId);
            const eventKey = `task-plan-completion:${plan.id}`;
            const accountId = accountByAgent.get("housekeeper") ?? "";
            const target = inbox?.senderId?.trim() ?? "";
            let adapter;
            let preflightError = "";
            try {
                adapter = await api.runtime.channel.outbound.loadAdapter("telegram");
                if (!adapter?.sendText)
                    throw new Error("Telegram 发送通道尚未就绪");
                if (!inbox || !ownerTelegramId || target !== ownerTelegramId)
                    throw new Error("Telegram 收件人身份核对失败");
                if (!accountId)
                    throw new Error("贾南风 Telegram 账号尚未配置");
            }
            catch (error) {
                preflightError = safeError(error);
                await withState((state) => {
                    const current = state.plans.find((item) => item.id === planId);
                    if (!current || !terminal(current.status))
                        return;
                    const existing = state.outbox.find((item) => item.eventKey === eventKey);
                    if (!existing)
                        state.outbox.push({
                            id: `outbox-${randomUUID()}`, eventKey, kind: "completion_direct", planId, sessionKey: current.sourceSessionKey,
                            contentHash: "", status: "failed_before_dispatch", generation: 0, accountId, target,
                            error: preflightError, createdAt: nowIso(), updatedAt: nowIso()
                        });
                    else if (existing.kind === "completion_direct" && existing.status === "failed_before_dispatch") {
                        existing.error = preflightError;
                        existing.updatedAt = nowIso();
                    }
                    current.completionNotificationStatus = "failed_before_dispatch";
                    current.completionNotificationError = preflightError;
                    current.updatedAt = nowIso();
                });
                return;
            }
            const reason = plan.error ?? snapshot.packets.find((item) => item.planId === planId && item.error)?.error;
            const body = plan.status === "succeeded"
                ? `少主，妾身来回话。“${sanitizeSummary(plan.title, 180)}”已经办妥，验收结果也已留档。`
                : `少主，妾身来回话。“${sanitizeSummary(plan.title, 180)}”这次已经停下。${reason ? `缘由是：${sanitizeSummary(reason, 500)}。` : "具体缘由已经留档。"}后续查修时可循此追溯。`;
            const contentHash = sha256(body);
            const claim = await withState((state) => {
                const current = state.plans.find((item) => item.id === planId);
                if (!current || !terminal(current.status))
                    return undefined;
                const existing = state.outbox.find((item) => item.eventKey === eventKey);
                if (existing && (existing.kind !== "completion_direct" || existing.planId !== planId))
                    return undefined;
                if (existing && !(allowPreflightRetry && existing.status === "failed_before_dispatch"))
                    return undefined;
                const attemptId = randomUUID();
                const generation = existing ? (existing.generation ?? 0) + 1 : 1;
                const timestamp = nowIso();
                const item = existing ?? {
                    id: `outbox-${randomUUID()}`, eventKey, kind: "completion_direct", planId, sessionKey: current.sourceSessionKey,
                    contentHash, status: "acquired", createdAt: timestamp, updatedAt: timestamp
                };
                Object.assign(item, { attemptId, generation, contentHash, status: "acquired", accountId, target, messageId: undefined, error: undefined, updatedAt: timestamp });
                if (!existing)
                    state.outbox.push(item);
                current.completionNotificationStatus = "acquired";
                current.completionNotificationError = undefined;
                current.updatedAt = timestamp;
                return { attemptId, generation, body };
            });
            if (!claim || !adapter?.sendText)
                return;
            try {
                const delivered = await adapter.sendText({ cfg: api.runtime.config.current(), to: target, text: claim.body, accountId, deliveryQueueId: eventKey });
                const messageId = typeof delivered?.messageId === "string" && delivered.messageId.trim() ? delivered.messageId.trim() : "";
                await withState((state) => {
                    const item = state.outbox.find((candidate) => candidate.eventKey === eventKey && candidate.kind === "completion_direct" && candidate.attemptId === claim.attemptId && candidate.generation === claim.generation && candidate.status === "acquired");
                    const current = state.plans.find((candidate) => candidate.id === planId);
                    if (!item || !current)
                        return;
                    item.status = messageId ? "sent" : "unknown";
                    item.messageId = messageId || undefined;
                    item.error = messageId ? undefined : "Telegram 返回时没有可核对的 messageId，禁止自动重发";
                    item.updatedAt = nowIso();
                    current.completionNotificationStatus = item.status;
                    current.completionNotificationError = item.error;
                    if (messageId)
                        current.completionWakeAt = nowIso();
                    current.updatedAt = nowIso();
                });
            }
            catch (error) {
                await withState((state) => {
                    const item = state.outbox.find((candidate) => candidate.eventKey === eventKey && candidate.kind === "completion_direct" && candidate.attemptId === claim.attemptId && candidate.generation === claim.generation && candidate.status === "acquired");
                    const current = state.plans.find((candidate) => candidate.id === planId);
                    if (!item || !current)
                        return;
                    item.status = "unknown";
                    item.error = safeError(error);
                    item.updatedAt = nowIso();
                    current.completionNotificationStatus = "unknown";
                    current.completionNotificationError = item.error;
                    current.updatedAt = nowIso();
                });
            }
        };
        const refreshParents = async (planId) => {
            const terminalNow = await withState((state) => {
                const plan = state.plans.find((item) => item.id === planId);
                if (!plan || terminal(plan.status))
                    return Boolean(plan && terminal(plan.status));
                for (const packet of state.packets.filter((item) => item.planId === planId && item.workUnitIds.length)) {
                    if (terminal(packet.status))
                        continue;
                    const units = packet.workUnitIds.map((id) => state.workUnits.find((item) => item.id === id)).filter((item) => Boolean(item));
                    if (units.some((unit) => ["failed", "blocked", "cancelled"].includes(unit.status)))
                        packet.status = "blocked";
                    else if (units.length && units.every((unit) => unit.status === "succeeded"))
                        packet.status = "succeeded";
                    else if (units.some((unit) => unit.status === "reconcile_required"))
                        packet.status = "reconcile_required";
                    else if (units.some((unit) => unit.status === "running"))
                        packet.status = "running";
                    else
                        packet.status = "pending";
                    packet.updatedAt = nowIso();
                }
                const packets = plan.packetIds.map((id) => state.packets.find((item) => item.id === id)).filter((item) => Boolean(item));
                if (packets.some((packet) => packet.status === "blocked"))
                    plan.status = "blocked";
                else if (packets.length && packets.every((packet) => packet.status === "succeeded"))
                    plan.status = "succeeded";
                else if (packets.some((packet) => packet.status === "running"))
                    plan.status = "running";
                else
                    plan.status = "planned";
                const inbox = state.inbox.find((item) => item.id === plan.inboxId);
                if (inbox)
                    inbox.status = plan.status === "succeeded" ? "completed" : plan.status === "blocked" ? "blocked" : packets.some((packet) => packet.status === "reconcile_required") ? "reconcile_required" : plan.status === "running" ? "running" : "delegating";
                plan.updatedAt = nowIso();
                return terminal(plan.status);
            });
            if (terminalNow)
                await sendPlanCompletion(planId);
        };
        const applyObservedEnd = (state, link, outcome, error) => {
            const unit = state.workUnits.find((item) => item.id === link.workUnitId);
            link.workerOutcome = outcome;
            link.updatedAt = nowIso();
            if (outcome === "ok" && link.proofReceipt && link.completionReceipt) {
                link.status = "succeeded";
                if (unit && !terminal(unit.status)) {
                    unit.status = "succeeded";
                    unit.resultRef = link.completionReceipt;
                    unit.updatedAt = nowIso();
                }
            }
            else if (outcome === "ok") {
                link.status = "reconcile_required";
                link.error = "执行已结束，正在核对最后收据";
                if (unit && !terminal(unit.status)) {
                    unit.status = "reconcile_required";
                    unit.error = link.error;
                    unit.updatedAt = nowIso();
                }
            }
            else {
                link.status = "failed";
                link.error = safeError(error ?? `worker ended as ${outcome || "unknown"}`);
                if (unit && !terminal(unit.status)) {
                    unit.status = "failed";
                    unit.error = link.error;
                    unit.updatedAt = nowIso();
                }
            }
        };
        const materializePacket = async (packetId) => withState((state) => {
            const packet = state.packets.find((item) => item.id === packetId);
            if (!packet || terminal(packet.status) || packet.workUnitIds.length)
                return packet?.workUnitIds[0];
            const unitId = `unit-${randomUUID()}`;
            state.workUnits.push({ id: unitId, planId: packet.planId, packetId: packet.id, unitKey: "execute", agentId: packet.targetAgentId, title: packet.title, objective: packet.objective, completionCriteria: packet.completionCriteria, capability: packet.capability, dependsOn: [], inputRefs: packet.inputRefs, delegationMode: "direct_subagent_v3", idempotencyKey: `task-unit:${packet.planId}:${packet.packetKey}:execute`, status: "ready", createdAt: nowIso(), updatedAt: nowIso() });
            packet.workUnitIds.push(unitId);
            packet.delegationMode = "direct_subagent_v3";
            packet.status = "pending";
            packet.decompositionReceipt = sha256(JSON.stringify({ packetId: packet.id, unitId, mode: "direct_subagent_v3" }));
            packet.updatedAt = nowIso();
            return unitId;
        });
        const startDirectUnit = async (unitId) => {
            const unitSnapshot = (await readState()).workUnits.find((item) => item.id === unitId);
            if (!unitSnapshot || unitSnapshot.status !== "ready")
                return false;
            if (!receiptToolsAllowed(unitSnapshot.agentId)) {
                await withState((state) => {
                    const unit = state.workUnits.find((item) => item.id === unitId);
                    if (unit && !terminal(unit.status)) {
                        unit.status = "failed";
                        unit.error = "目标角色缺少任务收据工具，未启动执行";
                        unit.updatedAt = nowIso();
                    }
                });
                await refreshParents(unitSnapshot.planId);
                throw new Error("目标角色缺少任务收据工具，任务未启动");
            }
            const claim = await withState((state) => {
                const unit = state.workUnits.find((item) => item.id === unitId);
                if (!unit || unit.status !== "ready" || state.links.some((item) => item.workUnitId === unitId))
                    return undefined;
                const plan = state.plans.find((item) => item.id === unit.planId);
                const nonce = randomUUID();
                const sessionKey = `agent:${unit.agentId}:subagent:task-system-${unit.id.replace(/[^a-zA-Z0-9_-]/gu, "-")}-${nonce}`;
                const link = { id: `link-${randomUUID()}`, inboxId: plan.inboxId, planId: unit.planId, packetId: unit.packetId, workUnitId: unit.id, assignee: unit.agentId, dispatchKind: "subagent_direct", generation: 1, launchNonce: nonce, idempotencyKey: `${unit.idempotencyKey}:1`, childSessionKey: sessionKey, status: "starting", createdAt: nowIso(), updatedAt: nowIso() };
                state.links.push(link);
                unit.status = "starting";
                unit.delegationMode = "direct_subagent_v3";
                unit.updatedAt = nowIso();
                return { link: structuredClone(link), unit: structuredClone(unit) };
            });
            if (!claim)
                return false;
            const prompt = `[任务工作单元]\nwork_unit_id=${claim.unit.id}\ngeneration=${claim.link.generation}\nlaunch_nonce=${claim.link.launchNonce}\n目标：${claim.unit.objective}\n完成标准：\n- ${claim.unit.completionCriteria.join("\n- ")}\n前置结果：${(claim.unit.inputRefs ?? []).join("；") || "无"}\n请在本角色权限内完成。完成前先调用 task_work_proof，再调用 task_work_complete；两次都必须原样携带 work_unit_id、generation、launch_nonce。`;
            try {
                const started = await api.runtime.subagent.run({ sessionKey: claim.link.childSessionKey, message: prompt, lane: `task-system:${claim.unit.agentId}`, lightContext: true, deliver: false, idempotencyKey: claim.link.idempotencyKey });
                if (!started.runId)
                    throw new Error("subagent returned no runId");
                const accepted = await withState((state) => {
                    const link = state.links.find((item) => item.id === claim.link.id && item.generation === claim.link.generation && item.launchNonce === claim.link.launchNonce);
                    if (!link || terminal(link.status))
                        return { terminalMerged: false, planId: claim.unit.planId };
                    if ((link.runId && link.runId !== started.runId) || (link.observedEndedRunId && link.observedEndedRunId !== started.runId)) {
                        link.status = "reconcile_required";
                        link.error = "启动回执与已观察事件不一致";
                        link.updatedAt = nowIso();
                        const unit = state.workUnits.find((item) => item.id === link.workUnitId);
                        if (unit && !terminal(unit.status)) {
                            unit.status = "reconcile_required";
                            unit.error = link.error;
                            unit.updatedAt = nowIso();
                        }
                        return { terminalMerged: false, planId: link.planId };
                    }
                    link.runId = started.runId;
                    link.status = "running";
                    link.updatedAt = link.lastActivityAt = nowIso();
                    const unit = state.workUnits.find((item) => item.id === link.workUnitId);
                    if (unit && !terminal(unit.status)) {
                        unit.status = "running";
                        unit.updatedAt = nowIso();
                    }
                    if (link.observedEndedRunId)
                        applyObservedEnd(state, link, link.observedEndedOutcome ?? "ended", link.observedEndedError);
                    return { terminalMerged: Boolean(link.observedEndedRunId), planId: link.planId };
                });
                await refreshParents(accepted.planId);
                if (accepted.terminalMerged) {
                    const latest = await readState();
                    if (!terminal(latest.plans.find((item) => item.id === accepted.planId)?.status ?? "blocked"))
                        await startReadyPackets(accepted.planId, true);
                }
                return true;
            }
            catch (error) {
                await withState((state) => {
                    const link = state.links.find((item) => item.id === claim.link.id && item.generation === claim.link.generation && item.launchNonce === claim.link.launchNonce);
                    const unit = state.workUnits.find((item) => item.id === claim.unit.id);
                    if (link && !terminal(link.status)) {
                        link.status = "reconcile_required";
                        link.error = safeError(error);
                        link.updatedAt = nowIso();
                    }
                    if (unit && !terminal(unit.status)) {
                        unit.status = "reconcile_required";
                        unit.error = "启动结果未知，禁止自动重试";
                        unit.updatedAt = nowIso();
                    }
                });
                await refreshParents(claim.unit.planId);
                throw error;
            }
        };
        const startReadyPackets = async (planId, launch = true) => {
            const snapshot = await readState();
            for (const packet of snapshot.packets.filter((item) => item.planId === planId && ["waiting_dependencies", "pending"].includes(item.status))) {
                if (packet.delegationMode === "legacy_workboard_v2" || (packet.delegationMode === "legacy_controller_v2" && !packet.decompositionReceipt))
                    continue;
                const dependencies = packet.dependsOn.map((key) => snapshot.packets.find((item) => item.planId === planId && item.packetKey === key));
                if (dependencies.some((item) => !item || item.status !== "succeeded"))
                    continue;
                await withState((state) => {
                    const current = state.packets.find((item) => item.id === packet.id);
                    if (!current || terminal(current.status))
                        return;
                    current.inputRefs = dependencies.flatMap((dep) => dep?.workUnitIds.map((id) => state.workUnits.find((unit) => unit.id === id)?.resultRef).filter((value) => Boolean(value)) ?? []);
                    current.delegationMode = current.delegationMode ?? "direct_subagent_v3";
                    current.status = "pending";
                    current.updatedAt = nowIso();
                });
                const unitId = await materializePacket(packet.id);
                if (launch && unitId)
                    await startDirectUnit(unitId);
            }
            await refreshParents(planId);
        };
        const reconcilePlan = async (planId) => {
            await withState((state) => {
                for (const link of state.links.filter((item) => item.planId === planId && item.dispatchKind === "subagent_direct" && item.status === "reconcile_required" && item.workerOutcome === "ok")) {
                    if (link.proofReceipt && link.completionReceipt)
                        continue;
                    link.status = "blocked";
                    link.error = "执行已结束但显式核对后仍缺少完整收据";
                    link.updatedAt = nowIso();
                    const unit = state.workUnits.find((item) => item.id === link.workUnitId);
                    if (unit && !terminal(unit.status)) {
                        unit.status = "blocked";
                        unit.error = link.error;
                        unit.updatedAt = nowIso();
                    }
                }
                for (const packet of state.packets.filter((item) => item.planId === planId && !terminal(item.status))) {
                    const links = state.links.filter((item) => item.packetId === packet.id);
                    if (links.some((item) => item.cardId || item.dispatchKind === "workboard_legacy")) {
                        packet.delegationMode = "legacy_workboard_v2";
                        continue;
                    }
                    const leaseLive = Boolean(packet.controllerLeaseUntil && Date.parse(packet.controllerLeaseUntil) > Date.now());
                    if (packet.controllerRunId && leaseLive) {
                        packet.delegationMode = "legacy_controller_v2";
                        continue;
                    }
                    if (packet.controllerRunId && !packet.decompositionReceipt) {
                        packet.status = "reconcile_required";
                        packet.error = "旧控制会话结果未知，禁止自动重放";
                        continue;
                    }
                    packet.delegationMode = "direct_subagent_v3";
                    for (const id of packet.workUnitIds) {
                        const unit = state.workUnits.find((item) => item.id === id);
                        if (!unit || state.links.some((item) => item.workUnitId === id) || terminal(unit.status))
                            continue;
                        const rule = capabilities.get(packet.capability);
                        if (!rule || !rule.owners.includes(packet.targetAgentId)) {
                            unit.status = "reconcile_required";
                            unit.error = "旧任务包的角色与能力不匹配，已隔离且不会启动";
                            unit.updatedAt = nowIso();
                            packet.status = "reconcile_required";
                            packet.error = unit.error;
                            packet.updatedAt = nowIso();
                            continue;
                        }
                        if (isLegacyPlaceholder(unit)) {
                            unit.agentId = packet.targetAgentId;
                            unit.title = packet.title;
                            unit.objective = packet.objective;
                            unit.completionCriteria = [...packet.completionCriteria];
                            unit.capability = packet.capability;
                            unit.inputRefs = [...packet.inputRefs];
                        }
                        else if (unit.agentId !== packet.targetAgentId || unit.capability !== packet.capability) {
                            unit.status = "reconcile_required";
                            unit.error = "旧工作单元不是已知占位模板，且角色或能力与任务包不一致，已隔离";
                            unit.updatedAt = nowIso();
                            packet.status = "reconcile_required";
                            packet.error = unit.error;
                            packet.updatedAt = nowIso();
                            continue;
                        }
                        unit.delegationMode = "direct_subagent_v3";
                        unit.status = "ready";
                        unit.updatedAt = nowIso();
                    }
                }
            });
            await startReadyPackets(planId, true);
            const state = await readState();
            for (const unit of state.workUnits.filter((item) => item.planId === planId && item.status === "ready"))
                await startDirectUnit(unit.id);
            await sendPlanCompletion(planId, true);
            const latest = await readState();
            const links = latest.links.filter((item) => item.planId === planId);
            return { started: links.filter((item) => item.status === "starting").length, running: links.filter((item) => item.status === "running").length, succeeded: links.filter((item) => item.status === "succeeded").length, blocked: links.filter((item) => ["failed", "blocked"].includes(item.status)).length, unresolved: links.filter((item) => item.status === "reconcile_required").length + latest.packets.filter((item) => item.planId === planId && item.status === "reconcile_required" && !links.some((link) => link.packetId === item.id)).length };
        };
        api.on("before_agent_run", async (event, ctx) => {
            const context = ctx;
            if (!ctx.agentId || !accountByAgent.has(ctx.agentId) || !ctx.sessionKey)
                return;
            if (providerOf(context) !== "telegram" || event.senderIsOwner !== true)
                return;
            if (ownerTelegramId && String(event.senderId ?? ctx.senderId ?? "") !== ownerTelegramId)
                return;
            const expectedAccount = accountByAgent.get(ctx.agentId);
            if (event.accountId && event.accountId !== expectedAccount)
                return;
            const prompt = String(event.prompt ?? "").normalize("NFKC").trim();
            if (!prompt)
                return;
            const profile = classifyWorkflow(prompt);
            const route = `${ctx.agentId}:${expectedAccount}:${String(event.senderId ?? ctx.senderId ?? "-")}`;
            const eventKey = `${route}:${String(event.messageId ?? ctx.runId ?? `${Math.floor(Date.now() / 30_000)}:${sha256(prompt).slice(0, 20)}`)}`;
            const inbox = await withState((state) => {
                const existing = state.inbox.find((item) => item.eventKey === eventKey);
                if (existing)
                    return structuredClone(existing);
                const createdAt = nowIso();
                const created = {
                    id: `inbox-${randomUUID()}`, eventKey, agentId: ctx.agentId, accountId: expectedAccount,
                    channelId: String(ctx.channelId ?? event.channelId ?? ""), senderId: String(event.senderId ?? ctx.senderId ?? ""), sessionKey: ctx.sessionKey, runId: ctx.runId,
                    promptHash: sha256(prompt), prompt, profile, status: profile === "conversation" ? "triaged" : "registered", planIds: [], cardIds: [], expectedModules: [], revision: 1, createdAt, updatedAt: createdAt
                };
                state.inbox.push(created);
                return structuredClone(created);
            });
            const key = turnKey(context, event);
            if (key)
                turnInbox.set(key, inbox.id);
        });
        api.on("agent_turn_prepare", async (_event, ctx) => {
            if (!ctx.sessionKey)
                return;
            const state = await readState();
            const inboxId = turnInbox.get(turnKey(ctx));
            const inbox = inboxId ? state.inbox.find((item) => item.id === inboxId) : undefined;
            if (!inbox || inbox.profile === "conversation")
                return;
            const catalog = [...capabilities.entries()].map(([name, rule]) => `${name}=>${rule.owners.join("/")}`).join("；");
            return { appendContext: `[内部任务入口已持久登记] 这是可执行任务。你可以做必要的只读核对，但具体变更必须调用 task_delegate plan 委派，不得亲自运行命令、写入或调用业务变更模块，也不得把内部编号或权限问题抛给少主。可用能力：${catalog}` };
        });
        api.on("before_prompt_build", async (_event, ctx) => {
            if (!ctx.sessionKey || sessionKind(ctx.sessionKey, controllers) !== "controller")
                return;
            return { appendContext: "你处于角色任务控制会话，只能调用 task_delegate 分解任务包或核对持久收据；不得亲自执行查询、读写、命令或业务模块。" };
        });
        api.on("before_tool_call", async (event, ctx) => {
            if (!ctx.sessionKey)
                return;
            const kind = sessionKind(ctx.sessionKey, controllers);
            if (kind === "worker" || kind === "automation")
                return;
            const key = turnKey(ctx);
            const activeTask = kind === "controller" || Boolean(turnInbox.get(key));
            if (!activeTask)
                return;
            if (CONCRETE_TOOLS.has(event.toolName) || (!CONTROL_TOOLS.has(event.toolName) && kind === "controller")) {
                return { block: true, blockReason: "这一步会产生实际变更，主会话或控制会话不能亲自做。请用 task_delegate 交给目标角色执行 Agent；若角色能力不符，重新分工，不要向少主索要权限。" };
            }
        });
        api.on("before_agent_finalize", async (event, ctx) => {
            if (!ctx.sessionKey)
                return;
            const key = turnKey(ctx, event);
            const inboxId = turnInbox.get(key);
            if (!inboxId)
                return;
            const state = await readState();
            const inbox = state.inbox.find((item) => item.id === inboxId);
            if (!inbox || inbox.profile === "conversation")
                return;
            const delegated = inbox.planIds.some((id) => state.plans.some((plan) => plan.id === id));
            if (!delegated && !event.stopHookActive) {
                return { action: "revise", reason: "delegation_receipt_missing", retry: { instruction: "本轮尚未形成真实分工。立即调用 task_delegate plan，至少创建一个角色任务包；不得亲自执行或要求少主开放权限。", idempotencyKey: `delegate:${inbox.id}`, maxAttempts: 1 } };
            }
            const content = typeof event.lastAssistantMessage === "string" ? event.lastAssistantMessage : "";
            associations.push({ runKey: key, sessionKey: ctx.sessionKey, inboxId, contentHash: sha256(content), delegated, expiresAt: Date.now() + 5 * 60_000 });
            while (associations.length > 1000)
                associations.shift();
        });
        api.on("message_sending", async (event, ctx) => {
            if (!ctx.sessionKey)
                return;
            const contentHash = sha256(event.content);
            const matches = associations.filter((item) => item.sessionKey === ctx.sessionKey && item.contentHash === contentHash && item.expiresAt > Date.now());
            if (!matches.length)
                return;
            if (matches.length !== 1)
                return { cancel: true, cancelReason: "ambiguous task turn correlation" };
            const match = matches[0];
            if (match.delegated)
                return;
            return { content: "少主，这件事已经记下，但内部还没成功建立分工，因此目前没有开始执行。我会先把职责和执行人安排妥当；在此之前不会让您代跑命令，也不会把内部权限问题推给您。" };
        });
        api.on("agent_end", (event, ctx) => {
            const key = turnKey(ctx, event);
            if (key)
                turnInbox.delete(key);
        });
        api.on("after_tool_call", async (event, ctx) => {
            if (!ctx.sessionKey)
                return;
            const success = !event.error && detailsOf(event.result).ok !== false;
            if (success && event.toolName === "morning_brief_control") {
                const modules = inferModules(event.toolName, event.params, event.result);
                await withState((state) => {
                    const link = state.links.find((item) => item.childSessionKey === ctx.sessionKey);
                    if (!link)
                        return;
                    const inbox = state.inbox.find((item) => item.id === link.inboxId);
                    if (!inbox)
                        return;
                    for (const module of modules) {
                        const expected = inbox.expectedModules.find((item) => item.module === module && item.status === "expected");
                        if (expected) {
                            expected.status = "applied";
                            expected.receiptHash = sha256(JSON.stringify(detailsOf(event.result)));
                            expected.updatedAt = nowIso();
                        }
                    }
                });
            }
        });
        api.on("subagent_spawned", async (event) => {
            const matched = await withState((state) => {
                const link = state.links.find((item) => item.dispatchKind === "subagent_direct" && item.childSessionKey === event.childSessionKey && item.assignee === event.agentId);
                if (!link || terminal(link.status) || !link.generation || !link.launchNonce)
                    return undefined;
                if (link.runId && link.runId !== event.runId) {
                    link.status = "reconcile_required";
                    link.error = "启动事件与回执不一致";
                    return { planId: link.planId, ok: false };
                }
                link.runId = event.runId;
                link.status = "running";
                link.updatedAt = link.lastActivityAt = nowIso();
                const unit = state.workUnits.find((item) => item.id === link.workUnitId);
                if (unit && !terminal(unit.status)) {
                    unit.status = "running";
                    unit.updatedAt = nowIso();
                }
                return { planId: link.planId, ok: true };
            });
            if (matched)
                await refreshParents(matched.planId);
        });
        api.on("subagent_ended", async (event) => {
            const eventRecord = event;
            const runId = typeof eventRecord.runId === "string" ? eventRecord.runId : "";
            const controllerPacket = await withState((state) => {
                const packet = state.packets.find((item) => item.controllerRunId === runId);
                if (!packet)
                    return undefined;
                if (!packet.decompositionReceipt) {
                    packet.status = "blocked";
                    packet.error = "controller ended without a decomposition receipt";
                    packet.updatedAt = nowIso();
                }
                return { id: packet.id, planId: packet.planId };
            });
            if (controllerPacket) {
                await refreshParents(controllerPacket.planId);
                return;
            }
            const link = (await readState()).links.find((item) => item.dispatchKind === "subagent_direct" && item.childSessionKey === eventRecord.targetSessionKey && (!item.runId || item.runId === runId));
            if (!link)
                return;
            const ended = await withState((state) => {
                const current = state.links.find((item) => item.id === link.id);
                if (!current || terminal(current.status) || current.generation !== link.generation || current.launchNonce !== link.launchNonce)
                    return { finalize: false };
                if (!runId) {
                    current.status = "reconcile_required";
                    current.error = "结束事件缺少 runId，已隔离且不会重跑";
                    current.updatedAt = nowIso();
                    const unit = state.workUnits.find((item) => item.id === current.workUnitId);
                    if (unit && !terminal(unit.status)) {
                        unit.status = "reconcile_required";
                        unit.error = current.error;
                        unit.updatedAt = nowIso();
                    }
                    return { finalize: true };
                }
                if (current.runId && current.runId !== runId) {
                    current.status = "reconcile_required";
                    current.error = "结束事件与启动回执不一致";
                    current.updatedAt = nowIso();
                    const unit = state.workUnits.find((item) => item.id === current.workUnitId);
                    if (unit && !terminal(unit.status)) {
                        unit.status = "reconcile_required";
                        unit.error = current.error;
                        unit.updatedAt = nowIso();
                    }
                    return { finalize: true };
                }
                const outcome = typeof eventRecord.outcome === "string" ? eventRecord.outcome : "ended";
                current.observedEndedRunId = runId;
                current.observedEndedOutcome = outcome;
                current.observedEndedAt = typeof eventRecord.endedAt === "number" ? eventRecord.endedAt : Date.now();
                current.observedEndedError = typeof eventRecord.error === "string" ? eventRecord.error : undefined;
                current.updatedAt = nowIso();
                if (!current.runId)
                    return { finalize: false };
                applyObservedEnd(state, current, outcome, current.observedEndedError);
                return { finalize: true };
            });
            if (!ended.finalize)
                return;
            await refreshParents(link.planId);
            const after = await readState();
            if (after.plans.find((item) => item.id === link.planId)?.status !== "blocked") {
                try {
                    await startReadyPackets(link.planId, true);
                }
                catch { /* state already records unknown or blocked */ }
            }
        });
        api.on("gateway_start", async () => {
            await readState();
            api.logger.info("task-system-control v3 loaded; startup replay is disabled");
        });
        api.registerTool((ctx) => {
            if (!ctx.agentId || !accountByAgent.has(ctx.agentId) || !ctx.sessionKey)
                return null;
            const toolSessionKey = ctx.sessionKey;
            return {
                name: "task_delegate", label: "Task Delegate", description: "Create a durable role plan and dispatch one receipt-gated direct worker for each role packet.", parameters: DelegateSchema,
                async execute(_id, raw) {
                    const p = record(raw);
                    try {
                        if (p.action === "inspect") {
                            const state = await readState();
                            const plan = typeof p.plan_id === "string" ? state.plans.find((item) => item.id === p.plan_id) : [...state.plans].reverse().find((item) => item.sourceSessionKey === ctx.sessionKey);
                            if (!plan)
                                throw new Error("没有找到对应任务计划");
                            return toolResult({ ok: true, plan: publicPlan(state, plan) });
                        }
                        if (p.action === "reconcile") {
                            const state = await readState();
                            const plan = typeof p.plan_id === "string" ? state.plans.find((item) => item.id === p.plan_id) : [...state.plans].reverse().find((item) => item.sourceSessionKey === ctx.sessionKey);
                            if (!plan)
                                throw new Error("没有找到对应任务计划");
                            const summary = await reconcilePlan(plan.id);
                            const next = await readState();
                            return toolResult({ ok: summary.unresolved === 0, reconciliation: summary, plan: publicPlan(next, next.plans.find((item) => item.id === plan.id)) });
                        }
                        if (p.action === "block" || p.action === "cancel") {
                            const reason = text(p.reason, "reason", 2000);
                            const planId = text(p.plan_id, "plan_id", 100);
                            await withState((state) => {
                                const plan = state.plans.find((item) => item.id === planId);
                                if (!plan)
                                    throw new Error("没有找到对应任务计划");
                                const nextStatus = p.action === "cancel" ? "cancelled" : "blocked";
                                plan.status = nextStatus;
                                plan.error = reason;
                                plan.updatedAt = nowIso();
                                const inbox = state.inbox.find((item) => item.id === plan.inboxId);
                                if (inbox && !terminal(inbox.status)) {
                                    inbox.status = nextStatus;
                                    inbox.error = reason;
                                    inbox.updatedAt = nowIso();
                                }
                                for (const packet of state.packets.filter((item) => item.planId === planId && !terminal(item.status))) {
                                    packet.status = nextStatus;
                                    packet.error = reason;
                                    packet.updatedAt = nowIso();
                                }
                                for (const unit of state.workUnits.filter((item) => item.planId === planId && !terminal(item.status))) {
                                    unit.status = nextStatus;
                                    unit.error = reason;
                                    unit.updatedAt = nowIso();
                                }
                                for (const link of state.links.filter((item) => item.planId === planId && !terminal(item.status))) {
                                    link.status = nextStatus;
                                    link.error = reason;
                                    link.updatedAt = nowIso();
                                }
                            });
                            await sendPlanCompletion(planId);
                            return toolResult({ ok: true, status: p.action === "cancel" ? "cancelled" : "blocked" });
                        }
                        if (p.action === "plan") {
                            const kind = sessionKind(toolSessionKey, controllers);
                            const handoffId = typeof p.handoff_id === "string" ? p.handoff_id : undefined;
                            if (kind !== "main" && !(kind === "controller" && ctx.agentId === "housekeeper" && handoffId))
                                throw new Error("only a role main session or the housekeeper handoff controller can create a top-level plan");
                            const state = await readState();
                            const handoff = handoffId ? state.handoffs.find((item) => item.id === handoffId) : undefined;
                            if (handoffId && (!handoff || handoff.targetAgentId !== "housekeeper" || !["pending", "applying"].includes(String(handoff.status))))
                                throw new Error("没有可应用的跨域转交");
                            const handoffInboxId = typeof handoff?.inboxId === "string" ? handoff.inboxId : undefined;
                            const inbox = handoffInboxId ? state.inbox.find((item) => item.id === handoffInboxId) : currentInbox(state, toolSessionKey, p.inbox_id);
                            if (!inbox)
                                throw new Error("跨域转交缺少原始任务入口，不能创建孤立计划");
                            if (terminal(inbox.status))
                                throw new Error("该任务入口已经结束，不能重新用于新计划");
                            if (inbox.profile === "conversation")
                                throw new Error("普通聊天不应创建执行计划");
                            const titleValue = text(p.title, "title", 240);
                            const goal = text(p.goal, "goal");
                            if (!Array.isArray(p.packets) || !p.packets.length)
                                throw new Error("packets is required");
                            const packetInputs = p.packets.map(record);
                            const keys = packetInputs.map((item) => text(item.packet_key, "packet_key", 100));
                            if (new Set(keys).size !== keys.length)
                                throw new Error("packet_key must be unique");
                            const dependencyMap = new Map(packetInputs.map((item, index) => [keys[index], Array.isArray(item.depends_on) ? item.depends_on.map(String) : []]));
                            assertAcyclic(keys, dependencyMap, "packet");
                            const created = await withState((next) => {
                                const existingPlan = inbox.planIds.map((id) => next.plans.find((item) => item.id === id)).find((item) => item?.goal === goal);
                                if (existingPlan)
                                    return structuredClone(existingPlan);
                                const timestamp = nowIso();
                                const planId = `plan-${randomUUID()}`;
                                const packetIds = [];
                                for (let index = 0; index < packetInputs.length; index += 1) {
                                    const item = packetInputs[index];
                                    const target = text(item.target_agent, "target_agent", 80);
                                    if (!accountByAgent.has(target))
                                        throw new Error(`unknown target agent ${target}`);
                                    if (ctx.agentId !== "housekeeper" && target !== ctx.agentId && target !== "housekeeper")
                                        throw new Error("跨角色任务必须先转给賈南風，不得直接指派其他专业角色");
                                    const capability = text(item.capability, "capability", 160);
                                    capabilityRule(capability, target);
                                    const packetId = `packet-${randomUUID()}`;
                                    packetIds.push(packetId);
                                    const deps = dependencyMap.get(keys[index]) ?? [];
                                    next.packets.push({ id: packetId, planId, packetKey: keys[index], targetAgentId: target, controllerSessionKey: controllers.get(target), title: text(item.title, "packet.title", 240), objective: text(item.objective, "packet.objective"), completionCriteria: strings(item.completion_criteria, "packet.completion_criteria"), capability, dependsOn: deps, inputRefs: [], delegationMode: "direct_subagent_v3", status: deps.length ? "waiting_dependencies" : "pending", idempotencyKey: `task-direct:${planId}:${keys[index]}`, workUnitIds: [], createdAt: timestamp, updatedAt: timestamp });
                                }
                                const plan = { id: planId, inboxId: inbox.id, sourceAgentId: ctx.agentId, sourceSessionKey: ctx.sessionKey, title: titleValue, goal, profile: inbox.profile, delegationMode: "direct_subagent_v3", status: "planned", packetIds, createdAt: timestamp, updatedAt: timestamp };
                                next.plans.push(plan);
                                const currentInboxRecord = next.inbox.find((item) => item.id === inbox.id);
                                currentInboxRecord.planIds.push(planId);
                                currentInboxRecord.goal = goal;
                                currentInboxRecord.status = "delegating";
                                currentInboxRecord.updatedAt = timestamp;
                                if (handoffId) {
                                    const currentHandoff = next.handoffs.find((item) => item.id === handoffId);
                                    if (currentHandoff) {
                                        currentHandoff.status = "applied";
                                        currentHandoff.planId = planId;
                                        currentHandoff.updatedAt = timestamp;
                                    }
                                }
                                return structuredClone(plan);
                            });
                            await startReadyPackets(created.id);
                            const latest = await readState();
                            return toolResult({ ok: true, delegated: true, plan: publicPlan(latest, latest.plans.find((item) => item.id === created.id)) });
                        }
                        if (p.action === "decompose_packet") {
                            if (sessionKind(toolSessionKey, controllers) !== "controller")
                                throw new Error("only a role controller session can decompose a packet");
                            const packetId = text(p.packet_id, "packet_id", 100);
                            if (!Array.isArray(p.work_units) || !p.work_units.length)
                                throw new Error("work_units is required");
                            const unitInputs = p.work_units.map(record);
                            const keys = unitInputs.map((item) => text(item.unit_key, "unit_key", 100));
                            if (new Set(keys).size !== keys.length)
                                throw new Error("unit_key must be unique");
                            const dependencyMap = new Map(unitInputs.map((item, index) => [keys[index], Array.isArray(item.depends_on) ? item.depends_on.map(String) : []]));
                            assertAcyclic(keys, dependencyMap, "work unit");
                            const planId = await withState((state) => {
                                const packet = state.packets.find((item) => item.id === packetId);
                                if (!packet)
                                    throw new Error("没有找到对应角色任务包");
                                if (packet.delegationMode !== "legacy_controller_v2")
                                    throw new Error("direct task packets cannot be decomposed again");
                                if (packet.targetAgentId !== ctx.agentId || packet.controllerSessionKey !== ctx.sessionKey)
                                    throw new Error("当前角色不能分解这个任务包");
                                if (packet.decompositionReceipt)
                                    return packet.planId;
                                const timestamp = nowIso();
                                for (let index = 0; index < unitInputs.length; index += 1) {
                                    const item = unitInputs[index];
                                    const capability = text(item.capability, "unit.capability", 160);
                                    capabilityRule(capability, ctx.agentId);
                                    const unitId = `unit-${randomUUID()}`;
                                    const deps = dependencyMap.get(keys[index]) ?? [];
                                    state.workUnits.push({ id: unitId, planId: packet.planId, packetId: packet.id, unitKey: keys[index], agentId: ctx.agentId, title: text(item.title, "unit.title", 240), objective: text(item.objective, "unit.objective"), completionCriteria: strings(item.completion_criteria, "unit.completion_criteria"), capability, dependsOn: deps, inputRefs: packet.inputRefs, delegationMode: "direct_subagent_v3", idempotencyKey: `task-unit:${packet.planId}:${packet.packetKey}:${keys[index]}`, status: deps.length ? "waiting_dependencies" : "ready", createdAt: timestamp, updatedAt: timestamp });
                                    packet.workUnitIds.push(unitId);
                                }
                                packet.decompositionReceipt = sha256(JSON.stringify({ packetId: packet.id, units: keys, agentId: ctx.agentId }));
                                packet.status = "running";
                                packet.updatedAt = timestamp;
                                const plan = state.plans.find((item) => item.id === packet.planId);
                                if (plan) {
                                    plan.status = "running";
                                    plan.updatedAt = timestamp;
                                }
                                const inbox = plan ? state.inbox.find((item) => item.id === plan.inboxId) : undefined;
                                if (inbox)
                                    inbox.status = "running";
                                return packet.planId;
                            });
                            for (const unit of (await readState()).workUnits.filter((item) => item.planId === planId && item.status === "ready"))
                                await startDirectUnit(unit.id);
                            return toolResult({ ok: true, decomposed: true, workItems: unitInputs.length });
                        }
                        throw new Error(`unsupported task_delegate action ${String(p.action)}`);
                    }
                    catch (error) {
                        return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
                    }
                }
            };
        }, { name: "task_delegate", optional: true });
        api.registerTool((ctx) => {
            if (!ctx.agentId || !accountByAgent.has(ctx.agentId) || !ctx.sessionKey)
                return null;
            const toolSessionKey = ctx.sessionKey;
            return {
                name: "task_intake", label: "Task Intake", description: "Inspect and triage the durable owner task entry. Formal execution must use task_delegate.", parameters: IntakeSchema,
                async execute(_id, raw) {
                    const p = record(raw);
                    try {
                        if (p.action === "list") {
                            const state = await readState();
                            return toolResult({ ok: true, items: state.inbox.filter((item) => item.sessionKey === ctx.sessionKey).slice(-20).map((item) => ({ status: item.status, profile: item.profile, hasPlan: item.planIds.length > 0 })) });
                        }
                        if (p.action === "inspect") {
                            const state = await readState();
                            const inbox = currentInbox(state, toolSessionKey, p.inbox_id);
                            return toolResult({ ok: true, item: { status: inbox.status, profile: inbox.profile, hasPlan: inbox.planIds.length > 0 } });
                        }
                        if (p.action === "reconcile") {
                            const state = await readState();
                            const inbox = currentInbox(state, toolSessionKey, p.inbox_id);
                            const summaries = [];
                            for (const planId of inbox.planIds)
                                summaries.push(await reconcilePlan(planId));
                            const unresolved = summaries.reduce((sum, item) => sum + item.unresolved, 0);
                            return toolResult({ ok: unresolved === 0, reconciled: unresolved === 0, unresolved, summaries });
                        }
                        if (p.action === "triage") {
                            const profile = p.profile;
                            if (!PROFILE_VALUES.includes(profile))
                                throw new Error("profile is required");
                            await withState((state) => { const inbox = currentInbox(state, toolSessionKey, p.inbox_id); if (terminal(inbox.status))
                                throw new Error("该任务入口已经结束，不能重新分流"); inbox.profile = profile; inbox.goal = typeof p.goal === "string" ? p.goal : inbox.goal; inbox.status = "triaged"; inbox.updatedAt = nowIso(); });
                            return toolResult({ ok: true, triaged: true, instruction: profile === "conversation" ? "直接自然回复" : "立即调用 task_delegate plan" });
                        }
                        if (p.action === "start")
                            return toolResult({ ok: false, error: "旧的单卡 start 已停用；请用 task_delegate plan 明确分工" });
                        if (p.action === "block") {
                            const reason = text(p.reason, "reason", 2000);
                            await withState((state) => { const inbox = currentInbox(state, toolSessionKey, p.inbox_id); inbox.status = "blocked"; inbox.error = reason; inbox.updatedAt = nowIso(); });
                            return toolResult({ ok: true, blocked: true });
                        }
                        if (p.action === "queue_notification") {
                            const eventKey = text(p.event_key, "event_key", 240);
                            const contentHash = text(p.content_hash, "content_hash", 64).toLowerCase();
                            if (eventKey.startsWith("task-plan-completion:"))
                                throw new Error("完成通知命名空间只允许插件直发通道使用");
                            await withState((state) => { if (!state.outbox.some((item) => item.eventKey === eventKey))
                                state.outbox.push({ id: `outbox-${randomUUID()}`, eventKey, kind: "ordinary_agent", sessionKey: ctx.sessionKey, contentHash, status: "pending", createdAt: nowIso(), updatedAt: nowIso() }); });
                            return toolResult({ ok: true, queued: true });
                        }
                        throw new Error(`unsupported task_intake action ${String(p.action)}`);
                    }
                    catch (error) {
                        return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
                    }
                }
            };
        }, { name: "task_intake", optional: true });
        api.registerTool((ctx) => {
            if (!ctx.agentId || !accountByAgent.has(ctx.agentId) || !ctx.sessionKey)
                return null;
            const toolSessionKey = ctx.sessionKey;
            return {
                name: "task_handoff", label: "Task Handoff", description: "Compatibility bridge: cross-role work is routed to the housekeeper controller and must become a delegated plan.", parameters: HandoffSchema,
                async execute(_id, raw) {
                    const p = record(raw);
                    try {
                        if (p.action === "submit") {
                            const capability = text(p.capability, "capability", 160);
                            const timestamp = nowIso();
                            const id = `handoff-${randomUUID()}`;
                            await withState((state) => {
                                const inbox = currentInbox(state, toolSessionKey);
                                if (terminal(inbox.status))
                                    throw new Error("该任务入口已经结束，不能重新转交");
                                state.handoffs.push({ id, inboxId: inbox.id, sourceAgentId: ctx.agentId, sourceSessionKey: toolSessionKey, targetAgentId: "housekeeper", capability, payload: record(p.payload), status: "pending", createdAt: timestamp, updatedAt: timestamp });
                            });
                            const sessionKey = controllers.get("housekeeper");
                            const started = await api.runtime.subagent.run({ sessionKey, message: `[跨域任务转交]\n请在賈南風控制会话中检查持久 handoff ${id}，调用 task_delegate plan 并传 handoff_id=${id}，把它转换为顶层角色计划，再由目标角色自己的 controller 和 worker执行。不得亲自执行。`, lane: "task-controller:housekeeper", lightContext: true, deliver: false, idempotencyKey: `handoff:${id}` });
                            await withState((state) => { const item = state.handoffs.find((candidate) => candidate.id === id); if (item) {
                                item.status = "applying";
                                item.runId = started.runId;
                                item.updatedAt = nowIso();
                            } });
                            return toolResult({ ok: true, routed: true, status: "applying" });
                        }
                        const id = text(p.handoff_id, "handoff_id", 100);
                        const state = await readState();
                        const item = state.handoffs.find((candidate) => candidate.id === id);
                        if (!item)
                            throw new Error("没有找到转交记录");
                        if (p.action === "status")
                            return toolResult({ ok: true, status: item.status });
                        if (p.action === "cancel") {
                            await withState((next) => { const current = next.handoffs.find((candidate) => candidate.id === id); if (current) {
                                current.status = "cancelled";
                                current.updatedAt = nowIso();
                            } });
                            return toolResult({ ok: true, cancelled: true });
                        }
                        throw new Error(`unsupported task_handoff action ${String(p.action)}`);
                    }
                    catch (error) {
                        return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
                    }
                }
            };
        }, { name: "task_handoff", optional: true });
        api.registerTool((ctx) => {
            if (!ctx.agentId || !accountByAgent.has(ctx.agentId) || !ctx.sessionKey)
                return null;
            const toolSessionKey = ctx.sessionKey;
            return {
                name: "task_module", label: "Task Module", description: "Record expected morning-brief module receipts; actual writes must run in a receipt-gated life role worker.", parameters: ModuleSchema,
                async execute(_id, raw) {
                    const p = record(raw);
                    try {
                        if (p.action === "catalog")
                            return toolResult({ ok: true, modules: MODULE_VALUES.map((module) => ({ module, label: MODULE_LABELS[module] })) });
                        const state = await readState();
                        const inbox = currentInbox(state, toolSessionKey, p.inbox_id);
                        if (p.action === "inspect")
                            return toolResult({ ok: true, modules: inbox.expectedModules.map((item) => ({ label: MODULE_LABELS[item.module], status: item.status })) });
                        if (p.action === "expect") {
                            const module = text(p.module, "module", 100);
                            const action = text(p.control_action, "control_action", 100);
                            await withState((next) => { const current = currentInbox(next, ctx.sessionKey, inbox.id); if (terminal(current.status))
                                throw new Error("该任务入口已经结束，不能追加模块"); if (!current.expectedModules.some((item) => item.module === module && item.action === action))
                                current.expectedModules.push({ module, action, status: "expected", toolName: "morning_brief_control", updatedAt: nowIso() }); });
                            return toolResult({ ok: true, expected: true, instruction: "把该模块写入作为 life role packet 下放，只有 life worker 的专用收据才能回报已录入" });
                        }
                        throw new Error(`unsupported task_module action ${String(p.action)}`);
                    }
                    catch (error) {
                        return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
                    }
                }
            };
        }, { name: "task_module", optional: true });
        const receiptFactory = (kind) => (ctx) => {
            if (!ctx.agentId || !ctx.sessionKey || sessionKind(ctx.sessionKey, controllers) !== "worker")
                return null;
            return {
                name: kind === "proof" ? "task_work_proof" : "task_work_complete",
                label: kind === "proof" ? "Task Work Proof" : "Task Work Complete",
                description: kind === "proof" ? "Record bounded evidence for the current direct task worker." : "Record the bounded completion summary for the current direct task worker.",
                parameters: WorkReceiptSchema,
                async execute(_id, raw) {
                    const p = record(raw);
                    try {
                        const unitId = text(p.work_unit_id, "work_unit_id", 100);
                        const generation = Number(p.generation);
                        const nonce = text(p.launch_nonce, "launch_nonce", 100);
                        const summary = sanitizeSummary(text(p.summary, "summary"), 1000);
                        const changed = await withState((state) => {
                            const link = state.links.find((item) => item.workUnitId === unitId && item.dispatchKind === "subagent_direct" && item.assignee === ctx.agentId && item.childSessionKey === ctx.sessionKey && item.generation === generation && item.launchNonce === nonce);
                            const unit = state.workUnits.find((item) => item.id === unitId);
                            if (!link || !unit)
                                throw new Error("收据与当前执行不匹配");
                            if (terminal(link.status) || terminal(unit.status))
                                throw new Error("任务已经进入终态，拒绝迟到收据");
                            const receipt = sha256(JSON.stringify({ unitId, generation, nonce, kind, summary }));
                            if (kind === "proof") {
                                link.proofReceipt = receipt;
                                link.proofSummary = summary;
                            }
                            else {
                                link.completionReceipt = receipt;
                                link.completionSummary = summary;
                            }
                            link.updatedAt = link.lastActivityAt = nowIso();
                            if (link.workerOutcome === "ok" && link.proofReceipt && link.completionReceipt) {
                                link.status = "succeeded";
                                unit.status = "succeeded";
                                unit.resultRef = link.completionSummary;
                                unit.updatedAt = nowIso();
                            }
                            return { planId: link.planId, succeeded: link.status === "succeeded" };
                        });
                        await refreshParents(changed.planId);
                        if (changed.succeeded) {
                            try {
                                await startReadyPackets(changed.planId, true);
                            }
                            catch { /* state records the launch result */ }
                        }
                        return toolResult({ ok: true, recorded: kind });
                    }
                    catch (error) {
                        return toolResult({ ok: false, error: safeError(error) });
                    }
                }
            };
        };
        api.registerTool(receiptFactory("proof"), { name: "task_work_proof", optional: true });
        api.registerTool(receiptFactory("complete"), { name: "task_work_complete", optional: true });
        api.on("message_sent", async (event, ctx) => {
            const sessionKey = event.sessionKey ?? ctx.sessionKey;
            if (!sessionKey)
                return;
            const contentHash = sha256(event.content);
            await withState((state) => {
                const item = [...state.outbox].reverse().find((candidate) => candidate.kind === "ordinary_agent" && candidate.sessionKey === sessionKey && candidate.contentHash === contentHash && candidate.status === "pending");
                if (!item)
                    return;
                item.status = event.success ? event.messageId ? "sent" : "unknown" : "failed";
                item.messageId = event.messageId;
                item.error = event.error;
                item.updatedAt = nowIso();
            });
        });
    }
});
