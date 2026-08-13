import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";

type JsonRecord = Record<string, unknown>;
type Review = {
  reviewNumber: 1 | 2 | 3;
  scope: "independent_complete";
  planHash: string;
  evidenceHash: string;
  reviewNonce: string;
  reviewedAt: string;
};
type WorkflowProfile = "simple_task" | "governed_change" | "research_plan_triple_review";
type LinkedWork = {
  cardId: string;
  runId?: string;
  taskId?: string;
  mirroredFlowId?: string;
  status: "ready" | "running" | "succeeded" | "failed" | "blocked";
  proofReceipt?: string;
  updatedAt: string;
};
type GovernanceState = {
  schema: "workflow-governance/v2";
  workflowProfile: WorkflowProfile;
  planHash?: string;
  acceptanceCriteria: string[];
  reviews: Review[];
  linkedWork: LinkedWork[];
  stage: string;
  acceptanceEvidence?: string[];
  unfixableItems?: string[];
  notification?: { eventKey: string; messageId?: string; acknowledgedAt?: string };
};
type ReviewEntry = {
  reviewNumber: 1 | 2 | 3;
  sessionKey: string;
  reviewRunId: string;
  verdict: "approve" | "block";
  reason: string;
  findings: string[];
  reviewedAt: string;
};
type RiskNotification = {
  bodySummary: string;
  messageId: string;
  sentAt: string;
};
type RiskRecord = {
  fingerprint: string;
  level: "medium" | "high";
  agentId: string;
  sessionKey: string;
  planId?: string;
  packetId?: string;
  workUnitId?: string;
  cardId?: string;
  ownerRoute?: string;
  status: "preflight_required" | "reviewing" | "review_blocked" | "notified" | "approved" | "declined" | "executing" | "completed" | "execution_failed" | "pending_decision";
  goal: string;
  impact: string;
  worstCase: string;
  rollback: string;
  alternative: string;
  preflight?: { scope: string; backup: string; rollback: string };
  reviewRunId?: string;
  reviews?: ReviewEntry[];
  notification?: RiskNotification;
  toolCallId?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
type RiskState = {
  schema: "workflow-risk/v2";
  revision: number;
  updatedAt: string;
  records: RiskRecord[];
};

const HASH = /^[a-f0-9]{64}$/i;
const ParamsSchema = Type.Object({
  action: Type.Union([
    Type.Literal("create"), Type.Literal("list"), Type.Literal("inspect"),
    Type.Literal("set_plan"), Type.Literal("record_review"),
    Type.Literal("begin_execution"), Type.Literal("set_stage"),
    Type.Literal("link_work"), Type.Literal("record_preflight"), Type.Literal("risk_status"),
    Type.Literal("ready_to_notify"), Type.Literal("acknowledge_notification"),
    Type.Literal("block"), Type.Literal("review_high_risk")
  ]),
  flow_id: Type.Optional(Type.String({ minLength: 1 })),
  goal: Type.Optional(Type.String({ minLength: 1, maxLength: 4000 })),
  workflow_profile: Type.Optional(Type.Union([
    Type.Literal("simple_task"), Type.Literal("governed_change"), Type.Literal("research_plan_triple_review")
  ])),
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
  card_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  run_id: Type.Optional(Type.String({ minLength: 1, maxLength: 240 })),
  task_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  mirrored_flow_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  work_status: Type.Optional(Type.Union([
    Type.Literal("ready"), Type.Literal("running"), Type.Literal("succeeded"), Type.Literal("failed"), Type.Literal("blocked")
  ])),
  proof_receipt: Type.Optional(Type.String({ pattern: "^[A-Fa-f0-9]{64}$" })),
  notification_message_id: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  blocked_reason: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
  action_fingerprint: Type.Optional(Type.String({ pattern: "^[A-Fa-f0-9]{64}$" })),
  scope_summary: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
  backup_summary: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
  rollback_summary: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 }))
}, { additionalProperties: false });

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], details: value };
}
function text(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}
function stateOf(flow: any): GovernanceState {
  const state = flow?.stateJson as GovernanceState | undefined;
  if (!state || state.schema !== "workflow-governance/v2" || !Array.isArray(state.reviews) || !Array.isArray(state.linkedWork)) {
    throw new Error("flow is not governed by workflow-governance/v2");
  }
  return structuredClone(state);
}
function requireApplied(mutation: any) {
  if (!mutation?.applied) throw new Error(`Task Flow mutation failed: ${mutation?.code ?? "unknown"}`);
  return mutation.flow;
}
export function riskDecision(command: string) {
  const rules: Array<[RegExp, string, string, string, string]> = [
    [/\b(rm\s+-rf|remove-item\b.*-recurse|mkfs|format\s+[a-z]:|dd\b.*\bof=)\b/i, "删除或覆写重要资料", "最坏可能造成不可恢复的数据丢失", "先确认精确目标并保留可核验备份，失败时从备份恢复", "先改为只读核对，或把删除范围缩到一个可恢复的明确对象"],
    [/\b(reboot|shutdown|openclaw\s+gateway\s+(?:stop|restart))\b/i, "停止或重启整个 OpenClaw 消息入口", "会短暂中断 Telegram 与正在进行的任务", "先保留当前状态，如果启动失败就恢复原配置并重启原服务", "先完成无需重启的检查，等没有活动任务时再处理"],
    [/\b(funnel|public\s+exposure|firewall.*allow|(?:bind|listen|host).{0,40}0\.0\.0\.0)\b/i, "把服务开放到公共网络", "可能扩大未授权访问和攻击面", "保留原有内网路径，异常时立即关闭公开入口", "继续使用现有内网或已认证的私有通道"],
    [/\b(git\s+push\b.*--force|git\s+reset\s+--hard|chmod\s+777|disable.*auth)\b/i, "改动认证、权限或不可回退的版本历史", "最坏可能导致访问边界失效或有效历史被覆盖", "先保留当前配置或引用，失败时恢复原值", "使用普通推送、最小权限或可回退的增量修改"],
    [/(?:(?:config\s+(?:set|patch)|channels?\s+add|agents?\s+bind|set-content|sed\s+-i|tee\b).{0,240}\b(?:token|credential|password|auth)\b|\b(?:token|credential|password|auth)\b.{0,240}(?:config\s+(?:set|patch)|channels?\s+add|agents?\s+bind|set-content|sed\s+-i|tee\b))/i, "改动认证或凭据配置", "最坏可能导致合法会话无法访问，或把权限交给错误对象", "先备份脱敏配置并保留原凭据引用，异常时恢复原值", "保持现有认证边界，只先完成无需改凭据的部分"],
  ];
  const match = rules.find(([pattern]) => pattern.test(command));
  if (!match) return undefined;
  return { goal: match[1], impact: "会改变正在运行的系统或重要资料", worstCase: match[2], rollback: match[3], alternative: match[4] };
}
export function highRiskBlockReason(command: string): string | undefined {
  const decision = riskDecision(command);
  if (!decision) return undefined;
  return `这一步属于高风险操作，魚玄機尚未执行。准备做的是${decision.goal}；直接影响是${decision.impact}；最坏情况是${decision.worstCase}。回退办法：${decision.rollback}。请魚玄機提交准确范围、已核验备份和可执行回退办法，调用 workflow_governance 的 review_high_risk 启动三审和事前告知；不得弹出原生审批卡。`;
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as JsonRecord).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
export function actionFingerprint(toolName: string, params: JsonRecord): string {
  return createHash("sha256").update(stableJson({ toolName, params }), "utf8").digest("hex");
}
function mediumRisk(command: string) {
  if (!/\b(git\s+(commit|merge|rebase|push)|npm\s+(install|update)|pnpm\s+(install|update)|cp\b|copy-item\b|move-item\b|mv\b|write|config\s+(set|patch)|cron\s+(add|update|remove)|plugins?\s+(install|enable|disable)|systemctl\s+restart|chmod\b|chown\b)\b/i.test(command)) return undefined;
  return {
    goal: "执行一项限定范围、可回滚的系统变更",
    impact: "会修改文件、配置、依赖或版本状态",
    worstCase: "范围判断错误时可能让相关功能暂时不可用",
    rollback: "先保存原值或备份，失败时恢复并复核",
    alternative: "先做只读核对，或把变更缩小到一个明确对象"
  };
}
function emptyRiskState(): RiskState {
  return { schema: "workflow-risk/v2", revision: 0, updatedAt: new Date(0).toISOString(), records: [] };
}
async function readRiskState(path: string): Promise<RiskState> {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > 1024 * 1024) throw new Error("risk state target is invalid");
    const raw = JSON.parse(await readFile(path, "utf8")) as RiskState;
    if (!['workflow-risk/v1', 'workflow-risk/v2'].includes(String(raw.schema)) || !Array.isArray(raw.records)) throw new Error("risk state schema is invalid");
    return {
      schema: "workflow-risk/v2",
      revision: Number.isInteger(raw.revision) ? Number(raw.revision) : 0,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
      records: raw.records as RiskRecord[]
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyRiskState();
    throw error;
  }
}
async function writeRiskState(path: string, state: RiskState) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}
async function findWorkContext(path: string, sessionKey: string) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > 16 * 1024 * 1024) return undefined;
    const state = JSON.parse(await readFile(path, "utf8"));
    const links = Array.isArray(state.links) ? state.links : [];
    const link = [...links].reverse().find((item: any) => item.childSessionKey === sessionKey);
    if (!link || typeof link.planId !== "string" || typeof link.packetId !== "string" || typeof link.workUnitId !== "string" || typeof link.cardId !== "string") return undefined;
    return { planId: link.planId, packetId: link.packetId, workUnitId: link.workUnitId, cardId: link.cardId, agentId: typeof link.assignee === "string" ? link.assignee : "" };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
function providerOf(ctx: any): string {
  const provider = [ctx.messageProvider, ctx.channel].find((value) => typeof value === "string" && ["telegram", "discord", "slack", "whatsapp", "signal", "imessage"].includes(value.toLowerCase()));
  return typeof provider === "string" ? provider.toLowerCase() : "";
}
function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as JsonRecord;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.content === "string") return obj.content;
    if (Array.isArray(obj.content)) return (obj.content as any[]).map((c: any) => typeof c === "string" ? c : (c?.text ?? "")).join("");
    if (typeof obj.response === "string") return obj.response;
  }
  return String(raw ?? "");
}
function extractJson(text: string): { verdict: string; reason: string; findings: string[] } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON object found in review response");
  const parsed = JSON.parse(match[0]);
  if (parsed.verdict !== "approve" && parsed.verdict !== "block") throw new Error("invalid verdict");
  if (!Array.isArray(parsed.findings)) throw new Error("findings must be array");
  return { verdict: parsed.verdict, reason: String(parsed.reason ?? ""), findings: parsed.findings as string[] };
}

export default definePluginEntry({
  id: "workflow-governance",
  name: "Workflow Governance",
  description: "Deterministic workflow and risk gates backed by official Task Flow.",
  register(api) {
    const cfg = (api.pluginConfig ?? {}) as JsonRecord;
    const defaultAgents = ["housekeeper", "ops", "coder", "reviewer", "life", "companion-dugu", "companion-wu", "companion-lv"];
    const agents = new Set(Array.isArray(cfg.agents) ? cfg.agents.filter((v): v is string => typeof v === "string") : defaultAgents);
    const legacyRiskAgentId = typeof cfg.riskAgentId === "string" ? cfg.riskAgentId : "ops";
    const riskAgentIds = new Set(Array.isArray(cfg.riskAgentIds) ? cfg.riskAgentIds.filter((v): v is string => typeof v === "string") : [legacyRiskAgentId, "coder"]);
    const decisionAgentId = typeof cfg.decisionAgentId === "string" ? cfg.decisionAgentId : "housekeeper";
    const reviewerAgentId = typeof (cfg as JsonRecord).reviewerAgentId === "string" ? String((cfg as JsonRecord).reviewerAgentId) : "reviewer";
    const controllerSessionKey = typeof cfg.controllerSessionKey === "string" && cfg.controllerSessionKey.trim()
      ? cfg.controllerSessionKey.trim() : "agent:housekeeper:task-system";
    const ownerTelegramId = typeof cfg.ownerTelegramId === "string" ? cfg.ownerTelegramId.trim() : "";
    const ownerSessionKey = typeof cfg.ownerSessionKey === "string" && cfg.ownerSessionKey.trim()
      ? cfg.ownerSessionKey.trim() : `agent:${decisionAgentId}:telegram:direct:${ownerTelegramId}`;
    const riskPathRaw = typeof cfg.riskStatePath === "string" && cfg.riskStatePath.trim()
      ? cfg.riskStatePath.trim() : join(process.env.HOME ?? process.cwd(), ".openclaw", "workflow-governance", "risk-state.json");
    const riskStatePath = isAbsolute(riskPathRaw) ? riskPathRaw : resolve(riskPathRaw);
    const taskPathRaw = typeof cfg.taskStatePath === "string" && cfg.taskStatePath.trim()
      ? cfg.taskStatePath.trim() : join(process.env.HOME ?? process.cwd(), ".openclaw", "task-system-control", "state.json");
    const taskStatePath = isAbsolute(taskPathRaw) ? taskPathRaw : resolve(taskPathRaw);
    const registeredSessions = new Map<string, { reviewRunId: string; role: "reviewer" | "housekeeper" }>();
    const riskTurn = new Map<string, string>();
    let riskQueue = Promise.resolve();
    const withRisk = async <T>(mutate: (state: RiskState) => T | Promise<T>): Promise<T> => {
      const operation = riskQueue.then(async () => {
        const state = await readRiskState(riskStatePath);
        const value = await mutate(state);
        state.revision += 1;
        state.updatedAt = new Date().toISOString();
        state.records = state.records.slice(-1000);
        await writeRiskState(riskStatePath, state);
        return value;
      });
      riskQueue = operation.then(() => undefined, () => undefined);
      return operation;
    };
    const blockReviewRun = async (reviewRunId: string, reason: string) => {
      await withRisk((state) => {
        const record = [...state.records].reverse().find((item) => item.reviewRunId === reviewRunId && item.status === "reviewing");
        if (record && record.reviewRunId === reviewRunId) {
          record.status = "review_blocked";
          record.updatedAt = new Date().toISOString();
        }
      });
    };

    api.on("before_tool_call", async (event: any, ctx: any) => {
      if (ctx.sessionKey && registeredSessions.has(ctx.sessionKey)) {
        return { block: true, blockReason: "审核或草拟会话不允许调用任何工具。" };
      }
      if (!ctx.agentId || !riskAgentIds.has(ctx.agentId) || !["exec", "process"].includes(event.toolName)) return;
      const command = [event.params.command, event.params.cmd, event.params.script].find((v): v is string => typeof v === "string");
      if (!command || !ctx.sessionKey) return;
      const high = riskDecision(command);
      const medium = high ? undefined : mediumRisk(command);
      if (!high && !medium) return;
      const work = await findWorkContext(taskStatePath, ctx.sessionKey);
      if (!work) return { block: true, blockReason: "这项工程动作没有关联到正式工作单元，不能在主会话或游离会话里执行。请回到任务分解链，由对应角色的 Workboard 子 Agent承担。" };
      const level: RiskRecord["level"] = high ? "high" : "medium";
      const description = high ?? medium!;
      const fingerprint = actionFingerprint(event.toolName, event.params);
      const toolCallId = typeof (event as unknown as JsonRecord).toolCallId === "string" ? String((event as unknown as JsonRecord).toolCallId) : undefined;
      const decision = await withRisk((state) => {
        const now = Date.now();
        let risk = [...state.records].reverse().find((item) => item.fingerprint === fingerprint && item.planId === work.planId && item.workUnitId === work.workUnitId && Date.parse(item.expiresAt) > now && !["completed", "execution_failed", "review_blocked", "declined"].includes(item.status));
        if (risk?.status === "approved" || risk?.status === "notified") {
          risk.status = "executing";
          risk.sessionKey = ctx.sessionKey;
          risk.toolCallId = toolCallId;
          risk.updatedAt = new Date().toISOString();
          return { allow: true, record: structuredClone(risk) };
        }
        if (risk?.status === "executing") return { allow: false, record: structuredClone(risk), duplicate: true };
        if (!risk) {
          const pendingOther = [...state.records].reverse().find((item) => item.ownerRoute === ownerSessionKey && item.level === "high" && ["pending_decision", "preflight_required", "reviewing"].includes(item.status) && Date.parse(item.expiresAt) > now && item.fingerprint !== fingerprint);
          if (pendingOther) return { allow: false, record: structuredClone(pendingOther), pendingOther: true };
          const timestamp = new Date().toISOString();
          risk = {
            fingerprint, level, agentId: ctx.agentId, sessionKey: ctx.sessionKey, planId: work.planId, packetId: work.packetId,
            workUnitId: work.workUnitId, cardId: work.cardId, ownerRoute: ownerSessionKey,
            status: level === "high" ? "preflight_required" : "preflight_required",
            goal: description.goal, impact: description.impact, worstCase: description.worstCase,
            rollback: description.rollback, alternative: description.alternative,
            expiresAt: new Date(now + 30 * 60_000).toISOString(), createdAt: timestamp, updatedAt: timestamp
          };
          state.records.push(risk);
          return { allow: false, record: structuredClone(risk), repeatPending: false };
        }
        return { allow: false, record: structuredClone(risk), repeatPending: risk.level === "high" && risk.status === "preflight_required" };
      });
      if (decision.allow) return;
      if (decision.duplicate) return { block: true, blockReason: "同一项变更已经在执行，先核对现有结果，不要重复启动。" };
      if (decision.pendingOther) return { block: true, blockReason: "当前已有另一项高风险决定在审核流程中。本工作单元先暂停，不得并行启动第二项审核。" };
      if (decision.repeatPending) return { block: true, blockReason: "这一项高风险决定已经在等待审核。请提交范围、备份和回退后调用 review_high_risk 启动三审。" };
      if (decision.record.level === "high") {
        return { block: true, blockReason: `这是一项高风险动作，尚未执行。准备做的是${decision.record.goal}；直接影响是${decision.record.impact}；最坏情况是${decision.record.worstCase}。回退办法：${decision.record.rollback}。请提交准确范围、已核验备份和可执行回退办法，调用 workflow_governance 的 review_high_risk 启动三审和事前告知；内部动作指纹为 ${fingerprint}。不要询问少主，不要改参数，不要弹出审批卡。` };
      }
      return { block: true, blockReason: `这是一项中风险、可回滚变更，不要询问少主。先在内部核对准确范围、备份和回滚办法，再调用 workflow_governance 的 record_preflight；内部动作指纹为 ${fingerprint}。完成内部预检后重试同一动作，参数变化必须重新预检。` };
    });

    api.on("after_tool_call", async (event: any, ctx: any) => {
      if (!ctx.agentId || !riskAgentIds.has(ctx.agentId) || !ctx.sessionKey || !["exec", "process"].includes(event.toolName)) return;
      const fingerprint = actionFingerprint(event.toolName, event.params);
      const work = await findWorkContext(taskStatePath, ctx.sessionKey);
      await withRisk((state) => {
        const record = [...state.records].reverse().find((item) => item.fingerprint === fingerprint && item.status === "executing" && (!work || (item.planId === work.planId && item.workUnitId === work.workUnitId)));
        if (!record) return;
        record.status = event.error ? "execution_failed" : "completed";
        record.updatedAt = new Date().toISOString();
      });
    });

    api.registerTool((ctx: any) => {
      if (!ctx.agentId || !agents.has(ctx.agentId) || !ctx.sessionKey) return null;
      const toolSessionKey = ctx.sessionKey;
      const flows = api.runtime.tasks.flow.bindSession({
        sessionKey: controllerSessionKey,
        ...(ctx.deliveryContext ? { requesterOrigin: ctx.deliveryContext } : {})
      });
      return {
        name: "workflow_governance",
        label: "Workflow Governance",
        description: "Persist formal plan, three independent complete reviews, execution, acceptance, sync, final notification, and risk governance in official Task Flow.",
        parameters: ParamsSchema,
        async execute(_id: string, raw: unknown) {
          const p = raw as JsonRecord;
          try {
            if (p.action === "risk_status") {
              await riskQueue;
              const state = await readRiskState(riskStatePath);
              const work = await findWorkContext(taskStatePath, toolSessionKey);
              const pending = state.records.filter((item) => !["completed", "declined", "execution_failed", "review_blocked"].includes(item.status) && Date.parse(item.expiresAt) > Date.now() &&
                (item.ownerRoute === ctx.sessionKey || (work && item.planId === work.planId && item.workUnitId === work.workUnitId)));
              return result({ ok: true, pending: pending.map((item) => ({ level: item.level, status: item.status, goal: item.goal, impact: item.impact, rollback: item.rollback, alternative: item.alternative })) });
            }
            if (p.action === "record_preflight") {
              if (!ctx.agentId || !riskAgentIds.has(ctx.agentId)) throw new Error("only an engineering worker can record a change preflight");
              const fingerprint = text(p.action_fingerprint, "action_fingerprint").toLowerCase();
              const scope = text(p.scope_summary, "scope_summary");
              const backup = text(p.backup_summary, "backup_summary");
              const rollback = text(p.rollback_summary, "rollback_summary");
              const work = await findWorkContext(taskStatePath, toolSessionKey);
              if (!work) throw new Error("no formal work unit is associated with this worker session");
              const recorded = await withRisk((state) => {
                const item = [...state.records].reverse().find((record) => record.fingerprint === fingerprint && record.planId === work.planId && record.workUnitId === work.workUnitId && record.level === "medium" && record.status === "preflight_required" && Date.parse(record.expiresAt) > Date.now());
                if (!item) throw new Error("no matching medium-risk action is waiting for preflight");
                item.preflight = { scope, backup, rollback };
                item.status = "approved";
                item.updatedAt = new Date().toISOString();
                return structuredClone(item);
              });
              return result({ ok: true, preflightReady: true, goal: recorded.goal, instruction: "现在只可重试参数完全相同的动作；参数变化需要重新预检。不要向少主索要许可。" });
            }
            if (p.action === "review_high_risk") {
              if (!ctx.agentId || !riskAgentIds.has(ctx.agentId)) throw new Error("only an engineering worker can initiate a high-risk review");
              const fingerprint = text(p.action_fingerprint, "action_fingerprint").toLowerCase();
              const scope = text(p.scope_summary, "scope_summary");
              const backup = text(p.backup_summary, "backup_summary");
              const rollback = text(p.rollback_summary, "rollback_summary");
              const work = await findWorkContext(taskStatePath, toolSessionKey);
              if (!work) throw new Error("no formal work unit is associated with this worker session");
              const reviewRunId = randomUUID();
              const claimed = await withRisk((state) => {
                const record = [...state.records].reverse().find((item) => item.fingerprint === fingerprint && item.planId === work.planId && item.workUnitId === work.workUnitId && item.level === "high" && item.status === "preflight_required" && Date.parse(item.expiresAt) > Date.now());
                if (!record) throw new Error("no matching high-risk action is waiting for review");
                if (record.reviewRunId) throw new Error("a review flow is already in progress for this action");
                record.reviewRunId = reviewRunId;
                record.status = "reviewing";
                record.preflight = { scope, backup, rollback };
                record.reviews = [];
                record.updatedAt = new Date().toISOString();
                return structuredClone(record);
              });
              const reviewMaterials = JSON.stringify({ goal: claimed.goal, impact: claimed.impact, worstCase: claimed.worstCase, decisionRollback: claimed.rollback, alternative: claimed.alternative, scope, backup, rollback, fingerprint });
              for (let n = 1; n <= 3; n++) {
                const reviewerSession = `agent:${reviewerAgentId}:risk-${reviewRunId}-${n}`;
                registeredSessions.set(reviewerSession, { reviewRunId, role: "reviewer" });
                let reviewResult: { verdict: string; reason: string; findings: string[] };
                try {
                  const raw = await api.runtime.subagent.run({
                    sessionKey: reviewerSession,
                    message: `你是独立审核员，请审核以下高风险动作资料，只返回严格JSON：{"verdict":"approve"或"block","reason":"...","findings":["..."]}\n\n${reviewMaterials}`,
                    lane: "risk-review", lightContext: true, deliver: false,
                    idempotencyKey: `risk-review:${reviewRunId}:${n}`
                  });
                  reviewResult = extractJson(extractText(raw));
                } catch (error) {
                  registeredSessions.delete(reviewerSession);
                  await blockReviewRun(reviewRunId, `review ${n} failed: ${error instanceof Error ? error.message : String(error)}`);
                  return result({ ok: false, blocked: true, reason: `review ${n} failed: ${error instanceof Error ? error.message : String(error)}` });
                }
                registeredSessions.delete(reviewerSession);
                const reviewEntry: ReviewEntry = { reviewNumber: n as 1 | 2 | 3, sessionKey: reviewerSession, reviewRunId, verdict: reviewResult.verdict as "approve" | "block", reason: reviewResult.reason, findings: reviewResult.findings, reviewedAt: new Date().toISOString() };
                const blockCheck = await withRisk((state) => {
                  const record = [...state.records].reverse().find((item) => item.reviewRunId === reviewRunId && item.status === "reviewing");
                  if (!record || record.reviewRunId !== reviewRunId) return { invalid: true };
                  record.reviews = record.reviews || [];
                  record.reviews.push(reviewEntry);
                  if (reviewResult.verdict === "block") {
                    record.status = "review_blocked";
                    record.updatedAt = new Date().toISOString();
                    return { blocked: true };
                  }
                  record.updatedAt = new Date().toISOString();
                  return { ok: true };
                });
                if (blockCheck.invalid) return result({ ok: false, error: "review flow state changed during review" });
                if (blockCheck.blocked) return result({ ok: false, blocked: true, reason: `review ${n} blocked: ${reviewResult.reason}` });
              }
              const draftSession = `agent:${decisionAgentId}:risk-draft-${reviewRunId}`;
              registeredSessions.set(draftSession, { reviewRunId, role: "housekeeper" });
              let notificationText: string;
              try {
                const draftRaw = await api.runtime.subagent.run({
                  sessionKey: draftSession,
                  message: `为以下高风险动作生成事前告知白话正文。正文必须符合${decisionAgentId === "housekeeper" ? "賈南風" : decisionAgentId}角色语气，包含：准备做什么、会影响什么、最坏可能怎样、出问题如何退回、已由审核员独立审核三次、"这是事前告知，不用回复，我会按计划继续"、预计开始时间。正文不得出现命令、路径、指纹、会话编号、内部卡片名或工程缩写。\n\n${reviewMaterials}`,
                  lane: "risk-notification-draft", lightContext: true, deliver: false,
                  idempotencyKey: `risk-draft:${reviewRunId}`
                });
                notificationText = extractText(draftRaw).trim();
              } catch (error) {
                registeredSessions.delete(draftSession);
                await blockReviewRun(reviewRunId, `notification draft failed: ${error instanceof Error ? error.message : String(error)}`);
                return result({ ok: false, blocked: true, reason: `notification draft failed: ${error instanceof Error ? error.message : String(error)}` });
              }
              registeredSessions.delete(draftSession);
              if (!notificationText || notificationText.length < 20) {
                await blockReviewRun(reviewRunId, "notification text too short or empty");
                return result({ ok: false, blocked: true, reason: "notification text too short or empty" });
              }
              const forbiddenPatterns = [/\b(exec|process|rm\s+-rf|chmod|reboot|shutdown)\b/i, /\b\/[a-z]\//i, /\b[a-f0-9]{32,}\b/i, /fingerprint|session|agent:|cardId|workUnit/i];
              for (const pattern of forbiddenPatterns) {
                if (pattern.test(notificationText)) {
                  await blockReviewRun(reviewRunId, "notification text contains forbidden engineering content");
                  return result({ ok: false, blocked: true, reason: "notification text contains forbidden engineering content" });
                }
              }
              let messageId: string | undefined;
              try {
                const adapter = await api.runtime.channel.outbound.loadAdapter("telegram");
                if (!adapter?.sendText) throw new Error("telegram outbound adapter unavailable");
                const sendResult: any = await adapter.sendText({ cfg: api.runtime.config.current() as any, accountId: decisionAgentId, to: ownerTelegramId, text: notificationText });
                const firstResult = Array.isArray(sendResult) ? sendResult[0] : sendResult;
                messageId = typeof firstResult?.messageId === "string" ? firstResult.messageId : (typeof firstResult?.results?.[0]?.messageId === "string" ? firstResult.results[0].messageId : undefined);
              } catch (error) {
                await blockReviewRun(reviewRunId, `telegram notification failed: ${error instanceof Error ? error.message : String(error)}`);
                return result({ ok: false, blocked: true, reason: `telegram notification failed: ${error instanceof Error ? error.message : String(error)}` });
              }
              if (!messageId) {
                await blockReviewRun(reviewRunId, "telegram returned empty message ID");
                return result({ ok: false, blocked: true, reason: "telegram returned empty message ID" });
              }
              const notified = await withRisk((state) => {
                const record = [...state.records].reverse().find((item) => item.reviewRunId === reviewRunId && item.status === "reviewing");
                if (!record || record.reviewRunId !== reviewRunId) return { invalid: true };
                record.status = "notified";
                record.notification = { bodySummary: notificationText.substring(0, 200), messageId, sentAt: new Date().toISOString() };
                record.updatedAt = new Date().toISOString();
                return { ok: true, record: structuredClone(record) };
              });
              if (notified.invalid) return result({ ok: false, error: "review flow state changed during notification" });
              return result({ ok: true, notified: true, instruction: "事前告知已发送。现在只可重试参数完全相同的动作；参数变化必须重新审核。不用等待少主回复。" });
            }
            if (p.action === "list") return result({ ok: true, flows: flows.list() });
            if (p.action === "create") {
              const criteria = Array.isArray(p.acceptance_criteria) ? p.acceptance_criteria as string[] : [];
              if (!criteria.length) throw new Error("acceptance_criteria is required");
              const workflowProfile = typeof p.workflow_profile === "string"
                ? p.workflow_profile as WorkflowProfile : "research_plan_triple_review";
              const created = flows.createManaged({
                controllerId: "workflow-governance/v2", goal: text(p.goal, "goal"), status: "queued",
                currentStep: workflowProfile === "research_plan_triple_review" ? "research" : "implementation", notifyPolicy: "silent",
                stateJson: {
                  schema: "workflow-governance/v2", workflowProfile, acceptanceCriteria: criteria,
                  reviews: [], linkedWork: [], stage: workflowProfile === "research_plan_triple_review" ? "research" : "implementation"
                }
              });
              return result({ ok: true, flow: created });
            }
            const flow = flows.get(text(p.flow_id, "flow_id"));
            if (!flow) throw new Error("Task Flow not found");
            if (p.action === "inspect") return result({ ok: true, flow, taskSummary: flows.getTaskSummary(flow.flowId) });
            const state = stateOf(flow);
            if (p.action === "set_plan") {
              const hash = text(p.plan_hash, "plan_hash").toLowerCase();
              if (!HASH.test(hash)) throw new Error("plan_hash must be SHA-256");
              state.planHash = hash; state.reviews = []; state.stage = "review_1";
              delete state.acceptanceEvidence; delete state.notification;
              const updated = requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: "review_1", stateJson: state }));
              return result({ ok: true, reviewsReset: true, flow: updated });
            }
            if (p.action === "record_review") {
              const planHash = text(p.plan_hash, "plan_hash").toLowerCase();
              if (!state.planHash || planHash !== state.planHash) throw new Error("review plan hash does not match the current plan");
              if (p.review_scope !== "independent_complete") throw new Error("each review must be independent_complete");
              if (p.finding_count !== 0) return result({ ok: false, planRevisionRequired: true, reviewsInvalidatedOnPlanChange: true });
              const number = Number(p.review_number) as 1 | 2 | 3;
              if (![1, 2, 3].includes(number)) throw new Error("review_number must be 1, 2 or 3");
              if (state.reviews.some((r) => r.reviewNumber === number)) throw new Error("this review number is already recorded");
              const evidenceHash = text(p.review_evidence_hash, "review_evidence_hash").toLowerCase();
              if (!HASH.test(evidenceHash)) throw new Error("review evidence must be SHA-256");
              const nonce = text(p.review_nonce, "review_nonce");
              if (state.reviews.some((r) => r.evidenceHash === evidenceHash || r.reviewNonce === nonce)) throw new Error("each full review needs independent evidence and nonce");
              state.reviews.push({ reviewNumber: number, scope: "independent_complete", planHash, evidenceHash, reviewNonce: nonce, reviewedAt: new Date().toISOString() });
              state.reviews.sort((a, b) => a.reviewNumber - b.reviewNumber);
              state.stage = state.reviews.length === 3 ? "review_complete" : `review_${state.reviews.length + 1}`;
              const updated = requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: state.stage, stateJson: state }));
              return result({ ok: true, flow: updated });
            }
            if (p.action === "begin_execution") {
              if (state.workflowProfile === "research_plan_triple_review") {
                if (!state.planHash || state.reviews.length !== 3 || state.reviews.some((r, i) => r.planHash !== state.planHash || r.reviewNumber !== i + 1)) {
                  throw new Error("this workflow profile requires three independent complete reviews of the current plan");
                }
              } else if (state.workflowProfile === "governed_change" && !state.planHash) {
                throw new Error("governed_change requires a current plan before execution");
              }
              state.stage = "implementation";
              return result({ ok: true, flow: requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: "implementation", stateJson: state })) });
            }
            if (p.action === "link_work") {
              const cardId = text(p.card_id, "card_id");
              const status = text(p.work_status, "work_status") as LinkedWork["status"];
              const existing = state.linkedWork.find((item) => item.cardId === cardId);
              const linked: LinkedWork = existing ?? { cardId, status, updatedAt: new Date().toISOString() };
              linked.status = status;
              linked.runId = typeof p.run_id === "string" ? p.run_id : linked.runId;
              linked.taskId = typeof p.task_id === "string" ? p.task_id : linked.taskId;
              linked.mirroredFlowId = typeof p.mirrored_flow_id === "string" ? p.mirrored_flow_id : linked.mirroredFlowId;
              linked.proofReceipt = typeof p.proof_receipt === "string" ? p.proof_receipt.toLowerCase() : linked.proofReceipt;
              linked.updatedAt = new Date().toISOString();
              if (!existing) state.linkedWork.push(linked);
              const updated = requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: state.stage, stateJson: state }));
              return result({ ok: true, flow: updated, linkedWork: linked });
            }
            if (p.action === "set_stage") {
              const next = text(p.stage, "stage");
              const allowed = { implementation: "validation", validation: "documentation", documentation: "sync" };
              if (allowed[state.stage as keyof typeof allowed] !== next) throw new Error(`invalid stage transition from ${state.stage} to ${next}`);
              state.stage = next;
              return result({ ok: true, flow: requireApplied(flows.resume({ flowId: flow.flowId, expectedRevision: flow.revision, status: "running", currentStep: next, stateJson: state })) });
            }
            if (p.action === "ready_to_notify") {
              if (state.stage !== "sync") throw new Error("documentation and sync must finish before notification");
              if (state.linkedWork.length) {
                if (state.linkedWork.some((item) => item.status !== "succeeded" || !item.proofReceipt)) {
                  throw new Error("all linked real Workboard tasks need succeeded status and a completion proof receipt");
                }
              } else {
                const summary = flows.getTaskSummary(flow.flowId);
                const total = Number(summary?.total ?? 0);
                const active = Number(summary?.active ?? 0);
                const terminal = Number(summary?.terminal ?? 0);
                const failures = Number(summary?.failures ?? 0);
                if (active > 0 || failures > 0 || terminal < total) {
                  throw new Error("all child tasks must reach successful terminal state before final notification");
                }
              }
              const evidence = Array.isArray(p.acceptance_evidence) ? p.acceptance_evidence : [];
              if (evidence.length < state.acceptanceCriteria.length || evidence.some((v) => !HASH.test(v))) throw new Error("acceptance evidence is incomplete");
              state.acceptanceEvidence = evidence;
              state.unfixableItems = Array.isArray(p.unfixable_items) ? p.unfixable_items : [];
              const eventKey = `workflow:${flow.flowId}:${state.planHash}:completion`;
              state.notification = { eventKey };
              state.stage = "notification_pending";
              const updated = requireApplied(flows.setWaiting({ flowId: flow.flowId, expectedRevision: flow.revision, currentStep: "notification_pending", stateJson: state, waitJson: { kind: "owner_notification", eventKey } }));
              return result({ ok: true, eventKey, flow: updated });
            }
            if (p.action === "acknowledge_notification") {
              if (state.stage !== "notification_pending" || !state.notification) throw new Error("no final notification is pending");
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
