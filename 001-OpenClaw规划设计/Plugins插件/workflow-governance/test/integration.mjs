import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin, { actionFingerprint } from "../dist/index.js";

let toolFactory;
const hooks = new Map();
const temporary = await mkdtemp(join(tmpdir(), "workflow-governance-"));
const riskStatePath = join(temporary, "risk.json");
const taskStatePath = join(temporary, "task-state.json");
const opsSessionKey = "agent:ops:telegram:direct:811150402";
const records = new Map();
let seq = 0;
let taskSummary = { total: 0, active: 0, terminal: 0, failures: 0 };
let subagentCallCount = 0;

async function setupWorkContext(sessionKey) {
  const state = { links: [{ childSessionKey: sessionKey, planId: "plan-1", packetId: "pkt-1", workUnitId: "wu-1", cardId: "card-1", assignee: "ops" }] };
  await writeFile(taskStatePath, JSON.stringify(state, null, 2));
}

const bound = {
  createManaged(p) { const f = { ...p, flowId: `flow-${++seq}`, revision: 1, stateJson: p.stateJson }; records.set(f.flowId, f); return f; },
  get(id) { return records.get(id); }, list() { return [...records.values()]; }, getTaskSummary() { return taskSummary; },
  resume(p) { const f = records.get(p.flowId); if (!f || f.revision !== p.expectedRevision) return { applied: false, code: "revision_conflict" }; Object.assign(f, p, { revision: f.revision + 1 }); return { applied: true, flow: f }; },
  setWaiting(p) { return this.resume(p); },
  finish(p) { const r = this.resume(p); if (r.applied) r.flow.status = "succeeded"; return r; }
};

const telegramSendResult = { messageId: "tg-msg-12345" };
let telegramShouldFail = false;
let telegramShouldReturnEmpty = false;

const api = {
  pluginConfig: {
    agents: ["housekeeper", "ops", "reviewer"],
    riskAgentId: "ops",
    riskAgentIds: ["ops", "coder"],
    decisionAgentId: "housekeeper",
    reviewerAgentId: "reviewer",
    controllerSessionKey: "agent:housekeeper:task-system",
    ownerTelegramId: "811150402",
    ownerSessionKey: "agent:housekeeper:telegram:direct:811150402",
    riskStatePath,
    taskStatePath
  },
  logger: { warn() {} },
  runtime: {
    config: { current: () => ({}) },
    tasks: { flow: { bindSession(input) { assert.equal(input.sessionKey, "agent:housekeeper:task-system"); return bound; } } },
    subagent: {
      run: async (params) => {
        subagentCallCount++;
        if (params.sessionKey?.startsWith("agent:reviewer:")) {
          return JSON.stringify({ verdict: "approve", reason: "no issues found", findings: [] });
        }
        if (params.sessionKey?.includes("draft-")) {
          return "少主，本宫准备执行一项重要维护操作。这会影响系统暂时不可用，最坏情况是服务需要从备份恢复。出问题可以回退到操作前的备份。已经由审核员独立审核三次。这是事前告知，不用回复，我会按计划继续。预计今天内完成。";
        }
        return "";
      }
    },
    channel: {
      outbound: {
        loadAdapter: async (id) => {
          if (id !== "telegram") return undefined;
          return {
            sendText: async (ctx) => {
              if (telegramShouldFail) throw new Error("telegram send failed");
              if (telegramShouldReturnEmpty) return { messageId: "" };
              return telegramSendResult;
            }
          };
        }
      }
    },
    gateway: { request: async () => {} }
  },
  on(name, handler) { hooks.set(name, handler); },
  registerTool(factory) { toolFactory = factory; }
};

plugin.register(api);
assert.equal(toolFactory({ agentId: "life", sessionKey: "x" }), null);

const tool = toolFactory({ agentId: "housekeeper", sessionKey: "agent:housekeeper:test" });

// === Task Flow tests (unchanged from 1.2.0) ===
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
await tool.execute("9a", { action: "link_work", flow_id: flowId, card_id: "card-1", run_id: "run-1", task_id: "task-1", mirrored_flow_id: "mirror-1", work_status: "succeeded" });
taskSummary = { total: 2, active: 0, terminal: 2, failures: 1 };
const early = await tool.execute("10", { action: "ready_to_notify", flow_id: flowId, acceptance_evidence: ["b".repeat(64), "c".repeat(64)] });
assert.equal(early.details.ok, false);
await tool.execute("10a", { action: "link_work", flow_id: flowId, card_id: "card-1", run_id: "run-1", task_id: "task-1", mirrored_flow_id: "mirror-1", work_status: "succeeded", proof_receipt: "d".repeat(64) });
taskSummary = { total: 2, active: 0, terminal: 2, failures: 0 };
const ready = await tool.execute("11", { action: "ready_to_notify", flow_id: flowId, acceptance_evidence: ["b".repeat(64), "c".repeat(64)] });
assert.equal(ready.details.ok, true);
assert.equal(ready.details.flow.stateJson.stage, "notification_pending");
const acked = await tool.execute("11b", { action: "acknowledge_notification", flow_id: flowId, notification_message_id: "msg-final" });
assert.equal(acked.details.flow.stateJson.stage, "completed");

// === Risk gate tests ===
const riskHook = hooks.get("before_tool_call");
const afterHook = hooks.get("after_tool_call");
const opsContext = { agentId: "ops", sessionKey: opsSessionKey, channel: "telegram", channelId: "telegram" };
await setupWorkContext(opsSessionKey);

// Test 1: Low risk auto-pass
const low = await riskHook({ toolName: "exec", params: { command: "git status" } }, opsContext);
assert.equal(low, undefined, "low risk must auto-pass");

// Test 2: No work context → blocked
const noWorkCtx = { agentId: "ops", sessionKey: "agent:ops:nowork", channel: "telegram" };
const noWork = await riskHook({ toolName: "exec", params: { command: "openclaw gateway restart" } }, noWorkCtx);
assert.equal(noWork.block, true);
assert.match(noWork.blockReason, /正式工作单元/);

// Test 3: Read-only credential search not classified as high risk
const credRead = await riskHook({ toolName: "exec", params: { command: "rg password openclaw.json" } }, opsContext);
assert.equal(credRead, undefined, "read-only credential text search must not be high risk");

// Test 4: High risk → preflight_required, blocks, tells agent to call review_high_risk
const highEvent = { toolName: "exec", toolCallId: "high-1", params: { command: "openclaw gateway restart" } };
const high = await riskHook(highEvent, opsContext);
assert.equal(high.block, true);
assert.match(high.blockReason, /高风险动作/);
assert.match(high.blockReason, /review_high_risk/);
assert.match(high.blockReason, /不要询问少主/);
assert.doesNotMatch(high.blockReason, /CWD|UUID|Host/);

// Test 5: Repeat high risk pending → blocked
const repeatHigh = await riskHook(highEvent, opsContext);
assert.match(repeatHigh.blockReason, /等待审核/);

// Test 6: Second high risk while first pending → blocked
const secondHigh = await riskHook({ toolName: "exec", toolCallId: "high-2", params: { command: "shutdown /s" } }, opsContext);
assert.match(secondHigh.blockReason, /暂停|不得并行/);

// Test 7: review_high_risk → three reviews + notification → notified
const opsTool = toolFactory({ ...opsContext, deliveryContext: { channel: "telegram", accountId: "default", to: "811150402" } });
const fingerprint = actionFingerprint("exec", highEvent.params);
subagentCallCount = 0;
const review = await opsTool.execute("20", { action: "review_high_risk", action_fingerprint: fingerprint, scope_summary: "重启 Gateway 服务", backup_summary: "已备份当前配置", rollback_summary: "恢复原配置并重启" });
assert.equal(review.details.ok, true);
assert.equal(review.details.notified, true);
assert.equal(subagentCallCount, 4, "should call subagent 4 times (3 reviews + 1 draft)");
assert.match(review.details.instruction, /不用等待少主回复/);

// Test 8: Concurrent review_high_risk → rejected
const concurrent = await opsTool.execute("21", { action: "review_high_risk", action_fingerprint: fingerprint, scope_summary: "重启", backup_summary: "备份", rollback_summary: "回退" });
assert.equal(concurrent.details.ok, false);

// Test 9: Retry same command after notification → allowed (executing)
const allowedHigh = await riskHook(highEvent, opsContext);
assert.equal(allowedHigh, undefined, "notified high-risk should be allowed to execute once");

// Test 10: After execution success → completed
await afterHook({ ...highEvent, result: { ok: true } }, opsContext);

// Test 11: Execution error → execution_failed (no auto-retry) — uses different command
const errEvent = { toolName: "exec", toolCallId: "err-1", params: { command: "reboot now" } };
const errHigh = await riskHook(errEvent, opsContext);
assert.equal(errHigh.block, true);
const errFingerprint = actionFingerprint("exec", errEvent.params);
const errReview = await opsTool.execute("30", { action: "review_high_risk", action_fingerprint: errFingerprint, scope_summary: "重启", backup_summary: "备份", rollback_summary: "回退" });
assert.equal(errReview.details.ok, true);
assert.equal(errReview.details.notified, true);
await riskHook(errEvent, opsContext);
await afterHook({ ...errEvent, error: true, result: null }, opsContext);
// execution_failed is a terminal state — record excluded from search, no auto-retry

// Test 13: Medium risk → preflight → approved → execute → completed
const mediumEvent = { toolName: "exec", toolCallId: "medium-1", params: { command: "git commit -m repair" } };
const medium = await riskHook(mediumEvent, opsContext);
assert.equal(medium.block, true);
assert.match(medium.blockReason, /不要询问少主/);
const medFingerprint = actionFingerprint("exec", mediumEvent.params);
const preflight = await opsTool.execute("40", { action: "record_preflight", action_fingerprint: medFingerprint, scope_summary: "提交修复", backup_summary: "保留引用", rollback_summary: "撤销提交" });
assert.equal(preflight.details.preflightReady, true);
const allowedMedium = await riskHook(mediumEvent, opsContext);
assert.equal(allowedMedium, undefined, "approved medium-risk should be allowed");
await afterHook({ ...mediumEvent, result: { ok: true } }, opsContext);

// Test 14: Notification failure (telegram error) → review_blocked, no execution
const failEvent = { toolName: "exec", toolCallId: "fail-1", params: { command: "mkfs /dev/sda1" } };
const failHigh = await riskHook(failEvent, opsContext);
assert.equal(failHigh.block, true);
telegramShouldFail = true;
const failFingerprint = actionFingerprint("exec", failEvent.params);
const failReview = await opsTool.execute("50", { action: "review_high_risk", action_fingerprint: failFingerprint, scope_summary: "格式化", backup_summary: "备份", rollback_summary: "恢复" });
assert.equal(failReview.details.ok, false);
assert.equal(failReview.details.blocked, true);
assert.match(failReview.details.reason, /telegram/);
telegramShouldFail = false;

// Test 15: Notification returns empty messageId → review_blocked
const emptyEvent = { toolName: "exec", toolCallId: "empty-1", params: { command: "reboot" } };
const emptyHigh = await riskHook(emptyEvent, opsContext);
assert.equal(emptyHigh.block, true);
telegramShouldReturnEmpty = true;
const emptyFingerprint = actionFingerprint("exec", emptyEvent.params);
const emptyReview = await opsTool.execute("60", { action: "review_high_risk", action_fingerprint: emptyFingerprint, scope_summary: "重启", backup_summary: "备份", rollback_summary: "回退" });
assert.equal(emptyReview.details.ok, false);
assert.equal(emptyReview.details.blocked, true);
assert.match(emptyReview.details.reason, /empty message ID/);
telegramShouldReturnEmpty = false;

// Test 16: risk_status shows pending items
const status = await opsTool.execute("70", { action: "risk_status" });
assert.equal(status.details.ok, true);

await rm(temporary, { recursive: true, force: true });
console.log("WORKFLOW_GOVERNANCE_TEST_OK");
