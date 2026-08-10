#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const NODE = "/Volume3/@apps/openclaw/node/bin/node";
const CLI = "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs";
const OWNER = "811150402";
const LIFE_SESSION = `agent:life:telegram:direct:${OWNER}`;
const HOUSEKEEPER_SESSION = `agent:housekeeper:telegram:direct:${OWNER}`;
const MARKER = "TS-ACCEPT-20260810";
const TEST_DATE = "2099-12-31";
const RUN_NONCE = `${Date.now()}-${process.pid}`;

function parseCliJson(raw) {
  const text = String(raw);
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((value) => value >= 0);
  if (!starts.length) throw new Error("OpenClaw CLI did not return JSON");
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  return JSON.parse(text.slice(start, end + 1));
}

function invoke({ name, agentId, sessionKey, args, key, timeoutMs = 30000 }) {
  const params = { name, agentId, sessionKey, args, idempotencyKey: `${MARKER}:${RUN_NONCE}:${key}` };
  const response = parseCliJson(execFileSync(NODE, [
    CLI, "gateway", "call", "tools.invoke", "--params", JSON.stringify(params),
    "--timeout", String(timeoutMs), "--json"
  ], {
    encoding: "utf8",
    env: { ...process.env, HOME: "/Volume3/OpenClaw/home" },
    maxBuffer: 64 * 1024 * 1024
  }));
  if (response.ok !== true || response.output?.details === undefined) {
    throw new Error(`tool invoke failed (${name}): ${JSON.stringify(response)}`);
  }
  return response.output.details;
}

function life(args, key, timeoutMs) {
  return invoke({ name: "morning_brief_control", agentId: "life", sessionKey: LIFE_SESSION, args, key, timeoutMs });
}

function housekeeper(name, args, key, timeoutMs) {
  return invoke({ name, agentId: "housekeeper", sessionKey: HOUSEKEEPER_SESSION, args, key, timeoutMs });
}

function hash(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function assertOk(details, label) {
  assert.equal(details.ok, true, `${label}: ${JSON.stringify(details)}`);
  return details;
}

function validateModules() {
  const noteModules = ["header", "weather", "aqi", "attire", "disciples", "folk_calendar"];
  const created = { notes: [], eventId: undefined, taskId: undefined };
  let projection;
  let cleanupProjection;
  try {
    for (const module of noteModules) {
      const details = assertOk(life({
        action: "upsert_note", module, content: `${MARKER}-${module}-v1`,
        start_date: TEST_DATE, end_date: TEST_DATE, dedupe_key: `${MARKER}-${module}`
      }, `module-create-${module}`), `create ${module}`);
      assert.deepEqual(details.sections?.length, 1);
      created.notes.push({ module, id: details.recordId });
    }
    const headerUpdate = assertOk(life({
      action: "upsert_note", module: "header", content: `${MARKER}-header-v2`,
      start_date: TEST_DATE, end_date: TEST_DATE, dedupe_key: `${MARKER}-header`
    }, "module-update-header"), "update header");
    assert.equal(headerUpdate.recordId, created.notes.find((item) => item.module === "header")?.id);

    const task = assertOk(life({
      action: "upsert_task", title: `${MARKER}-task`, task_status: "todo",
      due_date: TEST_DATE, task_note: "reversible acceptance fixture", dedupe_key: `${MARKER}-task`
    }, "module-create-task"), "create task");
    created.taskId = task.recordId;

    const event = assertOk(life({
      action: "upsert_event", title: `${MARKER}-event`,
      event_at: `${TEST_DATE}T15:00:00+08:00`, reminder_minutes: 60,
      recurrence: "none", dedupe_key: `${MARKER}-event`
    }, "module-create-event"), "create event");
    created.eventId = event.recordId;
    assert.equal(Date.parse(event.eventAt) - Date.parse(event.reminderAt), 60 * 60_000);

    projection = assertOk(life({ action: "get_day", date: TEST_DATE }, "module-project"), "project day");
    const serialized = JSON.stringify(projection);
    for (const module of noteModules) assert.match(serialized, new RegExp(`${MARKER}-${module}`));
    assert.match(serialized, new RegExp(`${MARKER}-task`));
    assert.match(serialized, new RegExp(`${MARKER}-event`));
  } finally {
    if (created.eventId) assertOk(life({ action: "cancel_event", event_id: created.eventId }, "module-clean-event"), "cancel event");
    if (created.taskId) assertOk(life({ action: "archive_task", task_id: created.taskId }, "module-clean-task"), "archive task");
    for (const note of created.notes) {
      if (note.id) assertOk(life({ action: "archive_note", note_id: note.id }, `module-clean-${note.module}`), `archive ${note.module}`);
    }
    cleanupProjection = assertOk(life({ action: "get_day", date: TEST_DATE }, "module-clean-project"), "project cleaned day");
    assert.doesNotMatch(JSON.stringify(cleanupProjection), new RegExp(MARKER));
  }
  return {
    ok: true,
    action: "validate-modules",
    modules: ["header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"],
    createUpdateInspectCancel: true,
    oneHourReminder: true,
    cleanupVerified: true,
    projectionRevision: projection?.revision,
    cleanupRevision: cleanupProjection?.revision
  };
}

function validateWorkflow() {
  const planHash = hash(`${MARKER}:plan`);
  const evidence = [1, 2, 3].map((number) => hash(`${MARKER}:review:${number}`));
  const acceptanceEvidence = hash(`${MARKER}:acceptance`);
  const created = assertOk(housekeeper("workflow_governance", {
    action: "create", goal: `${MARKER} triple-review gate fixture`,
    workflow_profile: "research_plan_triple_review", acceptance_criteria: ["all gates behave deterministically"]
  }, "workflow-create"), "create workflow");
  const flowId = created.flow?.flowId;
  assert.ok(flowId);
  assertOk(housekeeper("workflow_governance", { action: "set_plan", flow_id: flowId, plan_hash: planHash }, "workflow-plan"), "set plan");
  const early = housekeeper("workflow_governance", { action: "begin_execution", flow_id: flowId }, "workflow-early-execution");
  assert.equal(early.ok, false);
  assert.match(String(early.error), /three independent complete reviews/);

  assertOk(housekeeper("workflow_governance", {
    action: "record_review", flow_id: flowId, plan_hash: planHash, review_number: 1,
    review_scope: "independent_complete", review_evidence_hash: evidence[0], review_nonce: `${MARKER}-nonce-0001`, finding_count: 0
  }, "workflow-review-1"), "review 1");
  const duplicate = housekeeper("workflow_governance", {
    action: "record_review", flow_id: flowId, plan_hash: planHash, review_number: 2,
    review_scope: "independent_complete", review_evidence_hash: evidence[1], review_nonce: `${MARKER}-nonce-0001`, finding_count: 0
  }, "workflow-review-duplicate");
  assert.equal(duplicate.ok, false);
  assert.match(String(duplicate.error), /independent evidence and nonce/);

  for (const number of [2, 3]) {
    assertOk(housekeeper("workflow_governance", {
      action: "record_review", flow_id: flowId, plan_hash: planHash, review_number: number,
      review_scope: "independent_complete", review_evidence_hash: evidence[number - 1],
      review_nonce: `${MARKER}-nonce-000${number}`, finding_count: 0
    }, `workflow-review-${number}`), `review ${number}`);
  }
  assertOk(housekeeper("workflow_governance", { action: "begin_execution", flow_id: flowId }, "workflow-begin"), "begin execution");
  const invalidStage = housekeeper("workflow_governance", { action: "set_stage", flow_id: flowId, stage: "documentation" }, "workflow-invalid-stage");
  assert.equal(invalidStage.ok, false);
  for (const stage of ["validation", "documentation", "sync"]) {
    assertOk(housekeeper("workflow_governance", { action: "set_stage", flow_id: flowId, stage }, `workflow-stage-${stage}`), `stage ${stage}`);
  }
  const ready = assertOk(housekeeper("workflow_governance", {
    action: "ready_to_notify", flow_id: flowId, acceptance_evidence: [acceptanceEvidence], unfixable_items: []
  }, "workflow-ready"), "ready to notify");
  assert.match(String(ready.eventKey), /^workflow:/);
  assertOk(housekeeper("workflow_governance", {
    action: "block", flow_id: flowId, blocked_reason: "acceptance fixture retained as evidence; no user notification was sent"
  }, "workflow-fixture-block"), "close fixture without fake notification");
  const inspected = assertOk(housekeeper("workflow_governance", { action: "inspect", flow_id: flowId }, "workflow-inspect"), "inspect workflow");
  assert.equal(inspected.flow?.currentStep, "blocked");
  return {
    ok: true,
    action: "validate-workflow",
    flowId,
    earlyExecutionBlocked: true,
    duplicateReviewBlocked: true,
    threeIndependentReviewsRequired: true,
    orderedStagesRequired: true,
    notificationGateReached: true,
    fakeNotificationAvoided: true
  };
}

function validateMorningHandoff() {
  const date = "2099-12-30";
  const dedupe = `${MARKER}-morning-handoff`;
  const sourceAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  let recordId;
  try {
    const result = assertOk(housekeeper("morning_brief_handoff", {
      action: "submit", control_action: "upsert_note", source_at: sourceAt, expires_at: expiresAt,
      dedupe_key: dedupe, payload: { module: "header", content: `${MARKER}-morning-handoff`, start_date: date, end_date: date, dedupe_key: dedupe }
    }, "morning-handoff-submit", 150000), "submit morning handoff");
    assert.equal(result.applied, true);
    recordId = result.result?.recordId;
    assert.ok(recordId);
    const projected = assertOk(life({ action: "get_day", date }, "morning-handoff-project"), "project morning handoff");
    assert.match(JSON.stringify(projected), new RegExp(`${MARKER}-morning-handoff`));
    return { ok: true, action: "validate-morning-handoff", applied: true, projected: true, cleanupVerified: true };
  } finally {
    if (recordId) assertOk(life({ action: "archive_note", note_id: recordId }, "morning-handoff-clean"), "clean morning handoff");
    const cleaned = assertOk(life({ action: "get_day", date }, "morning-handoff-clean-project"), "project cleaned morning handoff");
    assert.doesNotMatch(JSON.stringify(cleaned), new RegExp(`${MARKER}-morning-handoff`));
  }
}

function findRecordId(value, marker) {
  if (!value || typeof value !== "object") return undefined;
  if (!Array.isArray(value)) {
    const record = value;
    const searchable = [record.content, record.title, record.note].filter((item) => typeof item === "string").join(" ");
    if (searchable.includes(marker) && typeof record.id === "string") return record.id;
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findRecordId(child, marker);
    if (found) return found;
  }
  return undefined;
}

function validateTaskHandoff() {
  const date = "2099-12-29";
  const dedupe = `${MARKER}-task-handoff`;
  const content = `${MARKER}-task-handoff-content`;
  let recordId;
  let finalStatus;
  try {
    const submitted = assertOk(housekeeper("task_handoff", {
      action: "submit", target_agent: "life", capability: "晨间玉简抬头与晨辞录入",
      expected_tool: "morning_brief_control", dedupe_key: dedupe,
      payload: { action: "upsert_note", module: "header", content, start_date: date, end_date: date, dedupe_key: dedupe }
    }, "task-handoff-submit"), "submit task-system handoff");
    assert.equal(submitted.submitted, true);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const status = assertOk(housekeeper("task_handoff", { action: "status", handoff_id: dedupe }, `task-handoff-status-${attempt}`), "inspect task-system handoff");
      finalStatus = status.status;
      if (["applied", "blocked", "cancelled"].includes(finalStatus)) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
    }
    assert.equal(finalStatus, "applied");
    const projected = assertOk(life({ action: "get_day", date }, "task-handoff-project"), "project task-system handoff");
    assert.match(JSON.stringify(projected), new RegExp(content));
    recordId = findRecordId(projected, content);
    assert.ok(recordId, "applied handoff record id was not projected");
    return { ok: true, action: "validate-task-handoff", applied: true, projected: true, cleanupVerified: true };
  } finally {
    if (!recordId) {
      const projected = life({ action: "get_day", date }, "task-handoff-finally-project");
      recordId = findRecordId(projected, content);
    }
    if (recordId) assertOk(life({ action: "archive_note", note_id: recordId }, "task-handoff-clean"), "clean task-system handoff");
    const cleaned = assertOk(life({ action: "get_day", date }, "task-handoff-clean-project"), "project cleaned task-system handoff");
    assert.doesNotMatch(JSON.stringify(cleaned), new RegExp(content));
  }
}

const action = process.argv[2];
let result;
if (action === "modules") result = validateModules();
else if (action === "workflow") result = validateWorkflow();
else if (action === "morning-handoff") result = validateMorningHandoff();
else if (action === "task-handoff") result = validateTaskHandoff();
else throw new Error("usage: ValidateTaskSystemRepair.mjs modules | workflow | morning-handoff | task-handoff");
console.log(JSON.stringify(result, null, 2));
