import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin, { classifyWorkflow, inferModules } from "../dist/index.js";

assert.equal(classifyWorkflow("请记录明天九点开会，提前一小时提醒"), "direct_module");
assert.equal(classifyWorkflow("先查询官方说明、GitHub 和社群讨论，计划后独立审查三次再修复"), "research_plan_triple_review");
assert.equal(classifyWorkflow("今天天气怎么样？"), "conversation");
assert.deepEqual(inferModules("morning_brief_control", { action: "set_location" }, { details: { ok: true } }), ["weather", "aqi", "attire"]);

const temporary = await mkdtemp(join(tmpdir(), "task-system-control-"));
const statePath = join(temporary, "state.json");
const hooks = new Map();
const factories = new Map();
const flows = new Map();
const gatewayCalls = [];
let flowSeq = 0;
let cardStatus = "running";
let taskStatus = "running";
const cardId = "11111111-1111-4111-8111-111111111111";
const runId = "workboard:11111111-1111-4111-8111-111111111111:1";
const childSessionKey = `agent:ops:subagent:workboard-production-${cardId}`;

function flowRuntime(binding) {
  assert.equal(binding.sessionKey, "agent:housekeeper:task-system");
  return {
    createManaged(input) {
      const flow = { ...input, flowId: `flow-${++flowSeq}`, revision: 1, syncMode: "managed", stateJson: input.stateJson };
      flows.set(flow.flowId, flow);
      return flow;
    },
    get(id) { return flows.get(id); },
    resume(input) {
      const flow = flows.get(input.flowId);
      if (!flow || flow.revision !== input.expectedRevision) return { applied: false, code: "revision_conflict" };
      Object.assign(flow, input, { revision: flow.revision + 1 });
      return { applied: true, flow };
    },
    setWaiting(input) {
      const result = this.resume(input);
      if (result.applied) result.flow.status = "waiting";
      return result;
    },
    finish(input) {
      const result = this.resume(input);
      if (result.applied) result.flow.status = "succeeded";
      return result;
    },
    fail(input) {
      const result = this.resume(input);
      if (result.applied) result.flow.status = "failed";
      return result;
    }
  };
}

const api = {
  pluginConfig: {
    statePath,
    ownerTelegramId: "811150402",
    targetSessions: { life: "agent:life:telegram:direct:811150402", ops: "agent:ops:telegram:direct:811150402" }
  },
  logger: { info() {}, warn() {}, error() {} },
  runtime: {
    gateway: {
      isAvailable() { return true; },
      async request(method, params) {
        gatewayCalls.push({ method, params });
        if (method === "workboard.cards.list") { assert.equal(params.boardId, "task-system"); return { cards: [] }; }
        if (method === "workboard.cards.create") {
          assert.equal(params.boardId, "task-system");
          return { card: { id: cardId, status: "ready", metadata: { automation: { idempotencyKey: params.idempotencyKey } } } };
        }
        if (method === "workboard.cards.dispatch") { assert.deepEqual(params, { boardId: "task-system" }); return { started: [{ cardId, runId, sessionKey: childSessionKey }] }; }
        if (method === "workboard.cards.runs") return { card: { id: cardId, status: cardStatus, runId, sessionKey: childSessionKey } };
        if (method === "workboard.cards.update") { cardStatus = params.patch.status ?? cardStatus; return { card: { id: cardId, status: cardStatus } }; }
        if (method === "tasks.list") return { tasks: [{ taskId: "task-1", runId, childSessionKey, parentFlowId: "mirrored-flow-1", status: taskStatus }] };
        throw new Error(`unexpected gateway method ${method}`);
      }
    },
    tasks: { flow: { bindSession: flowRuntime } },
    subagent: {
      async run(input) { return { runId: `handoff-run:${input.idempotencyKey}` }; }
    }
  },
  on(name, handler) { hooks.set(name, handler); },
  registerTool(factory, options) { factories.set(options.name, factory); }
};

plugin.register(api);
for (const name of ["before_agent_run", "agent_turn_prepare", "before_agent_finalize", "agent_end", "after_tool_call", "subagent_ended", "message_sent", "gateway_start"]) {
  assert.equal(typeof hooks.get(name), "function", `${name} registered`);
}

const housekeeperContext = {
  agentId: "housekeeper",
  sessionKey: "agent:housekeeper:telegram:direct:811150402",
  runId: "turn-1",
  channel: "telegram",
  channelId: "telegram",
  agentAccountId: "housekeeper",
  senderIsOwner: true,
  deliveryContext: { channel: "telegram", accountId: "housekeeper", to: "811150402" }
};
await hooks.get("before_agent_run")({
  prompt: "请记录明天九点开会，提前一小时提醒",
  messages: [], accountId: "housekeeper", channelId: "telegram", senderId: "811150402", senderIsOwner: true
}, housekeeperContext);
const injected = await hooks.get("agent_turn_prepare")({ prompt: "", messages: [], queuedInjections: [] }, housekeeperContext);
assert.match(injected.appendContext, /task_intake/);

const intake = factories.get("task_intake")(housekeeperContext);
const moduleTool = factories.get("task_module")(housekeeperContext);
let listed = await intake.execute("1", { action: "list" });
assert.equal(listed.details.items.length, 1);
await intake.execute("2", { action: "triage", profile: "direct_module", goal: "记录日程" });
await moduleTool.execute("3", { action: "expect", module: "schedule", control_action: "upsert_event" });
let finalize = await hooks.get("before_agent_finalize")({ sessionId: "s", stopHookActive: false, lastAssistantMessage: "已经处理" }, housekeeperContext);
assert.equal(finalize.action, "revise");
assert.equal(finalize.reason, "module_receipt_missing");
await hooks.get("after_tool_call")({
  toolName: "morning_brief_control", params: { action: "upsert_event" }, toolCallId: "tool-1", result: { details: { ok: true, sections: ["今日玉牒"] } }
}, housekeeperContext);
const inspectedModule = await moduleTool.execute("4", { action: "inspect" });
assert.equal(inspectedModule.details.modules[0].status, "applied");

const opsContext = {
  agentId: "ops",
  sessionKey: "agent:ops:telegram:direct:811150402",
  runId: "turn-2", channel: "telegram", channelId: "telegram", agentAccountId: "default", senderIsOwner: true,
  deliveryContext: { channel: "telegram", accountId: "default", to: "811150402" }
};
await hooks.get("before_agent_run")({
  prompt: "修复整个任务系统并完成生产验收",
  messages: [], accountId: "default", channelId: "telegram", senderId: "811150402", senderIsOwner: true
}, opsContext);
const opsIntake = factories.get("task_intake")(opsContext);
await opsIntake.execute("5", { action: "triage", profile: "governed_change", goal: "修复任务系统" });
const started = await opsIntake.execute("6", {
  action: "start", title: "修复任务系统", goal: "修复任务系统", assignee: "ops", cross_turn: true,
  completion_criteria: ["真实任务完成", "通知送达"]
});
assert.equal(started.details.ok, true);
assert.ok(gatewayCalls.some((call) => call.method === "workboard.cards.create"));
assert.ok(gatewayCalls.some((call) => call.method === "workboard.cards.dispatch"));
assert.equal(flowSeq, 1);

await hooks.get("subagent_ended")({ runId, targetSessionKey: childSessionKey, outcome: "ok", endedAt: Date.now() });
assert.ok(gatewayCalls.some((call) => call.method === "workboard.cards.update" && call.params.patch.status === "blocked"));
assert.equal([...flows.values()][0].status, "waiting", "missing completion proof must wait instead of terminating the parent flow");
cardStatus = "running";

await hooks.get("after_tool_call")({
  toolName: "workboard_complete", params: { card_id: cardId }, toolCallId: "tool-2", result: { details: { ok: true } }
}, { agentId: "ops", sessionKey: childSessionKey });
cardStatus = "done";
taskStatus = "succeeded";
const reconciled = await opsIntake.execute("7", { action: "reconcile" });
assert.equal(reconciled.details.item.status, "completed");
assert.equal([...flows.values()][0].status, "succeeded");

const handoffTool = factories.get("task_handoff")(housekeeperContext);
const submitted = await handoffTool.execute("8", {
  action: "submit", target_agent: "life", capability: "morning.schedule", expected_tool: "morning_brief_control",
  payload: { action: "upsert_event", title: "出门", event_at: "2026-08-10T09:00:00+08:00" }
});
assert.equal(submitted.details.status, "applying");
const persisted = JSON.parse(await readFile(statePath, "utf8"));
const handoffId = persisted.handoffs[0].id;
const lifeContext = { agentId: "life", sessionKey: "agent:life:telegram:direct:811150402" };
assert.equal(await hooks.get("agent_turn_prepare")(
  { prompt: "[formal handoff]", messages: [], queuedInjections: [] },
  { ...lifeContext, runId: "handoff-turn-1" }
), undefined, "an internal handoff run must not inherit an older owner turn");
const lifeHandoff = factories.get("task_handoff")(lifeContext);
const accepted = await lifeHandoff.execute("9", { action: "accept", handoff_id: handoffId });
assert.equal(accepted.details.accepted, true);
await hooks.get("after_tool_call")({
  toolName: "morning_brief_control", params: { action: "upsert_event" }, toolCallId: "tool-3", result: { details: { ok: true, sections: ["今日玉牒"] } }
}, lifeContext);
const handoffStatus = await handoffTool.execute("10", { action: "status", handoff_id: handoffId });
assert.equal(handoffStatus.details.applied, true);

const notificationText = "少主，修复已经完成并通过验收。";
const contentHash = (await import("node:crypto")).createHash("sha256").update(notificationText, "utf8").digest("hex");
await intake.execute("11", { action: "queue_notification", event_key: "done-1", content_hash: contentHash });
await hooks.get("message_sent")({ to: "811150402", content: notificationText, success: true, messageId: "tg-123", sessionKey: housekeeperContext.sessionKey });
const finalState = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(finalState.outbox[0].status, "sent");
assert.equal(finalState.outbox[0].messageId, "tg-123");
await hooks.get("agent_end")({ runId: housekeeperContext.runId, messages: [], success: true }, housekeeperContext);
assert.equal(await hooks.get("agent_turn_prepare")(
  { prompt: "", messages: [], queuedInjections: [] }, housekeeperContext
), undefined, "turn-scoped intake context must be removed after agent_end");

await rm(temporary, { recursive: true, force: true });
console.log("TASK_SYSTEM_CONTROL_TEST_OK");
