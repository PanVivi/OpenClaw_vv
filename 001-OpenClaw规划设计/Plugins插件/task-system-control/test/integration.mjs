import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin, { classifyWorkflow, migrateState } from "../dist/index.js";

assert.equal(classifyWorkflow("先查官方说明和 GitHub，再三次审核后修复"), "research_plan_triple_review");
assert.equal(classifyWorkflow("今天天气怎么样？"), "conversation");

const legacyMigrated = migrateState({
  schema: "hehuan.task-system-control", schemaVersion: 2, revision: 1, updatedAt: new Date(0).toISOString(), inbox: [], packets: [], workUnits: [], links: [], handoffs: [],
  plans: [{ id: "legacy-plan", inboxId: "legacy-inbox", sourceAgentId: "housekeeper", sourceSessionKey: "agent:housekeeper:telegram:direct:811150402", title: "旧完成任务", goal: "test", profile: "simple_task", status: "succeeded", packetIds: [], completionWakeAt: "2026-08-16T00:00:00.000Z", createdAt: "2026-08-16T00:00:00.000Z", updatedAt: "2026-08-16T00:00:00.000Z" }],
  outbox: [
    { id: "legacy-ordinary", eventKey: "ordinary:1", sessionKey: "legacy", contentHash: "a", status: "sent", messageId: "10", createdAt: "2026-08-16T00:00:00.000Z", updatedAt: "2026-08-16T00:00:00.000Z" },
    { id: "legacy-collision", eventKey: "task-plan-completion:legacy-plan", sessionKey: "legacy", contentHash: "b", status: "pending", createdAt: "2026-08-16T00:00:00.000Z", updatedAt: "2026-08-16T00:00:00.000Z" }
  ]
});
assert.equal(legacyMigrated.outbox[0].kind, "ordinary_agent");
assert.equal(legacyMigrated.outbox[0].messageId, "10");
assert.equal(legacyMigrated.outbox[1].kind, "ordinary_agent");
assert.equal(legacyMigrated.outbox[1].status, "quarantined");
assert.equal(legacyMigrated.plans[0].completionWakeAt, undefined);
assert.equal(legacyMigrated.plans[0].legacyCompletionWakeAt, "2026-08-16T00:00:00.000Z");
assert.equal(legacyMigrated.plans[0].completionNotificationStatus, "unknown");
assert.equal(migrateState(JSON.parse(JSON.stringify(legacyMigrated))).plans[0].completionNotificationStatus, "unknown", "notification migration is restart-stable and never auto-upgrades legacy evidence");

const temporary = await mkdtemp(join(tmpdir(), "task-system-control-v3-"));
const statePath = join(temporary, "state.json");
await writeFile(statePath, JSON.stringify({
  schema: "hehuan.task-system-control", schemaVersion: 2, revision: 7, updatedAt: new Date(0).toISOString(),
  inbox: [], plans: [], packets: [], workUnits: [], links: [], handoffs: [], outbox: []
}), "utf8");

const hooks = new Map();
const factories = new Map();
const subagentRuns = [];
const outboundSends = [];
let outboundMode = "sent";
let runMode = "ok";
let runSequence = 0;

const agentIds = ["housekeeper", "ops", "coder", "reviewer", "life", "companion-dugu", "companion-wu", "companion-lv"];
const runtimeConfig = {
  agents: { list: agentIds.map((id) => ({ id, tools: { allow: ["task_work_proof", "task_work_complete"] } })) }
};

const api = {
  pluginConfig: {
    statePath, ownerTelegramId: "811150402",
    agents: { housekeeper: "housekeeper", ops: "default", coder: "coder", reviewer: "reviewer", life: "life", "companion-dugu": "companion-dugu", "companion-wu": "companion-wu", "companion-lv": "companion-lv" }
  },
  logger: { info() {}, warn() {}, error() {} },
  runtime: {
    config: { current() { return runtimeConfig; } },
    channel: {
      outbound: {
        async loadAdapter(channel) {
          assert.equal(channel, "telegram");
          if (outboundMode === "unavailable") return undefined;
          return {
            async sendText(input) {
              outboundSends.push(input);
              if (outboundMode === "throw") throw new Error("send result unknown");
              return { channel: "telegram", messageId: outboundMode === "missing" ? "" : `telegram-${outboundSends.length}` };
            }
          };
        }
      }
    },
    subagent: {
      async run(input) {
        const runId = `direct-run-${++runSequence}`;
        subagentRuns.push({ input, runId });
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (runMode === "early-end") {
          await hooks.get("subagent_ended")({ targetSessionKey: input.sessionKey, targetKind: "subagent", reason: "completed", runId, outcome: "ok", endedAt: Date.now() });
        }
        if (runMode === "throw") throw new Error("commit then timeout");
        if (runMode === "missing") return { runId: "" };
        return { runId };
      },
      async getSessionMessages() { return { messages: [] }; }
    }
  },
  on(name, handler) { hooks.set(name, handler); },
  registerTool(factory, options) { factories.set(options.name, factory); }
};

plugin.register(api);
for (const name of ["before_agent_run", "agent_turn_prepare", "before_prompt_build", "before_tool_call", "before_agent_finalize", "message_sending", "agent_end", "after_tool_call", "subagent_spawned", "subagent_ended", "message_sent", "gateway_start"]) {
  assert.equal(typeof hooks.get(name), "function", `${name} registered`);
}
for (const name of ["task_delegate", "task_intake", "task_handoff", "task_module", "task_work_proof", "task_work_complete"]) assert.equal(typeof factories.get(name), "function", `${name} registered`);

const housekeeper = {
  agentId: "housekeeper", sessionKey: "agent:housekeeper:telegram:direct:811150402", runId: "turn-one",
  messageProvider: "telegram", channelId: "811150402", senderId: "811150402"
};
const ownerEvent = (prompt) => ({ prompt, messages: [], accountId: "housekeeper", channelId: "811150402", senderId: "811150402", senderIsOwner: true });
await hooks.get("before_agent_run")(ownerEvent("请检查模型配置并给出证据"), housekeeper);

let state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.schemaVersion, 3, "v2 state migrates to v3");
assert.equal(state.inbox.length, 1);
assert.equal(await hooks.get("before_tool_call")({ toolName: "read", params: {} }, housekeeper), undefined, "main read-only inspection is no longer vetoed");
assert.equal((await hooks.get("before_tool_call")({ toolName: "exec", params: {} }, housekeeper)).block, true, "main mutation is still vetoed");

const delegate = factories.get("task_delegate")(housekeeper);
const planned = await delegate.execute("plan", {
  action: "plan", title: "模型配置核对", goal: "读取并核对模型配置",
  packets: [{ packet_key: "ops", target_agent: "ops", title: "核对配置", objective: "读取有效配置并给出证据", completion_criteria: ["列出有效值"], capability: "ops.inspect" }]
});
assert.equal(planned.details.ok, true);
assert.equal(subagentRuns.length, 1, "new plan starts exactly one direct worker");
assert.equal(subagentRuns[0].input.provider, undefined);
assert.equal(subagentRuns[0].input.model, undefined);
assert.equal("toolsAlsoAllow" in subagentRuns[0].input, false, "production contract is respected");

state = JSON.parse(await readFile(statePath, "utf8"));
const firstPlan = state.plans[0];
const firstUnit = state.workUnits[0];
const firstLink = state.links[0];
assert.equal(firstPlan.delegationMode, "direct_subagent_v3");
assert.equal(state.packets[0].workUnitIds.length, 1);
assert.equal(firstLink.status, "running", "accepted runId is truthful running evidence on the production plugin-subagent path");
assert.match(firstLink.childSessionKey, /^agent:ops:subagent:task-system-/);
assert.ok(firstLink.launchNonce && firstLink.generation === 1);

await hooks.get("subagent_spawned")({ childSessionKey: firstLink.childSessionKey, agentId: "ops", mode: "run", threadRequested: false, runId: firstLink.runId });
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.links[0].status, "running");
assert.equal(state.inbox[0].status, "running");

const workerContext = { agentId: "ops", sessionKey: firstLink.childSessionKey, runId: firstLink.runId };
assert.equal(await hooks.get("before_tool_call")({ toolName: "exec", params: {} }, workerContext), undefined, "direct worker keeps role policy");
const proof = factories.get("task_work_proof")(workerContext);
const complete = factories.get("task_work_complete")(workerContext);
const receiptBase = { work_unit_id: firstUnit.id, generation: firstLink.generation, launch_nonce: firstLink.launchNonce };
assert.equal((await proof.execute("proof", { ...receiptBase, summary: "read-only evidence" })).details.ok, true);
assert.equal((await complete.execute("complete", { ...receiptBase, summary: "configuration verified" })).details.ok, true);
await hooks.get("subagent_ended")({ targetSessionKey: firstLink.childSessionKey, targetKind: "subagent", reason: "completed", runId: firstLink.runId, outcome: "ok", endedAt: Date.now() });

state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.links[0].status, "succeeded");
assert.equal(state.workUnits[0].status, "succeeded");
assert.equal(state.packets[0].status, "succeeded");
assert.equal(state.plans[0].status, "succeeded");
assert.equal(state.inbox[0].status, "completed");
assert.equal(outboundSends.length, 1, "completion sends exactly once through the Telegram adapter");
assert.equal(outboundSends[0].accountId, "housekeeper");
assert.equal(outboundSends[0].to, "811150402");
assert.match(outboundSends[0].text, /少主，妾身来回话/);
assert.equal(state.outbox[0].kind, "completion_direct");
assert.equal(state.outbox[0].status, "sent");
assert.equal(state.outbox[0].messageId, "telegram-1");
assert.equal(state.plans[0].completionNotificationStatus, "sent");
assert.ok(state.plans[0].completionWakeAt);

await hooks.get("subagent_ended")({ targetSessionKey: firstLink.childSessionKey, targetKind: "subagent", reason: "completed", runId: firstLink.runId, outcome: "ok", endedAt: Date.now() });
assert.equal(outboundSends.length, 1, "duplicate ended event cannot duplicate the completion send");
assert.equal((await proof.execute("late", { ...receiptBase, summary: "late" })).details.ok, false, "terminal receipt is rejected");

const intake = factories.get("task_intake")(housekeeper);
assert.equal((await intake.execute("reserved", { action: "queue_notification", event_key: `task-plan-completion:${firstPlan.id}`, content_hash: "a".repeat(64) })).details.ok, false, "ordinary notification tool cannot enter the completion namespace");
const ordinaryText = "ordinary agent notification";
assert.equal((await intake.execute("ordinary", { action: "queue_notification", event_key: "ordinary:test", content_hash: (await import("node:crypto")).createHash("sha256").update(ordinaryText).digest("hex") })).details.ok, true);
await hooks.get("message_sent")({ sessionKey: housekeeper.sessionKey, content: ordinaryText, success: true, messageId: "ordinary-1" }, housekeeper);
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.outbox.find((item) => item.kind === "ordinary_agent" && item.eventKey === "ordinary:test").status, "sent");
assert.equal(state.outbox.find((item) => item.kind === "completion_direct").messageId, "telegram-1", "ordinary message hooks cannot rewrite completion delivery evidence");

// Concurrent reconcile can claim an orphan only once.
state = JSON.parse(await readFile(statePath, "utf8"));
const now = new Date().toISOString();
const orphanPlanId = "plan-orphan";
const orphanPacketId = "packet-orphan";
const orphanUnitId = "unit-orphan";
state.inbox.push({ id: "inbox-orphan", eventKey: "event-orphan", agentId: "housekeeper", channelId: "811150402", senderId: "811150402", sessionKey: housekeeper.sessionKey, promptHash: "x", prompt: "orphan", profile: "simple_task", status: "delegating", planIds: [orphanPlanId], cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now });
state.plans.push({ id: orphanPlanId, inboxId: "inbox-orphan", sourceAgentId: "housekeeper", sourceSessionKey: housekeeper.sessionKey, title: "孤儿恢复", goal: "恢复一次", profile: "simple_task", status: "planned", packetIds: [orphanPacketId], createdAt: now, updatedAt: now });
state.packets.push({ id: orphanPacketId, planId: orphanPlanId, packetKey: "orphan", targetAgentId: "ops", controllerSessionKey: "agent:ops:task-controller", controllerRunId: "old-ended-controller", controllerLeaseUntil: new Date(0).toISOString(), decompositionReceipt: "legacy-receipt", title: "恢复孤儿", objective: "只执行一次", completionCriteria: ["一次"], capability: "ops.inspect", dependsOn: [], inputRefs: [], status: "running", idempotencyKey: "legacy", workUnitIds: [orphanUnitId], createdAt: now, updatedAt: now });
state.workUnits.push({ id: orphanUnitId, planId: orphanPlanId, packetId: orphanPacketId, unitKey: "legacy", agentId: "ops", title: "恢复孤儿", objective: "只执行一次", completionCriteria: ["一次"], capability: "ops.inspect", dependsOn: [], idempotencyKey: "orphan-unit", status: "ready", createdAt: now, updatedAt: now });
await writeFile(statePath, JSON.stringify(state), "utf8");
const beforeConcurrent = subagentRuns.length;
await Promise.all([delegate.execute("r1", { action: "reconcile", plan_id: orphanPlanId }), delegate.execute("r2", { action: "reconcile", plan_id: orphanPlanId })]);
assert.equal(subagentRuns.length, beforeConcurrent + 1, "two reconcile calls produce one launch");
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.links.filter((item) => item.workUnitId === orphanUnitId).length, 1);

// The one frozen v2 placeholder shape inherits the packet's exact role and read-only boundary.
const placeholderPlanId = "plan-placeholder";
const placeholderPacketId = "packet-placeholder";
const placeholderUnitId = "unit-placeholder";
state.inbox.push({ id: "inbox-placeholder", eventKey: "event-placeholder", agentId: "housekeeper", channelId: "811150402", senderId: "811150402", sessionKey: housekeeper.sessionKey, promptHash: "p", prompt: "只读恢复", profile: "simple_task", status: "delegating", goal: "只读检查", planIds: [placeholderPlanId], cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now });
state.plans.push({ id: placeholderPlanId, inboxId: "inbox-placeholder", sourceAgentId: "housekeeper", sourceSessionKey: housekeeper.sessionKey, title: "占位迁移", goal: "只读检查", profile: "simple_task", status: "planned", packetIds: [placeholderPacketId], createdAt: now, updatedAt: now });
state.packets.push({ id: placeholderPacketId, planId: placeholderPlanId, packetKey: "inspect", targetAgentId: "ops", controllerSessionKey: "agent:ops:task-controller", controllerRunId: "old-placeholder-controller", controllerLeaseUntil: new Date(0).toISOString(), decompositionReceipt: "placeholder-receipt", title: "只读核对", objective: "只读核对配置，不作修改。", completionCriteria: ["给出有效值"], capability: "ops.inspect", dependsOn: [], inputRefs: ["source-proof"], status: "running", idempotencyKey: "placeholder", workUnitIds: [placeholderUnitId], createdAt: now, updatedAt: now });
state.workUnits.push({ id: placeholderUnitId, planId: placeholderPlanId, packetId: placeholderPacketId, unitKey: "***", agentId: "ops", title: "执行并验证角色任务", objective: "继承原任务包上下文,闭环完成范围确认、核心实施、结果验证和验收证据整理。", completionCriteria: ["完整确认原任务包的目标、范围、输入、约束和验收条件", "完成原任务包要求的全部变更或操作,且关键步骤可追溯", "执行覆盖全部验收条件的检查或测试并处理发现的问题", "汇总产出物、验证证据、无法修复项和剩余风险,形成可供上游复核的交付摘要"], capability: "ops.change", dependsOn: [], inputRefs: [], idempotencyKey: "placeholder-unit", status: "ready", createdAt: now, updatedAt: now });
await writeFile(statePath, JSON.stringify(state), "utf8");
const beforePlaceholder = subagentRuns.length;
await delegate.execute("placeholder", { action: "reconcile", plan_id: placeholderPlanId });
assert.equal(subagentRuns.length, beforePlaceholder + 1);
state = JSON.parse(await readFile(statePath, "utf8"));
const migratedPlaceholder = state.workUnits.find((item) => item.id === placeholderUnitId);
assert.deepEqual({ agentId: migratedPlaceholder.agentId, title: migratedPlaceholder.title, objective: migratedPlaceholder.objective, completionCriteria: migratedPlaceholder.completionCriteria, capability: migratedPlaceholder.capability, inputRefs: migratedPlaceholder.inputRefs }, { agentId: "ops", title: "只读核对", objective: "只读核对配置，不作修改。", completionCriteria: ["给出有效值"], capability: "ops.inspect", inputRefs: ["source-proof"] });
assert.match(subagentRuns.at(-1).input.message, /只读核对配置，不作修改/);

// A commit-then-timeout is unknown and is never automatically replayed.
const timeoutPlanId = "plan-timeout";
const timeoutPacketId = "packet-timeout";
const timeoutUnitId = "unit-timeout";
state.inbox.push({ id: "inbox-timeout", eventKey: "event-timeout", agentId: "housekeeper", channelId: "811150402", senderId: "811150402", sessionKey: housekeeper.sessionKey, promptHash: "y", prompt: "timeout", profile: "simple_task", status: "delegating", planIds: [timeoutPlanId], cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now });
state.plans.push({ id: timeoutPlanId, inboxId: "inbox-timeout", sourceAgentId: "housekeeper", sourceSessionKey: housekeeper.sessionKey, title: "超时测试", goal: "不得重放", profile: "simple_task", delegationMode: "direct_subagent_v3", status: "planned", packetIds: [timeoutPacketId], createdAt: now, updatedAt: now });
state.packets.push({ id: timeoutPacketId, planId: timeoutPlanId, packetKey: "timeout", targetAgentId: "ops", controllerSessionKey: "agent:ops:task-controller", title: "超时测试", objective: "不得重放", completionCriteria: ["不重放"], capability: "ops.inspect", dependsOn: [], inputRefs: [], delegationMode: "direct_subagent_v3", status: "pending", idempotencyKey: "timeout", workUnitIds: [timeoutUnitId], createdAt: now, updatedAt: now });
state.workUnits.push({ id: timeoutUnitId, planId: timeoutPlanId, packetId: timeoutPacketId, unitKey: "execute", agentId: "ops", title: "超时测试", objective: "不得重放", completionCriteria: ["不重放"], capability: "ops.inspect", dependsOn: [], inputRefs: [], delegationMode: "direct_subagent_v3", idempotencyKey: "timeout-unit", status: "ready", createdAt: now, updatedAt: now });
await writeFile(statePath, JSON.stringify(state), "utf8");
runMode = "throw";
const beforeTimeout = subagentRuns.length;
const timeoutResult = await delegate.execute("timeout", { action: "reconcile", plan_id: timeoutPlanId });
assert.equal(timeoutResult.details.ok, false);
assert.equal(subagentRuns.length, beforeTimeout + 1);
runMode = "ok";
await delegate.execute("timeout-again", { action: "reconcile", plan_id: timeoutPlanId });
assert.equal(subagentRuns.length, beforeTimeout + 1, "unknown launch is not replayed");
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.workUnits.find((item) => item.id === timeoutUnitId).status, "reconcile_required");

// A very short worker may end before subagent.run resolves; the event is merged, never lost or replayed.
const earlyPlanId = "plan-early";
const earlyPacketId = "packet-early";
const earlyUnitId = "unit-early";
state.inbox.push({ id: "inbox-early", eventKey: "event-early", agentId: "housekeeper", channelId: "811150402", senderId: "811150402", sessionKey: housekeeper.sessionKey, promptHash: "e", prompt: "early", profile: "simple_task", status: "delegating", planIds: [earlyPlanId], cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now });
state.plans.push({ id: earlyPlanId, inboxId: "inbox-early", sourceAgentId: "housekeeper", sourceSessionKey: housekeeper.sessionKey, title: "早结束", goal: "验证事件乱序", profile: "simple_task", delegationMode: "direct_subagent_v3", status: "planned", packetIds: [earlyPacketId], createdAt: now, updatedAt: now });
state.packets.push({ id: earlyPacketId, planId: earlyPlanId, packetKey: "early", targetAgentId: "ops", controllerSessionKey: "agent:ops:task-controller", title: "早结束", objective: "只读结束", completionCriteria: ["结束"], capability: "ops.inspect", dependsOn: [], inputRefs: [], delegationMode: "direct_subagent_v3", status: "pending", idempotencyKey: "early", workUnitIds: [earlyUnitId], createdAt: now, updatedAt: now });
state.workUnits.push({ id: earlyUnitId, planId: earlyPlanId, packetId: earlyPacketId, unitKey: "execute", agentId: "ops", title: "早结束", objective: "只读结束", completionCriteria: ["结束"], capability: "ops.inspect", dependsOn: [], inputRefs: [], delegationMode: "direct_subagent_v3", idempotencyKey: "early-unit", status: "ready", createdAt: now, updatedAt: now });
await writeFile(statePath, JSON.stringify(state), "utf8");
runMode = "early-end";
const beforeEarly = subagentRuns.length;
await delegate.execute("early", { action: "reconcile", plan_id: earlyPlanId });
runMode = "ok";
state = JSON.parse(await readFile(statePath, "utf8"));
const earlyLink = state.links.find((item) => item.workUnitId === earlyUnitId);
assert.equal(subagentRuns.length, beforeEarly + 1);
assert.equal(earlyLink.status, "reconcile_required");
assert.equal(earlyLink.observedEndedRunId, earlyLink.runId);
await delegate.execute("early-again", { action: "reconcile", plan_id: earlyPlanId });
assert.equal(subagentRuns.length, beforeEarly + 1, "early-ended work is never launched twice");

// An ok end without receipts first becomes unknown, then explicit reconcile blocks it.
const missingPlanId = "plan-missing";
const missingPacketId = "packet-missing";
const missingUnitId = "unit-missing";
const missingLinkId = "link-missing";
const missingSession = "agent:ops:subagent:task-system-unit-missing-fixednonce";
state.inbox.push({ id: "inbox-missing", eventKey: "event-missing", agentId: "housekeeper", channelId: "811150402", senderId: "811150402", sessionKey: housekeeper.sessionKey, promptHash: "z", prompt: "missing", profile: "simple_task", status: "running", planIds: [missingPlanId], cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now });
state.plans.push({ id: missingPlanId, inboxId: "inbox-missing", sourceAgentId: "housekeeper", sourceSessionKey: housekeeper.sessionKey, title: "缺收据测试", goal: "验证乱序", profile: "simple_task", delegationMode: "direct_subagent_v3", status: "running", packetIds: [missingPacketId], createdAt: now, updatedAt: now });
state.packets.push({ id: missingPacketId, planId: missingPlanId, packetKey: "missing", targetAgentId: "ops", controllerSessionKey: "agent:ops:task-controller", title: "缺收据", objective: "缺收据", completionCriteria: ["核对"], capability: "ops.inspect", dependsOn: [], inputRefs: [], delegationMode: "direct_subagent_v3", status: "running", idempotencyKey: "missing", workUnitIds: [missingUnitId], createdAt: now, updatedAt: now });
state.workUnits.push({ id: missingUnitId, planId: missingPlanId, packetId: missingPacketId, unitKey: "execute", agentId: "ops", title: "缺收据", objective: "缺收据", completionCriteria: ["核对"], capability: "ops.inspect", dependsOn: [], inputRefs: [], delegationMode: "direct_subagent_v3", idempotencyKey: "missing-unit", status: "running", createdAt: now, updatedAt: now });
state.links.push({ id: missingLinkId, inboxId: "inbox-missing", planId: missingPlanId, packetId: missingPacketId, workUnitId: missingUnitId, assignee: "ops", dispatchKind: "subagent_direct", generation: 1, launchNonce: "fixednonce-123456789", idempotencyKey: "missing-unit:1", childSessionKey: missingSession, runId: "missing-run", status: "running", createdAt: now, updatedAt: now });
await writeFile(statePath, JSON.stringify(state), "utf8");
await hooks.get("subagent_ended")({ targetSessionKey: missingSession, targetKind: "subagent", reason: "completed", runId: "missing-run", outcome: "ok", endedAt: Date.now() });
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.links.find((item) => item.id === missingLinkId).status, "reconcile_required");
await delegate.execute("missing-reconcile", { action: "reconcile", plan_id: missingPlanId });
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.links.find((item) => item.id === missingLinkId).status, "blocked");
assert.equal(state.plans.find((item) => item.id === missingPlanId).status, "blocked");

// A synchronous preflight failure is the only automatically recoverable delivery failure.
const preflightPlanId = "plan-preflight-notification";
state.inbox.push({ id: "inbox-preflight-notification", eventKey: "event-preflight-notification", agentId: "housekeeper", accountId: "housekeeper", channelId: "telegram", senderId: "811150402", sessionKey: housekeeper.sessionKey, promptHash: "n", prompt: "notification", profile: "simple_task", status: "delegating", planIds: [preflightPlanId], cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now });
state.plans.push({ id: preflightPlanId, inboxId: "inbox-preflight-notification", sourceAgentId: "housekeeper", sourceSessionKey: housekeeper.sessionKey, title: "通知预检恢复", goal: "只测通知", profile: "simple_task", status: "planned", packetIds: [], createdAt: now, updatedAt: now });
await writeFile(statePath, JSON.stringify(state), "utf8");
const beforePreflight = outboundSends.length;
outboundMode = "unavailable";
await delegate.execute("preflight-block", { action: "block", plan_id: preflightPlanId, reason: "测试预检" });
state = JSON.parse(await readFile(statePath, "utf8"));
let preflightOutbox = state.outbox.find((item) => item.eventKey === `task-plan-completion:${preflightPlanId}`);
assert.equal(preflightOutbox.status, "failed_before_dispatch");
assert.equal(preflightOutbox.generation, 0);
assert.equal(outboundSends.length, beforePreflight);
outboundMode = "sent";
await delegate.execute("preflight-reconcile", { action: "reconcile", plan_id: preflightPlanId });
state = JSON.parse(await readFile(statePath, "utf8"));
preflightOutbox = state.outbox.find((item) => item.eventKey === `task-plan-completion:${preflightPlanId}`);
assert.equal(preflightOutbox.status, "sent");
assert.equal(preflightOutbox.generation, 1);
assert.equal(outboundSends.length, beforePreflight + 1);

// A thrown send is unknown and repeated terminal callbacks never retry it.
const unknownPlanId = "plan-unknown-notification";
state.inbox.push({ id: "inbox-unknown-notification", eventKey: "event-unknown-notification", agentId: "housekeeper", accountId: "housekeeper", channelId: "telegram", senderId: "811150402", sessionKey: housekeeper.sessionKey, promptHash: "u", prompt: "notification unknown", profile: "simple_task", status: "delegating", planIds: [unknownPlanId], cardIds: [], expectedModules: [], revision: 1, createdAt: now, updatedAt: now });
state.plans.push({ id: unknownPlanId, inboxId: "inbox-unknown-notification", sourceAgentId: "housekeeper", sourceSessionKey: housekeeper.sessionKey, title: "通知结果未知", goal: "只测通知", profile: "simple_task", status: "planned", packetIds: [], createdAt: now, updatedAt: now });
await writeFile(statePath, JSON.stringify(state), "utf8");
outboundMode = "throw";
const beforeUnknown = outboundSends.length;
await delegate.execute("unknown-block", { action: "block", plan_id: unknownPlanId, reason: "测试未知" });
await delegate.execute("unknown-block-again", { action: "block", plan_id: unknownPlanId, reason: "测试未知" });
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.outbox.find((item) => item.eventKey === `task-plan-completion:${unknownPlanId}`).status, "unknown");
assert.equal(outboundSends.length, beforeUnknown + 1, "unknown delivery is never automatically retried");
outboundMode = "sent";

// Cancellation cascades and late events cannot revive any layer.
await delegate.execute("cancel-orphan", { action: "cancel", plan_id: orphanPlanId, reason: "test cancellation" });
state = JSON.parse(await readFile(statePath, "utf8"));
assert.equal(state.plans.find((item) => item.id === orphanPlanId).status, "cancelled");
assert.ok(state.packets.filter((item) => item.planId === orphanPlanId).every((item) => item.status === "cancelled"));
assert.ok(state.workUnits.filter((item) => item.planId === orphanPlanId).every((item) => item.status === "cancelled"));
assert.ok(state.links.filter((item) => item.planId === orphanPlanId).every((item) => item.status === "cancelled"));

const beforeGatewayStart = subagentRuns.length;
await hooks.get("gateway_start")({}, {});
assert.equal(subagentRuns.length, beforeGatewayStart, "gateway_start never replays work");

await rm(temporary, { recursive: true, force: true });
console.log("TASK_SYSTEM_CONTROL_V3_TEST_OK");
