import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin, { actionFingerprint } from "../dist/index.js";

let toolFactory;
const hooks = new Map();
const temporary = await mkdtemp(join(tmpdir(), "workflow-governance-"));
const riskStatePath = join(temporary, "risk.json");
const records = new Map();
let seq = 0;
let taskSummary = { total: 0, active: 0, terminal: 0, failures: 0 };
const bound = {
  createManaged(p) { const f = { ...p, flowId: `flow-${++seq}`, revision: 1, stateJson: p.stateJson }; records.set(f.flowId, f); return f; },
  get(id) { return records.get(id); }, list() { return [...records.values()]; }, getTaskSummary() { return taskSummary; },
  resume(p) { const f = records.get(p.flowId); if (!f || f.revision !== p.expectedRevision) return { applied: false, code: "revision_conflict" }; Object.assign(f, p, { revision: f.revision + 1 }); return { applied: true, flow: f }; },
  setWaiting(p) { return this.resume(p); },
  finish(p) { const r = this.resume(p); if (r.applied) r.flow.status = "succeeded"; return r; }
};
const api = {
  pluginConfig: { agents: ["housekeeper", "ops"], riskAgentId: "ops", controllerSessionKey: "agent:housekeeper:task-system", ownerTelegramId: "811150402", riskStatePath },
  logger: { warn() {} },
  runtime: { tasks: { flow: { bindSession(input) { assert.equal(input.sessionKey, "agent:housekeeper:task-system"); return bound; } } } },
  on(name, handler) { hooks.set(name, handler); },
  registerTool(factory) { toolFactory = factory; }
};
plugin.register(api);
assert.equal(toolFactory({ agentId: "life", sessionKey: "x" }), null);
const tool = toolFactory({ agentId: "housekeeper", sessionKey: "agent:housekeeper:test" });
const create = await tool.execute("1", { action: "create", goal: "repair", workflow_profile: "research_plan_triple_review", acceptance_criteria: ["a", "b"] });
const flowId = create.details.flow.flowId;
const planHash = "a".repeat(64);
await tool.execute("2", { action: "set_plan", flow_id: flowId, plan_hash: planHash });
for (let n = 1; n <= 3; n++) {
  const reviewed = await tool.execute(String(n + 2), { action: "record_review", flow_id: flowId, plan_hash: planHash, review_number: n, review_scope: "independent_complete", review_evidence_hash: String(n).repeat(64), review_nonce: `review-${n}-unique`, finding_count: 0 });
  assert.equal(reviewed.details.ok, true);
}
const begun = await tool.execute("6", { action: "begin_execution", flow_id: flowId });
assert.equal(begun.details.flow.stateJson.stage, "implementation");
await tool.execute("7", { action: "set_stage", flow_id: flowId, stage: "validation" });
await tool.execute("8", { action: "set_stage", flow_id: flowId, stage: "documentation" });
await tool.execute("9", { action: "set_stage", flow_id: flowId, stage: "sync" });
const linkedWithoutProof = await tool.execute("9a", { action: "link_work", flow_id: flowId, card_id: "card-1", run_id: "run-1", task_id: "task-1", mirrored_flow_id: "mirror-1", work_status: "succeeded" });
assert.equal(linkedWithoutProof.details.ok, true);
taskSummary = { total: 2, active: 0, terminal: 2, failures: 1 };
const early = await tool.execute("10", { action: "ready_to_notify", flow_id: flowId, acceptance_evidence: ["b".repeat(64), "c".repeat(64)] });
assert.equal(early.details.ok, false);
assert.match(early.details.error, /completion proof receipt/);
await tool.execute("10a", { action: "link_work", flow_id: flowId, card_id: "card-1", run_id: "run-1", task_id: "task-1", mirrored_flow_id: "mirror-1", work_status: "succeeded", proof_receipt: "d".repeat(64) });
taskSummary = { total: 2, active: 0, terminal: 2, failures: 0 };
const ready = await tool.execute("11", { action: "ready_to_notify", flow_id: flowId, acceptance_evidence: ["b".repeat(64), "c".repeat(64)] });
assert.equal(ready.details.ok, true);
assert.equal(ready.details.flow.stateJson.stage, "notification_pending");
const riskHook = hooks.get("before_tool_call");
const opsContext = { agentId: "ops", sessionKey: "agent:ops:telegram:direct:811150402", channel: "telegram", channelId: "telegram" };
const low = await riskHook({ toolName: "exec", params: { command: "git status" } }, { agentId: "ops" });
assert.equal(low, undefined);
const credentialRead = await riskHook({ toolName: "exec", params: { command: "rg password openclaw.json" } }, opsContext);
assert.equal(credentialRead, undefined, "read-only credential text search must not be classified as high risk");
const highEvent = { toolName: "exec", toolCallId: "high-1", params: { command: "openclaw gateway restart" } };
const high = await riskHook(highEvent, opsContext);
assert.equal(high.block, true);
assert.match(high.blockReason, /高风险动作/);
assert.match(high.blockReason, /只询问一次/);
assert.match(high.blockReason, /原生审批卡/);
assert.equal(high.requireApproval, undefined);
assert.doesNotMatch(high.blockReason, /CWD|UUID|Host|Task|Card/);
const repeatedHigh = await riskHook(highEvent, opsContext);
assert.match(repeatedHigh.blockReason, /不得重复询问/);
const secondHigh = await riskHook({ toolName: "exec", toolCallId: "high-2", params: { command: "shutdown /s" } }, opsContext);
assert.match(secondHigh.blockReason, /不得再新建或询问第二项/);
await hooks.get("before_agent_run")({ prompt: "同意执行", messages: [], channelId: "telegram", senderId: "811150402", senderIsOwner: true }, opsContext);
const approvalContext = await hooks.get("agent_turn_prepare")({ prompt: "", messages: [], queuedInjections: [] }, opsContext);
assert.match(approvalContext.appendContext, /明确同意/);
const allowedHigh = await riskHook(highEvent, opsContext);
assert.equal(allowedHigh, undefined);
await hooks.get("after_tool_call")({ ...highEvent, result: { ok: true } }, opsContext);

const mediumEvent = { toolName: "exec", toolCallId: "medium-1", params: { command: "git commit -m repair" } };
const medium = await riskHook(mediumEvent, opsContext);
assert.equal(medium.block, true);
assert.match(medium.blockReason, /不要询问少主/);
const fingerprint = actionFingerprint("exec", mediumEvent.params);
const opsTool = toolFactory({ ...opsContext, deliveryContext: { channel: "telegram", accountId: "default", to: "811150402" } });
const preflight = await opsTool.execute("12", { action: "record_preflight", action_fingerprint: fingerprint, scope_summary: "只提交当前修复文件", backup_summary: "保留当前提交引用", rollback_summary: "撤销该增量提交" });
assert.equal(preflight.details.preflightReady, true);
const allowedMedium = await riskHook(mediumEvent, opsContext);
assert.equal(allowedMedium, undefined);
await hooks.get("after_tool_call")({ ...mediumEvent, result: { ok: true } }, opsContext);
await rm(temporary, { recursive: true, force: true });
console.log("WORKFLOW_GOVERNANCE_TEST_OK");
