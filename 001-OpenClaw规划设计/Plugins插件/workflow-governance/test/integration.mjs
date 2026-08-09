import assert from "node:assert/strict";
import plugin from "../dist/index.js";

let toolFactory;
let riskHook;
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
  pluginConfig: { agents: ["housekeeper", "ops"], riskAgentId: "ops" },
  logger: { warn() {} },
  runtime: { tasks: { flow: { fromToolContext() { return bound; } } } },
  on(name, handler) { if (name === "before_tool_call") riskHook = handler; },
  registerTool(factory) { toolFactory = factory; }
};
plugin.register(api);
assert.equal(toolFactory({ agentId: "life", sessionKey: "x" }), null);
const tool = toolFactory({ agentId: "housekeeper", sessionKey: "agent:housekeeper:test" });
const create = await tool.execute("1", { action: "create", goal: "repair", acceptance_criteria: ["a", "b"] });
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
taskSummary = { total: 2, active: 0, terminal: 2, failures: 1 };
const early = await tool.execute("10", { action: "ready_to_notify", flow_id: flowId, acceptance_evidence: ["b".repeat(64), "c".repeat(64)] });
assert.equal(early.details.ok, false);
assert.match(early.details.error, /child tasks/);
taskSummary = { total: 2, active: 0, terminal: 2, failures: 0 };
const ready = await tool.execute("11", { action: "ready_to_notify", flow_id: flowId, acceptance_evidence: ["b".repeat(64), "c".repeat(64)] });
assert.equal(ready.details.ok, true);
assert.equal(ready.details.flow.stateJson.stage, "notification_pending");
const low = await riskHook({ toolName: "exec", params: { command: "git status" } }, { agentId: "ops" });
assert.equal(low, undefined);
const high = await riskHook({ toolName: "exec", params: { command: "openclaw gateway restart" } }, { agentId: "ops" });
assert.equal(high.block, true);
assert.match(high.blockReason, /高风险操作/);
assert.match(high.blockReason, /只询问一次/);
assert.match(high.blockReason, /不得弹出原生审批卡/);
assert.equal(high.requireApproval, undefined);
assert.doesNotMatch(high.blockReason, /CWD|UUID|Host|Task|Card/);
console.log("WORKFLOW_GOVERNANCE_TEST_OK");
