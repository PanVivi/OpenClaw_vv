import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";

type JsonRecord = Record<string, unknown>;
type WorkflowProfile = "conversation" | "direct_module" | "simple_task" | "governed_change" | "research_plan_triple_review";
type ModuleName = "header" | "weather" | "aqi" | "attire" | "tasks" | "disciples" | "schedule" | "folk_calendar";
type InboxStatus = "registered" | "triaged" | "starting" | "linked" | "running" | "applied" | "completed" | "blocked" | "not_applicable" | "reconcile_required";

type InboxRecord = {
  id: string;
  eventKey: string;
  providerMessageId?: string;
  agentId: string;
  accountId?: string;
  channelId: string;
  senderId: string;
  sessionKey: string;
  runId?: string;
  promptHash: string;
  profile: WorkflowProfile;
  status: InboxStatus;
  goal?: string;
  flowId?: string;
  cardIds: string[];
  expectedModules: ModuleExpectation[];
  revision: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

type ModuleExpectation = {
  module: ModuleName;
  action: string;
  status: "expected" | "applied" | "blocked";
  toolName: string;
  toolCallId?: string;
  receiptHash?: string;
  updatedAt: string;
};

type HandoffRecord = {
  id: string;
  dedupeKey: string;
  sourceAgentId: string;
  sourceSessionKey: string;
  targetAgentId: string;
  targetSessionKey: string;
  capability: string;
  payload: JsonRecord;
  status: "pending" | "accepted" | "applying" | "applied" | "blocked" | "cancelled";
  runId?: string;
  expectedTool?: string;
  receiptHash?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type LinkRecord = {
  id: string;
  inboxId: string;
  flowId?: string;
  cardId: string;
  boardId: string;
  assignee: string;
  runId?: string;
  childSessionKey?: string;
  taskId?: string;
  mirroredFlowId?: string;
  status: "card_ready" | "running" | "succeeded" | "failed" | "blocked" | "reconcile_required";
  workerOutcome?: string;
  proofReceipt?: string;
  lastActivityAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type OutboxRecord = {
  id: string;
  eventKey: string;
  sessionKey: string;
  contentHash: string;
  status: "pending" | "sent" | "unknown" | "failed";
  messageId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type TaskSystemState = {
  schema: "hehuan.task-system-control";
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  inbox: InboxRecord[];
  handoffs: HandoffRecord[];
  links: LinkRecord[];
  outbox: OutboxRecord[];
};

const PROFILE_VALUES = ["conversation", "direct_module", "simple_task", "governed_change", "research_plan_triple_review"] as const;
const MODULE_VALUES = ["header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"] as const;
const INTAKE_ACTIONS = ["triage", "start", "inspect", "list", "reconcile", "queue_notification", "block"] as const;
const HANDOFF_ACTIONS = ["submit", "accept", "status", "cancel"] as const;
const MODULE_ACTIONS = ["catalog", "expect", "inspect"] as const;
const MODULE_LABELS: Record<ModuleName, string> = {
  header: "抬头与晨辞", weather: "天候司", aqi: "清气监", attire: "衣行令",
  tasks: "今日要事", disciples: "门下近况", schedule: "今日玉牒", folk_calendar: "今日小签"
};

const IntakeSchema = Type.Object({
  action: Type.Union(INTAKE_ACTIONS.map((value) => Type.Literal(value))),
  inbox_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  profile: Type.Optional(Type.Union(PROFILE_VALUES.map((value) => Type.Literal(value)))),
  goal: Type.Optional(Type.String({ minLength: 1, maxLength: 4000 })),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 240 })),
  assignee: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  completion_criteria: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 1000 }), { minItems: 1, maxItems: 50 })),
  priority: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("normal"), Type.Literal("high"), Type.Literal("urgent")])),
  cross_turn: Type.Optional(Type.Boolean()),
  reason: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
  content_hash: Type.Optional(Type.String({ pattern: "^[A-Fa-f0-9]{64}$" })),
  event_key: Type.Optional(Type.String({ minLength: 1, maxLength: 240 }))
}, { additionalProperties: false });

const HandoffSchema = Type.Object({
  action: Type.Union(HANDOFF_ACTIONS.map((value) => Type.Literal(value))),
  handoff_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  target_agent: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  capability: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
  expected_tool: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
  dedupe_key: Type.Optional(Type.String({ minLength: 1, maxLength: 240 })),
  payload: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
}, { additionalProperties: false });

const ModuleSchema = Type.Object({
  action: Type.Union(MODULE_ACTIONS.map((value) => Type.Literal(value))),
  inbox_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  module: Type.Optional(Type.Union(MODULE_VALUES.map((value) => Type.Literal(value)))),
  control_action: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
}, { additionalProperties: false });

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requiredText(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  const normalized = value.normalize("NFKC").trim();
  if (normalized.length > max || /[\u0000-\u001f\u007f]/u.test(normalized)) throw new Error(`${field} is invalid`);
  return normalized;
}

function detailsOf(result: unknown): JsonRecord | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const record = result as JsonRecord;
  if (record.details && typeof record.details === "object" && !Array.isArray(record.details)) return record.details as JsonRecord;
  return record;
}

function toolResult(value: unknown) {
  const guidance = {
    ...(value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : { value }),
    replyGuidance: "只用角色口吻向少主说清发生了什么、影响和下一步；不得展示 inbox、profile、Card、Task、Host、CWD、UUID、session、run、flow 等内部字段。"
  };
  return { content: [{ type: "text" as const, text: JSON.stringify(guidance, null, 2) }], details: guidance };
}

export function classifyWorkflow(prompt: string): WorkflowProfile {
  const text = prompt.normalize("NFKC");
  const moduleSubject = /(晨报|晨间玉简|日程|行程|提醒|天气|空气质量|AQI|穿衣|防晒|带伞|待办|要事|门下近况|小签|农历|节气)/iu.test(text);
  const mutation = /(记(?:下|录)|录入|添加|新增|改(?:成|为|一下)?|修改|取消|删除|设置|以后|安排|提醒我|放进|写入|转告)/u.test(text);
  if (moduleSubject && mutation) return "direct_module";
  if (/(查询.*官方|官方说明|GitHub.*讨论|社群.*讨论|三次.*审查|完整.*收集|正式修复计划|修复整个|部署.*验收.*文档|全部结束.*通知)/isu.test(text)) {
    return "research_plan_triple_review";
  }
  if (/(生产|部署|配置|插件|权限|工作流|任务系统|修复|迁移|同步|重启|故障|回滚|验收)/u.test(text) && /(检查|核对|修复|实现|修改|部署|迁移|同步|解决|打通)/u.test(text)) {
    return "governed_change";
  }
  if (/(请|帮我|查查|检查|核对|搜索|整理|列出|完成|通知|给出方案|处理)/u.test(text)) return "simple_task";
  return "conversation";
}

export function inferModules(toolName: string, params: JsonRecord, result: unknown): ModuleName[] {
  if (toolName !== "morning_brief_control") return [];
  const explicit = typeof params.module === "string" && MODULE_VALUES.includes(params.module as ModuleName)
    ? [params.module as ModuleName] : [];
  const action = typeof params.action === "string" ? params.action : "";
  if (explicit.length) return explicit;
  if (["upsert_event", "cancel_event"].includes(action)) return ["schedule"];
  if (["upsert_task", "set_task_status", "archive_task"].includes(action)) return ["tasks"];
  if (["set_location", "clear_location"].includes(action)) return ["weather", "aqi", "attire"];
  const details = detailsOf(result);
  const sections = Array.isArray(details?.sections) ? details.sections : [];
  return MODULE_VALUES.filter((module) => sections.includes(MODULE_LABELS[module]));
}

function emptyState(): TaskSystemState {
  return {
    schema: "hehuan.task-system-control", schemaVersion: 1, revision: 0,
    updatedAt: new Date(0).toISOString(), inbox: [], handoffs: [], links: [], outbox: []
  };
}

function validateState(value: unknown): TaskSystemState {
  const state = value as TaskSystemState;
  if (state?.schema !== "hehuan.task-system-control" || state.schemaVersion !== 1) throw new Error("task-system state schema is invalid");
  for (const key of ["inbox", "handoffs", "links", "outbox"] as const) {
    if (!Array.isArray(state[key])) throw new Error(`task-system ${key} is invalid`);
  }
  return state;
}

async function readStateFile(path: string): Promise<TaskSystemState> {
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error("task-system state target is not a regular file");
    if (info.size > 4 * 1024 * 1024) throw new Error("task-system state is too large");
    return validateState(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
}

async function atomicWrite(path: string, state: TaskSystemState) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

function eventKeyOf(event: JsonRecord, ctx: JsonRecord, prompt: string): string {
  const providerId = [event.messageId, event.updateId, event.eventId, ctx.runId].find((value) => typeof value === "string" && value.trim()) as string | undefined;
  const route = [event.channelId ?? ctx.channelId ?? ctx.channel, event.accountId, event.senderId ?? ctx.senderId].map((value) => String(value ?? "-")).join(":");
  if (providerId) return `${route}:${providerId}`;
  const bucket = Math.floor(Date.now() / 30_000);
  return `${route}:weak:${bucket}:${sha256(prompt).slice(0, 20)}`;
}

function currentInbox(state: TaskSystemState, sessionKey: string, id?: unknown): InboxRecord {
  const requested = typeof id === "string" && id.trim() ? state.inbox.find((item) => item.id === id.trim()) : undefined;
  const found = requested ?? [...state.inbox].reverse().find((item) => item.sessionKey === sessionKey);
  if (!found) throw new Error("本轮任务尚未登记，请稍后重试");
  return found;
}

function publicInbox(record: InboxRecord) {
  return {
    status: record.status,
    profile: record.profile,
    goal: record.goal,
    modules: record.expectedModules.map((item) => ({ label: MODULE_LABELS[item.module], status: item.status })),
    hasFormalFlow: Boolean(record.flowId),
    workItems: record.cardIds.length,
    error: record.error
  };
}

export default definePluginEntry({
  id: "task-system-control",
  name: "Task System Control",
  description: "Deterministic owner Telegram intake and task lifecycle control.",
  register(api) {
    const cfg = (api.pluginConfig ?? {}) as JsonRecord;
    const statePathRaw = typeof cfg.statePath === "string" && cfg.statePath.trim()
      ? cfg.statePath.trim()
      : join(process.env.HOME ?? process.cwd(), ".openclaw", "task-system-control", "state.json");
    const statePath = isAbsolute(statePathRaw) ? statePathRaw : resolve(statePathRaw);
    const boardId = typeof cfg.boardId === "string" && cfg.boardId.trim() ? cfg.boardId.trim() : "task-system";
    const ownerTelegramId = typeof cfg.ownerTelegramId === "string" ? cfg.ownerTelegramId.trim() : "";
    const controllerSessionKey = typeof cfg.controllerSessionKey === "string" && cfg.controllerSessionKey.trim()
      ? cfg.controllerSessionKey.trim() : "agent:housekeeper:task-system";
    const gatewayTimeoutMs = Number.isInteger(cfg.gatewayTimeoutMs) ? Number(cfg.gatewayTimeoutMs) : 15_000;
    const configuredAgents = cfg.agents && typeof cfg.agents === "object" && !Array.isArray(cfg.agents) ? cfg.agents as JsonRecord : {};
    const accountByAgent = new Map<string, string>([
      ["housekeeper", typeof configuredAgents.housekeeper === "string" ? configuredAgents.housekeeper : "housekeeper"],
      ["ops", typeof configuredAgents.ops === "string" ? configuredAgents.ops : "default"],
      ["life", typeof configuredAgents.life === "string" ? configuredAgents.life : "life"]
    ]);
    const targetSessions = cfg.targetSessions && typeof cfg.targetSessions === "object" && !Array.isArray(cfg.targetSessions)
      ? cfg.targetSessions as JsonRecord : {};
    const turnInbox = new Map<string, string>();
    const turnKey = (ctx: JsonRecord, event?: JsonRecord) => {
      const runId = typeof event?.runId === "string" && event.runId ? event.runId
        : typeof ctx.runId === "string" && ctx.runId ? ctx.runId : "";
      if (runId) return `run:${runId}`;
      const sessionKey = typeof ctx.sessionKey === "string" ? ctx.sessionKey : "";
      return sessionKey ? `session:${sessionKey}` : "";
    };
    let mutationQueue = Promise.resolve();

    const withState = async <T>(mutate: (state: TaskSystemState) => T | Promise<T>): Promise<T> => {
      const operation = mutationQueue.then(async () => {
        const state = await readStateFile(statePath);
        const value = await mutate(state);
        state.revision += 1;
        state.updatedAt = new Date().toISOString();
        state.inbox = state.inbox.slice(-5000);
        state.handoffs = state.handoffs.slice(-5000);
        state.links = state.links.slice(-5000);
        state.outbox = state.outbox.slice(-5000);
        await atomicWrite(statePath, state);
        return value;
      });
      mutationQueue = operation.then(() => undefined, () => undefined);
      return operation;
    };

    const readState = async () => {
      await mutationQueue;
      return readStateFile(statePath);
    };

    const gateway = async <T = JsonRecord>(method: string, params: JsonRecord): Promise<T> => {
      if (!api.runtime.gateway.isAvailable()) throw new Error("Gateway 内部接口暂不可用，任务已保留等待恢复");
      return api.runtime.gateway.request<T>(method, params, { timeoutMs: gatewayTimeoutMs });
    };

    const flowFor = (requesterOrigin?: unknown) => api.runtime.tasks.flow.bindSession({
      sessionKey: controllerSessionKey,
      ...(requesterOrigin && typeof requesterOrigin === "object" ? { requesterOrigin: requesterOrigin as never } : {})
    });

    const findCardByIdempotency = async (key: string) => {
      const listed = await gateway<{ cards?: JsonRecord[] }>("workboard.cards.list", { boardId });
      return (listed.cards ?? []).find((card) => {
        const metadata = card.metadata && typeof card.metadata === "object" ? card.metadata as JsonRecord : {};
        const automation = metadata.automation && typeof metadata.automation === "object" ? metadata.automation as JsonRecord : {};
        return automation.idempotencyKey === key;
      });
    };

    const updateFlowFromLink = async (link: LinkRecord) => {
      if (!link.flowId) return;
      const flows = flowFor();
      const flow = flows.get(link.flowId);
      if (!flow || flow.syncMode !== "managed") return;
      const prior = flow.stateJson && typeof flow.stateJson === "object" && !Array.isArray(flow.stateJson) ? flow.stateJson as JsonRecord : {};
      const stateJson = {
        ...prior,
        schema: "task-system-parent/v1",
        externalWork: [{
          cardId: link.cardId,
          runId: link.runId ?? null,
          taskId: link.taskId ?? null,
          mirroredFlowId: link.mirroredFlowId ?? null,
          status: link.status,
          proofReceipt: link.proofReceipt ?? null
        }]
      };
      if (link.status === "succeeded" && link.proofReceipt) {
        flows.finish({ flowId: flow.flowId, expectedRevision: flow.revision, stateJson });
      } else if (link.status === "blocked") {
        flows.setWaiting({
          flowId: flow.flowId, expectedRevision: flow.revision, currentStep: "blocked", stateJson,
          blockedTaskId: link.taskId ?? null, blockedSummary: link.error ?? "执行未达到正式完成标准",
          waitJson: { kind: "external_work_blocked", cardId: link.cardId, reason: link.error ?? "missing completion receipt" }
        });
      } else if (link.status === "failed") {
        flows.fail({ flowId: flow.flowId, expectedRevision: flow.revision, stateJson, blockedSummary: link.error ?? "执行未达到正式完成标准" });
      } else {
        flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: "execution", stateJson });
      }
    };

    const reconcileLink = async (linkId: string) => {
      const snapshot = await readState();
      const link = snapshot.links.find((item) => item.id === linkId);
      if (!link) return;
      let card: JsonRecord | undefined;
      let task: JsonRecord | undefined;
      try {
        const runs = await gateway<{ card?: JsonRecord }>("workboard.cards.runs", { id: link.cardId });
        card = runs.card;
        const runId = typeof card?.runId === "string" ? card.runId : link.runId;
        const sessionKey = typeof card?.sessionKey === "string" ? card.sessionKey : link.childSessionKey;
        const tasks = await gateway<{ tasks?: JsonRecord[] }>("tasks.list", { agentId: link.assignee, limit: 200 });
        const matches = (tasks.tasks ?? []).filter((item) =>
          (runId && item.runId === runId) || (sessionKey && item.childSessionKey === sessionKey)
        );
        if (matches.length > 1) throw new Error("同一执行关联到多条任务账本，已停止自动收口");
        task = matches[0];
        const next = await withState((state) => {
          const current = state.links.find((item) => item.id === linkId);
          if (!current) return undefined;
          current.runId = runId;
          current.childSessionKey = sessionKey;
          current.taskId = typeof task?.taskId === "string" ? task.taskId : current.taskId;
          current.mirroredFlowId = typeof task?.parentFlowId === "string" ? task.parentFlowId : current.mirroredFlowId;
          const cardStatus = typeof card?.status === "string" ? card.status : "";
          const taskStatus = typeof task?.status === "string" ? task.status : "";
          if (cardStatus === "done" || taskStatus === "succeeded") current.status = current.proofReceipt ? "succeeded" : "blocked";
          else if (["failed", "timed_out", "cancelled", "lost"].includes(taskStatus)) current.status = "failed";
          else if (cardStatus === "blocked") current.status = "blocked";
          else if (runId) current.status = "running";
          if (current.status === "blocked" && !current.proofReceipt && (cardStatus === "done" || taskStatus === "succeeded")) {
            current.error = "执行已结束，但缺少正式完成收据，不能宣布成功";
          }
          current.updatedAt = new Date().toISOString();
          const inbox = state.inbox.find((item) => item.id === current.inboxId);
          if (inbox) {
            inbox.status = current.status === "succeeded" ? "completed" : current.status === "running" ? "running" : current.status === "card_ready" ? "linked" : current.status === "reconcile_required" ? "reconcile_required" : "blocked";
            inbox.error = current.error;
            inbox.updatedAt = current.updatedAt;
            inbox.revision += 1;
          }
          return structuredClone(current);
        });
        if (next) await updateFlowFromLink(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await withState((state) => {
          const current = state.links.find((item) => item.id === linkId);
          if (!current) return;
          current.status = "reconcile_required";
          current.error = message;
          current.updatedAt = new Date().toISOString();
        });
      }
    };

    const reconcileAll = async () => {
      const state = await readState();
      for (const link of state.links.filter((item) => ["card_ready", "running", "reconcile_required"].includes(item.status))) {
        await reconcileLink(link.id);
      }
    };

    api.on("message_received", async (event, ctx) => {
      const record = event as unknown as JsonRecord;
      const sessionKey = typeof ctx.sessionKey === "string" ? ctx.sessionKey : "";
      const messageId = typeof record.messageId === "string" ? record.messageId : undefined;
      if (!sessionKey || !messageId) return;
      await withState((state) => {
        const found = [...state.inbox].reverse().find((item) => item.sessionKey === sessionKey && !item.providerMessageId);
        if (found) {
          found.providerMessageId = messageId;
          found.updatedAt = new Date().toISOString();
          found.revision += 1;
        }
      }).catch((error) => api.logger.warn(`task-system advisory message link failed: ${String(error)}`));
    });

    api.on("before_agent_run", async (event, ctx) => {
      const agentId = typeof ctx.agentId === "string" ? ctx.agentId : "";
      const expectedAccount = accountByAgent.get(agentId);
      const channel = String(event.channelId ?? ctx.channelId ?? ctx.channel ?? "").toLowerCase();
      if (!expectedAccount || channel !== "telegram") return;
      if (event.accountId && event.accountId !== expectedAccount) return;
      if (event.senderIsOwner !== true || (ownerTelegramId && event.senderId !== ownerTelegramId)) return;
      const sessionKey = typeof ctx.sessionKey === "string" ? ctx.sessionKey : "";
      if (!sessionKey) return { outcome: "block" as const, reason: "missing_session", message: "这句话还没有取得可靠的会话位置，我先不冒险处理。请稍后重发一次，我会从原处继续。" };
      try {
        const prompt = String(event.prompt ?? "");
        const key = eventKeyOf(event as unknown as JsonRecord, ctx as unknown as JsonRecord, prompt);
        const inbox = await withState((state) => {
          const existing = state.inbox.find((item) => item.eventKey === key);
          if (existing) return existing;
          const now = new Date().toISOString();
          const profile = classifyWorkflow(prompt);
          const created: InboxRecord = {
            id: `inbox-${randomUUID()}`, eventKey: key, agentId, accountId: event.accountId,
            channelId: channel, senderId: String(event.senderId), sessionKey,
            runId: typeof ctx.runId === "string" ? ctx.runId : undefined,
            promptHash: sha256(prompt), profile,
            status: profile === "conversation" ? "not_applicable" : "registered",
            cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now
          };
          state.inbox.push(created);
          return created;
        });
        const turnMapKey = turnKey(ctx as unknown as JsonRecord, event as unknown as JsonRecord);
        if (turnMapKey) turnInbox.set(turnMapKey, inbox.id);
      } catch (error) {
        api.logger.error(`task-system intake failed: ${error instanceof Error ? error.message : String(error)}`);
        return {
          outcome: "block" as const,
          reason: "durable_intake_failed",
          message: agentId === "life"
            ? "少主，这句话我还没能稳妥记入玉简，若现在继续可能会漏掉安排。我先停在这里，请稍后重发一次。"
            : agentId === "ops"
              ? "少主，这项交代尚未可靠入账，继续执行可能出现重复或遗漏。我先不动生产内容，请稍后重发一次。"
              : "少主，这项交代尚未可靠入账，我先不让它在门下失散。请稍后重发一次。"
        };
      }
    });

    api.on("agent_turn_prepare", async (_event, ctx) => {
      const id = turnInbox.get(turnKey(ctx as unknown as JsonRecord));
      if (!id) return;
      const state = await readState();
      const inbox = state.inbox.find((item) => item.id === id);
      if (!inbox || inbox.profile === "conversation") return;
      return {
        appendContext: `[任务入口已可靠登记：${inbox.id}] 这是内部控制信息，不得向少主复述编号或工程字段。你必须先调用 task_intake 的 triage；若是晨报模块输入，再调用 task_module expect，随后使用对应专用工具，只有成功收据后才能说已录入。跨轮正式任务必须调用 task_intake start，不得只靠文字承诺。当前建议流程：${inbox.profile}。`
      };
    });

    api.on("before_agent_finalize", async (event, ctx) => {
      const id = turnInbox.get(turnKey(ctx as unknown as JsonRecord, event as unknown as JsonRecord));
      if (!id) return;
      const state = await readState();
      const inbox = state.inbox.find((item) => item.id === id);
      if (!inbox || inbox.profile === "conversation") return;
      const finalText = String(event.lastAssistantMessage ?? "");
      if (/\b(?:CWD|UUID|Host|Card|Task)\b|approval card|审批卡片|sessionKey|runId|flowId/iu.test(finalText)) {
        return { action: "revise" as const, reason: "internal_language_leak", retry: { instruction: "重写最终回复：保持角色口吻，把目标、结果、影响和下一步讲清楚，但删除所有工程字段、英文控制词和工业卡片语言。", idempotencyKey: `task-language:${inbox.id}`, maxAttempts: 1 } };
      }
      if (inbox.status === "registered") {
        return { action: "revise" as const, reason: "task_not_triaged", retry: { instruction: `本轮任务尚未按持久入口分流。立即调用 task_intake triage，内部编号为 ${inbox.id}；按工具结果继续，不要向少主展示编号。`, idempotencyKey: `task-triage:${inbox.id}`, maxAttempts: 1 } };
      }
      if (inbox.profile === "direct_module" && inbox.expectedModules.some((item) => item.status !== "applied")) {
        return { action: "revise" as const, reason: "module_receipt_missing", retry: { instruction: "晨报模块尚无成功应用收据。请使用对应专用工具完成写入并回读；若条件不足，清楚说明缺什么，不得说已经录入。", idempotencyKey: `task-module:${inbox.id}`, maxAttempts: 1 } };
      }
    });

    api.on("agent_end", (event, ctx) => {
      const key = turnKey(ctx as unknown as JsonRecord, event as unknown as JsonRecord);
      if (key) turnInbox.delete(key);
    });

    api.on("after_tool_call", async (event, ctx) => {
      const sessionKey = typeof ctx.sessionKey === "string" ? ctx.sessionKey : "";
      const resultDetails = detailsOf(event.result);
      const success = !event.error && resultDetails?.ok !== false;
      if (event.toolName === "morning_brief_control" && success) {
        const modules = inferModules(event.toolName, event.params, event.result);
        const receiptHash = sha256(JSON.stringify({ tool: event.toolName, params: event.params, result: resultDetails }));
        await withState((state) => {
          const inbox = [...state.inbox].reverse().find((item) => item.sessionKey === sessionKey);
          if (inbox) {
            const now = new Date().toISOString();
            for (const module of modules) {
              const expectation = inbox.expectedModules.find((item) => item.module === module && item.status === "expected");
              if (expectation) Object.assign(expectation, { status: "applied", toolCallId: event.toolCallId, receiptHash, updatedAt: now });
              else inbox.expectedModules.push({ module, action: String(event.params.action ?? "write"), status: "applied", toolName: event.toolName, toolCallId: event.toolCallId, receiptHash, updatedAt: now });
            }
            if (modules.length) inbox.status = "applied";
            inbox.updatedAt = now;
            inbox.revision += 1;
          }
          const handoff = [...state.handoffs].reverse().find((item) => item.targetSessionKey === sessionKey && ["accepted", "applying"].includes(item.status) && (!item.expectedTool || item.expectedTool === event.toolName));
          if (handoff) {
            handoff.status = "applied";
            handoff.receiptHash = receiptHash;
            handoff.updatedAt = new Date().toISOString();
          }
        });
      }
      if (["workboard_complete", "workboard_proof"].includes(event.toolName) && success) {
        const cardId = [event.params.card_id, event.params.cardId, event.params.id].find((value) => typeof value === "string") as string | undefined;
        const receiptHash = sha256(JSON.stringify({ tool: event.toolName, params: event.params, result: resultDetails }));
        let linkId: string | undefined;
        await withState((state) => {
          const link = cardId ? state.links.find((item) => item.cardId === cardId) : state.links.find((item) => item.childSessionKey === sessionKey);
          if (link) {
            link.proofReceipt = receiptHash;
            link.lastActivityAt = new Date().toISOString();
            link.updatedAt = link.lastActivityAt;
            linkId = link.id;
          }
        });
        if (linkId) await reconcileLink(linkId);
      } else if (sessionKey) {
        await withState((state) => {
          const link = state.links.find((item) => item.childSessionKey === sessionKey);
          if (link) link.lastActivityAt = link.updatedAt = new Date().toISOString();
        }).catch(() => undefined);
      }
    });

    api.on("subagent_spawned", async (event) => {
      const childSessionKey = String(event.childSessionKey ?? "");
      if (!childSessionKey) return;
      await withState((state) => {
        const link = state.links.find((item) => childSessionKey.includes(item.cardId));
        if (!link) return;
        link.childSessionKey = childSessionKey;
        link.runId = typeof event.runId === "string" ? event.runId : link.runId;
        link.status = "running";
        link.lastActivityAt = link.updatedAt = new Date().toISOString();
      });
    });

    api.on("subagent_ended", async (event) => {
      const runId = typeof event.runId === "string" ? event.runId : undefined;
      const targetSessionKey = String(event.targetSessionKey ?? "");
      let linkId: string | undefined;
      let terminalLink: LinkRecord | undefined;
      await withState((state) => {
        const link = state.links.find((item) => (runId && item.runId === runId) || (targetSessionKey && item.childSessionKey === targetSessionKey));
        if (!link) return;
        link.workerOutcome = event.outcome ?? event.reason;
        link.error = event.error;
        link.updatedAt = new Date(event.endedAt ?? Date.now()).toISOString();
        if (event.outcome && event.outcome !== "ok") link.status = "failed";
        else if (!link.proofReceipt) {
          link.status = "blocked";
          link.error = "执行已结束，但没有正式完成收据";
        }
        linkId = link.id;
        if (["failed", "blocked"].includes(link.status)) terminalLink = structuredClone(link);
      });
      if (terminalLink) {
        const closed = terminalLink;
        try {
          await gateway("workboard.cards.update", {
            id: closed.cardId,
            patch: { status: "blocked", execution: null }
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await withState((state) => {
            const current = state.links.find((item) => item.id === closed.id);
            if (current) current.error = `${current.error ?? "执行阻塞"}；Workboard 收口待恢复：${message}`;
          });
        }
        const latest = (await readState()).links.find((item) => item.id === closed.id);
        if (latest) await updateFlowFromLink(latest);
      } else if (linkId) await reconcileLink(linkId);
    });

    api.on("message_sent", async (event) => {
      if (!event.sessionKey) return;
      const contentHash = sha256(String(event.content ?? ""));
      await withState((state) => {
        const pending = [...state.outbox].reverse().find((item) => item.sessionKey === event.sessionKey && item.contentHash === contentHash && item.status === "pending");
        if (!pending) return;
        pending.updatedAt = new Date().toISOString();
        if (event.success && event.messageId) {
          pending.status = "sent";
          pending.messageId = event.messageId;
        } else if (event.success) pending.status = "unknown";
        else {
          pending.status = "failed";
          pending.error = event.error ?? "Telegram 未确认送达";
        }
      });
    });

    api.registerTool((ctx) => {
      const agentId = typeof ctx.agentId === "string" ? ctx.agentId : "";
      const sessionKey = typeof ctx.sessionKey === "string" ? ctx.sessionKey : "";
      if (!accountByAgent.has(agentId) || !sessionKey) return null;
      return {
        name: "task_intake",
        label: "任务总入口",
        description: "持久分流并启动正式任务。收到少主可执行交代时先 triage；跨轮任务再 start。不得只在角色记忆中记任务。",
        parameters: IntakeSchema,
        async execute(_id: string, raw: unknown) {
          const p = raw as JsonRecord;
          try {
            const action = requiredText(p.action, "action", 64);
            if (action === "list") {
              const state = await readState();
              return toolResult({ ok: true, items: state.inbox.filter((item) => item.agentId === agentId).slice(-20).map(publicInbox) });
            }
            if (action === "inspect") {
              const state = await readState();
              return toolResult({ ok: true, item: publicInbox(currentInbox(state, sessionKey, p.inbox_id)) });
            }
            if (action === "triage") {
              const updated = await withState((state) => {
                const inbox = currentInbox(state, sessionKey, p.inbox_id);
                const profile = typeof p.profile === "string" && PROFILE_VALUES.includes(p.profile as WorkflowProfile) ? p.profile as WorkflowProfile : inbox.profile;
                inbox.profile = profile;
                inbox.goal = typeof p.goal === "string" ? requiredText(p.goal, "goal") : inbox.goal;
                inbox.status = profile === "conversation" ? "not_applicable" : "triaged";
                inbox.updatedAt = new Date().toISOString(); inbox.revision += 1;
                return structuredClone(inbox);
              });
              return toolResult({ ok: true, disposition: publicInbox(updated), next: updated.profile === "direct_module" ? "登记模块并调用专用录入工具" : updated.profile === "conversation" ? "直接回答" : "短任务可当轮完成；跨轮任务调用 start" });
            }
            if (action === "block") {
              const reason = requiredText(p.reason, "reason", 2000);
              const updated = await withState((state) => {
                const inbox = currentInbox(state, sessionKey, p.inbox_id);
                inbox.status = "blocked"; inbox.error = reason; inbox.updatedAt = new Date().toISOString(); inbox.revision += 1;
                return structuredClone(inbox);
              });
              return toolResult({ ok: true, blocked: true, item: publicInbox(updated) });
            }
            if (action === "queue_notification") {
              const hash = requiredText(p.content_hash, "content_hash", 64).toLowerCase();
              const eventKey = requiredText(p.event_key, "event_key", 240);
              const queued = await withState((state) => {
                const existing = state.outbox.find((item) => item.eventKey === eventKey && item.sessionKey === sessionKey);
                if (existing) return existing;
                const now = new Date().toISOString();
                const created: OutboxRecord = { id: `outbox-${randomUUID()}`, eventKey, sessionKey, contentHash: hash, status: "pending", createdAt: now, updatedAt: now };
                state.outbox.push(created); return created;
              });
              return toolResult({ ok: true, delivery: queued.status, acknowledged: queued.status === "sent" });
            }
            if (action === "reconcile") {
              const state = await readState();
              const inbox = currentInbox(state, sessionKey, p.inbox_id);
              for (const link of state.links.filter((item) => item.inboxId === inbox.id)) await reconcileLink(link.id);
              const latest = currentInbox(await readState(), sessionKey, inbox.id);
              return toolResult({ ok: true, item: publicInbox(latest) });
            }
            if (action !== "start") throw new Error(`unsupported action: ${action}`);
            const title = requiredText(p.title, "title", 240);
            const goal = requiredText(p.goal, "goal", 4000);
            const assignee = requiredText(p.assignee, "assignee", 80);
            const criteria = Array.isArray(p.completion_criteria) ? p.completion_criteria.map((value) => requiredText(value, "completion_criteria", 1000)) : [];
            if (!criteria.length) throw new Error("completion_criteria is required");
            const start = await withState((state) => {
              const inbox = currentInbox(state, sessionKey, p.inbox_id);
              if (inbox.status === "completed") return { inbox: structuredClone(inbox), existing: true };
              if (inbox.profile === "direct_module" || inbox.profile === "conversation") throw new Error("该交代不应建立正式工作卡，请按当前分流执行");
              inbox.goal = goal; inbox.status = "starting"; inbox.updatedAt = new Date().toISOString(); inbox.revision += 1;
              return { inbox: structuredClone(inbox), existing: false };
            });
            if (start.existing) return toolResult({ ok: true, idempotent: true, item: publicInbox(start.inbox) });
            let flowId = start.inbox.flowId;
            const needsFlow = p.cross_turn === true || ["governed_change", "research_plan_triple_review"].includes(start.inbox.profile);
            if (needsFlow && !flowId) {
              const flows = flowFor(ctx.deliveryContext);
              const flow = flows.createManaged({
                controllerId: "task-system-control/v1", goal, status: "running", currentStep: "execution", notifyPolicy: "silent",
                stateJson: { schema: "task-system-parent/v1", workflowProfile: start.inbox.profile, sourceInboxId: start.inbox.id, acceptanceCriteria: criteria, externalWork: [] }
              });
              flowId = flow.flowId;
              await withState((state) => {
                const inbox = state.inbox.find((item) => item.id === start.inbox.id)!;
                inbox.flowId = flowId; inbox.updatedAt = new Date().toISOString(); inbox.revision += 1;
              });
            }
            const idempotencyKey = `task-system:${start.inbox.id}:${sha256(`${title}|${goal}`).slice(0, 24)}`;
            let card = await findCardByIdempotency(idempotencyKey);
            if (!card) {
              card = (await gateway<{ card: JsonRecord }>("workboard.cards.create", {
                boardId, tenant: boardId, title, status: "ready", priority: typeof p.priority === "string" ? p.priority : "normal",
                agentId: assignee, idempotencyKey, maxRetries: 1, maxRuntimeSeconds: 10_800,
                labels: ["task-system-v1", start.inbox.profile],
                notes: JSON.stringify({ schema: "task-system-work/v1", objective: goal, completionCriteria: criteria, source: { agentId, accountId: ctx.agentAccountId, authenticatedOwner: ctx.senderIsOwner === true }, inboxId: start.inbox.id, parentFlowId: flowId })
              })).card;
            }
            const cardId = requiredText(card.id, "card.id", 100);
            const link = await withState((state) => {
              const existing = state.links.find((item) => item.cardId === cardId);
              if (existing) return existing;
              const now = new Date().toISOString();
              const created: LinkRecord = { id: `link-${randomUUID()}`, inboxId: start.inbox.id, flowId, cardId, boardId, assignee, status: "card_ready", createdAt: now, updatedAt: now };
              state.links.push(created);
              const inbox = state.inbox.find((item) => item.id === start.inbox.id)!;
              if (!inbox.cardIds.includes(cardId)) inbox.cardIds.push(cardId);
              inbox.status = "linked"; inbox.updatedAt = now; inbox.revision += 1;
              return structuredClone(created);
            });
            try {
              const dispatch = await gateway<JsonRecord>("workboard.cards.dispatch", { boardId });
              const started = Array.isArray(dispatch.started) ? dispatch.started.find((item) => (item as JsonRecord).cardId === cardId) as JsonRecord | undefined : undefined;
              if (started) {
                await withState((state) => {
                  const current = state.links.find((item) => item.id === link.id)!;
                  current.runId = typeof started.runId === "string" ? started.runId : current.runId;
                  current.childSessionKey = typeof started.sessionKey === "string" ? started.sessionKey : current.childSessionKey;
                  current.status = "running"; current.updatedAt = current.lastActivityAt = new Date().toISOString();
                });
              }
            } catch (error) {
              await withState((state) => {
                const current = state.links.find((item) => item.id === link.id)!;
                current.status = "reconcile_required"; current.error = error instanceof Error ? error.message : String(error); current.updatedAt = new Date().toISOString();
              });
            }
            await reconcileLink(link.id);
            const latest = currentInbox(await readState(), sessionKey, start.inbox.id);
            return toolResult({ ok: true, started: true, item: publicInbox(latest), message: "正式任务已持久登记；只有真实执行账本和完成收据同时成立，才会回报完成。" });
          } catch (error) {
            return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        }
      };
    }, { name: "task_intake", optional: true });

    api.registerTool((ctx) => {
      const sourceAgentId = typeof ctx.agentId === "string" ? ctx.agentId : "";
      const sourceSessionKey = typeof ctx.sessionKey === "string" ? ctx.sessionKey : "";
      if (!accountByAgent.has(sourceAgentId) || !sourceSessionKey) return null;
      return {
        name: "task_handoff",
        label: "门下事务转交",
        description: "賈南風持久转交信息或任务；目标角色必须 accept，并由对应专用工具留下应用收据才算完成。",
        parameters: HandoffSchema,
        async execute(_id: string, raw: unknown) {
          const p = raw as JsonRecord;
          try {
            const action = requiredText(p.action, "action", 32);
            if (action === "status") {
              const id = requiredText(p.handoff_id, "handoff_id", 100);
              const handoff = (await readState()).handoffs.find((item) => item.id === id || item.dedupeKey === id);
              if (!handoff) throw new Error("未找到这项转交");
              return toolResult({ ok: true, status: handoff.status, applied: handoff.status === "applied", error: handoff.error });
            }
            if (action === "cancel") {
              const id = requiredText(p.handoff_id, "handoff_id", 100);
              const handoff = await withState((state) => {
                const found = state.handoffs.find((item) => item.id === id || item.dedupeKey === id);
                if (!found) throw new Error("未找到这项转交");
                if (found.status === "applied") throw new Error("这项转交已经应用，需修改原记录而不是取消转交");
                found.status = "cancelled"; found.updatedAt = new Date().toISOString(); return structuredClone(found);
              });
              return toolResult({ ok: true, cancelled: true, status: handoff.status });
            }
            if (action === "accept") {
              const id = requiredText(p.handoff_id, "handoff_id", 100);
              const handoff = await withState((state) => {
                const found = state.handoffs.find((item) => item.id === id);
                if (!found) throw new Error("未找到这项转交");
                if (found.targetAgentId !== sourceAgentId || found.targetSessionKey !== sourceSessionKey) throw new Error("这项转交不属于当前角色或会话");
                if (found.status === "applied") return structuredClone(found);
                if (["cancelled", "blocked"].includes(found.status)) throw new Error("这项转交当前不能接收");
                found.status = "accepted"; found.updatedAt = new Date().toISOString(); return structuredClone(found);
              });
              return toolResult({ ok: true, accepted: true, capability: handoff.capability, payload: handoff.payload, next: handoff.expectedTool ? `请用 ${handoff.expectedTool} 完成写入，成功工具收据后才回报已录入` : "按能力目录执行，并留下正式完成收据" });
            }
            if (action !== "submit") throw new Error(`unsupported action: ${action}`);
            if (sourceAgentId !== "housekeeper") throw new Error("只有賈南風可以发起跨角色正式转交");
            const targetAgentId = requiredText(p.target_agent, "target_agent", 80);
            if (!accountByAgent.has(targetAgentId) || targetAgentId === "housekeeper") throw new Error("目标角色不在受控转交目录中");
            const targetSessionKey = typeof targetSessions[targetAgentId] === "string" ? String(targetSessions[targetAgentId]) : "";
            if (!targetSessionKey) throw new Error("目标角色尚未配置固定接收会话");
            const capability = requiredText(p.capability, "capability", 160);
            const payload = p.payload && typeof p.payload === "object" && !Array.isArray(p.payload) ? p.payload as JsonRecord : {};
            const dedupeKey = typeof p.dedupe_key === "string" && p.dedupe_key.trim() ? p.dedupe_key.trim() : sha256(`${sourceSessionKey}|${targetAgentId}|${capability}|${JSON.stringify(payload)}`).slice(0, 40);
            const handoff = await withState((state) => {
              const existing = state.handoffs.find((item) => item.dedupeKey === dedupeKey);
              if (existing) return structuredClone(existing);
              const now = new Date().toISOString();
              const created: HandoffRecord = {
                id: `handoff-${randomUUID()}`, dedupeKey, sourceAgentId, sourceSessionKey, targetAgentId, targetSessionKey,
                capability, payload, status: "pending", expectedTool: typeof p.expected_tool === "string" ? p.expected_tool.trim() : undefined,
                createdAt: now, updatedAt: now
              };
              state.handoffs.push(created); return structuredClone(created);
            });
            if (handoff.status === "applied") return toolResult({ ok: true, applied: true, status: handoff.status });
            const started = await api.runtime.subagent.run({
              sessionKey: targetSessionKey,
              message: `[正式事务转交]\n请调用 task_handoff 的 accept 接收内部转交 ${handoff.id}，按返回的能力和数据使用专用工具完成；未取得成功收据不得说已完成。不要向少主展示内部编号。`,
              lightContext: false, deliver: false, idempotencyKey: `task-handoff:${handoff.id}`, lane: `task-handoff:${targetAgentId}`
            });
            await withState((state) => {
              const current = state.handoffs.find((item) => item.id === handoff.id)!;
              current.runId = started.runId; current.status = "applying"; current.updatedAt = new Date().toISOString();
            });
            return toolResult({ ok: true, submitted: true, applied: false, status: "applying", message: "转交已可靠保存并送往目标角色；收到应用收据前不会声称完成。" });
          } catch (error) {
            return toolResult({ ok: false, applied: false, error: error instanceof Error ? error.message : String(error) });
          }
        }
      };
    }, { name: "task_handoff", optional: true });

    api.registerTool((ctx) => {
      const sessionKey = typeof ctx.sessionKey === "string" ? ctx.sessionKey : "";
      if (!ctx.agentId || !accountByAgent.has(ctx.agentId) || !sessionKey) return null;
      return {
        name: "task_module",
        label: "晨间玉简模块登记",
        description: "列出八个晨报模块，登记本轮预期写入；实际写入必须调用 morning_brief_control，不能由本工具伪造。",
        parameters: ModuleSchema,
        async execute(_id: string, raw: unknown) {
          const p = raw as JsonRecord;
          try {
            const action = requiredText(p.action, "action", 32);
            if (action === "catalog") return toolResult({ ok: true, modules: MODULE_VALUES.map((module) => ({ label: MODULE_LABELS[module], module, writeTool: "morning_brief_control" })), rule: "八个模块都由蕭觀音的同一权威数据源录入；賈南風只能走持久转交。" });
            if (action === "inspect") {
              const state = await readState();
              return toolResult({ ok: true, modules: currentInbox(state, sessionKey, p.inbox_id).expectedModules.map((item) => ({ label: MODULE_LABELS[item.module], status: item.status })) });
            }
            if (action !== "expect") throw new Error(`unsupported action: ${action}`);
            const module = requiredText(p.module, "module", 32) as ModuleName;
            if (!MODULE_VALUES.includes(module)) throw new Error("该栏目不在晨间玉简八模块目录中");
            const controlAction = requiredText(p.control_action, "control_action", 100);
            const updated = await withState((state) => {
              const inbox = currentInbox(state, sessionKey, p.inbox_id);
              const now = new Date().toISOString();
              const existing = inbox.expectedModules.find((item) => item.module === module && item.action === controlAction);
              if (existing) {
                existing.status = "expected"; existing.updatedAt = now;
              } else inbox.expectedModules.push({ module, action: controlAction, status: "expected", toolName: "morning_brief_control", updatedAt: now });
              inbox.profile = "direct_module"; inbox.status = "triaged"; inbox.updatedAt = now; inbox.revision += 1;
              return structuredClone(inbox);
            });
            return toolResult({ ok: true, expected: MODULE_LABELS[module], applied: false, next: `现在调用 morning_brief_control 的 ${controlAction}，只有成功工具收据后才算录入`, item: publicInbox(updated) });
          } catch (error) {
            return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        }
      };
    }, { name: "task_module", optional: true });

    api.on("gateway_start", () => {
      void reconcileAll().catch((error) => api.logger.error(`task-system startup reconcile failed: ${error instanceof Error ? error.message : String(error)}`));
      api.logger.info("task-system-control started without polling");
    });
  }
});
