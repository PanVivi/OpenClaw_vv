import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = await mkdtemp(join(tmpdir(), "morning-brief-control-"));
const ownerRoot = join(root, "owner");
const stateRoot = join(root, "state");
const runtimeStatusPath = join(stateRoot, "runtime-status.json");
await mkdir(stateRoot, { recursive: true });
await writeFile(runtimeStatusPath, JSON.stringify({ declarationKey: "hehuan-daily-v1", enabled: false, schedule: "0 6 * * *", disabledReason: "acceptance pending" }));

const registrations = [];
const hooks = new Map();
let lifeTool;
let runCounter = 0;
const api = {
  rootDir: root,
  pluginConfig: {
    lifeAgentId: "life",
    housekeeperAgentId: "housekeeper",
    ownerRoot,
    stateRoot,
    runtimeStatusPath,
    ownerChatId: "811150402",
    telegramAccountId: "life",
    geocodingUrl: "https://invalid.test"
  },
  logger: { info() {}, warn() {}, error() {} },
  registerTool(factory, metadata) { registrations.push({ factory, metadata }); },
  on(name, callback) { hooks.set(name, callback); },
  runtime: {
    subagent: {
      async run(options) {
        runCounter += 1;
        const match = String(options.message).match(/handoff_id=(handoff-[\w-]+)/);
        if (match) {
          const applied = await lifeTool.execute("test-apply", { action: "apply_handoff", handoff_id: match[1] });
          assert.equal(applied.details.ok, true);
          assert.equal(applied.details.applied, true);
        }
        return { runId: `run-${runCounter}` };
      },
      async waitForRun() { return { status: "ok" }; }
    }
  }
};

try {
  const plugin = (await import("../dist/index.js")).default;
  plugin.register(api);
  const controlRegistration = registrations.find((item) => item.metadata.name === "morning_brief_control");
  const handoffRegistration = registrations.find((item) => item.metadata.name === "morning_brief_handoff");
  assert.ok(controlRegistration);
  assert.ok(handoffRegistration);
  lifeTool = controlRegistration.factory({ agentId: "life" });
  const housekeeperTool = handoffRegistration.factory({ agentId: "housekeeper" });
  assert.ok(lifeTool);
  assert.ok(housekeeperTool);
  assert.equal(controlRegistration.factory({ agentId: "ops" }), null);
  assert.equal(handoffRegistration.factory({ agentId: "ops" }), null);
  assert.equal(controlRegistration.factory({ agentId: "housekeeper" }), null);
  assert.equal(handoffRegistration.factory({ agentId: "life" }), null);

  const inspect = await lifeTool.execute("inspect", { action: "inspect" });
  assert.equal(inspect.details.ok, true);
  assert.equal(inspect.details.morningBrief.enabled, false);
  assert.equal(inspect.details.morningBrief.schedule, "0 6 * * *");

  const eventParams = {
    action: "upsert_event",
    title: "技能考试",
    event_at: "2099-08-10T09:15:00+08:00",
    location: "考场",
    reminder_minutes: 60,
    dedupe_key: "event-skill-exam-20260810",
    source_at: "2026-08-09T10:00:00+08:00"
  };
  const event = await lifeTool.execute("event", eventParams);
  assert.equal(event.details.ok, true);
  assert.equal(event.details.eventAt, "2099-08-10T01:15:00.000Z");
  assert.equal(event.details.reminderAt, "2099-08-10T00:15:00.000Z");

  const earlyEvent = await lifeTool.execute("early-event", {
    action: "upsert_event",
    event_at: "2099-08-10T00:30:00+08:00",
    title: "凌晨验收事项",
    recurrence: "none",
    reminder_minutes: 60,
    dedupe_key: "early-event",
    source_at: "2026-08-09T10:00:00+08:00"
  });
  const duplicate = await lifeTool.execute("event-duplicate", eventParams);
  assert.equal(duplicate.details.recordId, event.details.recordId);

  const task = await lifeTool.execute("task", {
    action: "upsert_task",
    title: "准备考试证件",
    due_date: "2099-08-10",
    task_status: "todo",
    dedupe_key: "task-exam-documents"
  });
  assert.equal(task.details.ok, true);

  const modules = ["header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"];
  for (const module of modules) {
    const note = await lifeTool.execute(`note-${module}`, {
      action: "upsert_note",
      module,
      content: `${module} 的已确认测试补记`,
      start_date: "2099-08-10",
      end_date: "2099-08-10",
      dedupe_key: `note-${module}`
    });
    assert.equal(note.details.ok, true, module);
  }

  const allowedPreference = await lifeTool.execute("preference", {
    action: "set_preference",
    module: "attire",
    preference_key: "heat_sensitive",
    preference_value: true
  });
  assert.equal(allowedPreference.details.ok, true);
  const guide = await lifeTool.execute("guide", { action: "guide" });
  assert.equal(guide.details.ok, true);
  assert.deepEqual(guide.details.actions.set_preference, ["module", "preference_key", "preference_value"]);
  const preferenceAlias = await lifeTool.execute("preference-alias", {
    action: "upsert_preference",
    module: "attire",
    preference_key: "carry",
    preference_value: "晴雨伞"
  });
  assert.equal(preferenceAlias.details.ok, true);
  const clearedPreference = await lifeTool.execute("preference-clear", {
    action: "clear_preference",
    module: "attire",
    preference_key: "carry"
  });
  assert.equal(clearedPreference.details.ok, true);
  assert.equal(clearedPreference.details.changed, true);
  const forbiddenAutomaticFact = await lifeTool.execute("bad-preference", {
    action: "set_preference",
    module: "weather",
    preference_key: "temperature",
    preference_value: 20
  });
  assert.equal(forbiddenAutomaticFact.details.ok, false);

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        results: [
          { name: "北城", admin1: "甲地", country: "测试国", latitude: 25.1, longitude: 121.1 },
          { name: "北城", admin1: "乙地", country: "测试国", latitude: 25.2, longitude: 121.2 }
        ]
      };
    }
  });
  const ambiguousLocation = await lifeTool.execute("location-ambiguous", {
    action: "set_location",
    location_query: "北城",
    start_date: "2099-08-10",
    end_date: "2099-08-10",
    dedupe_key: "location-north-city"
  });
  assert.equal(ambiguousLocation.details.ok, false);
  assert.equal(ambiguousLocation.details.needsClarification, true);
  assert.equal(ambiguousLocation.details.candidates.length, 2);
  const selectedLocation = await lifeTool.execute("location-selected", {
    action: "set_location",
    location_query: "北城",
    location_index: 1,
    start_date: "2099-08-10",
    end_date: "2099-08-10",
    dedupe_key: "location-north-city"
  });
  assert.equal(selectedLocation.details.ok, true);
  assert.equal(selectedLocation.details.location, "北城 · 乙地 · 测试国");

  const day = await lifeTool.execute("day", { action: "get_day", date: "2099-08-10" });
  assert.equal(day.details.events.some((item) => item.title === "凌晨验收事项"), true);
  assert.equal(day.details.ok, true);
  assert.equal(day.details.events.length, 2);
  assert.equal(day.details.tasks.length, 1);
  assert.equal(day.details.notes.length, 8);
  assert.equal(day.details.preferences.attire.heat_sensitive, true);
  assert.equal(day.details.locationOverrides.length, 1);

  const handoff = await housekeeperTool.execute("handoff", {
    action: "submit",
    control_action: "upsert_event",
    source_at: "2026-08-09T11:00:00+08:00",
    expires_at: "2099-08-10T11:00:00+08:00",
    dedupe_key: "handoff-dentist-20260811",
    payload: {
      title: "牙科复诊",
      event_at: "2099-08-11T15:00:00+08:00",
      reminder_minutes: 60,
      dedupe_key: "event-dentist-20260811"
    }
  });
  assert.equal(handoff.details.ok, true);
  assert.equal(handoff.details.applied, true);
  const handoffStatus = await housekeeperTool.execute("handoff-status", { action: "status", handoff_id: handoff.details.handoffId });
  assert.equal(handoffStatus.details.handoff.status, "applied");

  const nextDay = await lifeTool.execute("next-day", { action: "get_day", date: "2099-08-11" });
  assert.equal(nextDay.details.events.length, 1);
  assert.equal(nextDay.details.events[0].source.kind, "housekeeper_handoff");

  const cancelled = await lifeTool.execute("cancel", { action: "cancel_event", event_id: event.details.recordId });
  assert.equal(cancelled.details.reminderStatus, "cancelled");
  await lifeTool.execute("cancel-early", { action: "cancel_event", event_id: earlyEvent.details.recordId });
  const afterCancel = await lifeTool.execute("day-after-cancel", { action: "get_day", date: "2099-08-10" });
  assert.equal(afterCancel.details.events.length, 0);

  const stored = JSON.parse(await readFile(join(ownerRoot, "morning-brief-inputs.json"), "utf8"));
  assert.equal(stored.schema, "hehuan.morning-brief-inputs");
  assert.equal(stored.events.length, 3);
  assert.equal(stored.notes.length, 8);
  assert.ok(stored.revision >= 14);
  assert.equal(runCounter, 1);
  assert.ok(hooks.has("gateway_start"));
  assert.ok(hooks.has("gateway_stop"));
  console.log("MORNING_BRIEF_CONTROL_INTEGRATION_OK");
} finally {
  await rm(root, { recursive: true, force: true });
}
