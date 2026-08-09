import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
const CONTROL_TOOL = "morning_brief_control";
const HANDOFF_TOOL = "morning_brief_handoff";
const PLUGIN_VERSION = "1.0.2";
const TICK_INTERVAL_MS = 15_000;
const HANDOFF_TIMEOUT_MS = 120_000;
const MODULES = new Set([
    "header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"
]);
const CONTROL_ACTION_VALUES = [
    "guide", "inspect", "get_day", "upsert_event", "cancel_event", "upsert_task",
    "set_task_status", "archive_task", "set_location", "clear_location",
    "set_preference", "upsert_preference", "clear_preference",
    "upsert_note", "archive_note", "apply_handoff"
];
const CONTROL_ACTIONS = new Set(CONTROL_ACTION_VALUES);
const HANDOFF_CONTROL_ACTION_VALUES = [
    "upsert_event", "cancel_event", "upsert_task", "set_task_status",
    "archive_task", "set_location", "clear_location", "set_preference", "upsert_preference",
    "clear_preference", "upsert_note", "archive_note"
];
const HANDOFF_ALLOWED_ACTIONS = new Set(HANDOFF_CONTROL_ACTION_VALUES);
const MODULE_VALUES = [
    "header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"
];
const PREFERENCE_KEYS = {
    header: new Set(["salutation", "greeting_style", "temporary_wish"]),
    weather: new Set(["focus", "show_hourly"]),
    aqi: new Set(["sensitive_group", "outdoor_activity"]),
    attire: new Set(["heat_sensitive", "cold_sensitive", "commute_mode", "avoid", "carry"]),
    tasks: new Set(["max_items"]),
    disciples: new Set(["show_activity"]),
    schedule: new Set(["default_reminder_minutes"]),
    folk_calendar: new Set(["show", "tone"])
};
const MODULE_LABELS = {
    header: "抬头与晨辞",
    weather: "天候司",
    aqi: "清气监",
    attire: "衣行令",
    tasks: "生活待办",
    disciples: "门下近况",
    schedule: "今日玉牒",
    folk_calendar: "今日小签"
};
const ControlParamsSchema = Type.Object({
    action: Type.Union(CONTROL_ACTION_VALUES.map((value) => Type.Literal(value)), {
        description: "Choose one exact operation. Use guide once if required fields are unclear; never guess another action name."
    }),
    handoff_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    date: Type.Optional(Type.String({ minLength: 10, maxLength: 10 })),
    event_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    event_at: Type.Optional(Type.String({ minLength: 10, maxLength: 64 })),
    end_at: Type.Optional(Type.String({ minLength: 10, maxLength: 64 })),
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 200, description: "Required for upsert_event and upsert_task." })),
    location: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    event_status: Type.Optional(Type.Union([Type.Literal("confirmed"), Type.Literal("tentative"), Type.Literal("cancelled")])),
    recurrence: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("daily"), Type.Literal("weekly")])),
    reminder_minutes: Type.Optional(Type.Integer({ minimum: 0, maximum: 10080 })),
    task_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    task_status: Type.Optional(Type.Union([
        Type.Literal("todo"), Type.Literal("doing"), Type.Literal("done"),
        Type.Literal("failed"), Type.Literal("blocked"), Type.Literal("archived")
    ])),
    due_date: Type.Optional(Type.String({ minLength: 10, maxLength: 10 })),
    task_note: Type.Optional(Type.String({ maxLength: 500 })),
    module: Type.Optional(Type.Union(MODULE_VALUES.map((value) => Type.Literal(value)), {
        description: "Required for set_preference, upsert_preference, clear_preference, and upsert_note."
    })),
    note_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    content: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
    start_date: Type.Optional(Type.String({ minLength: 10, maxLength: 10 })),
    end_date: Type.Optional(Type.String({ minLength: 10, maxLength: 10 })),
    location_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    location_query: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    location_index: Type.Optional(Type.Integer({ minimum: 0, maximum: 9 })),
    latitude: Type.Optional(Type.Number({ minimum: -90, maximum: 90 })),
    longitude: Type.Optional(Type.Number({ minimum: -180, maximum: 180 })),
    preference_key: Type.Optional(Type.String({ minLength: 1, maxLength: 64, description: "Required for preference actions. Use guide to see the allowed keys for each module." })),
    preference_value: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Number(), Type.Boolean()])),
    dedupe_key: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    source_at: Type.Optional(Type.String({ minLength: 10, maxLength: 64 }))
}, { additionalProperties: false });
const HandoffParamsSchema = Type.Object({
    action: Type.Union([Type.Literal("submit"), Type.Literal("status"), Type.Literal("cancel")]),
    handoff_id: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    control_action: Type.Optional(Type.Union(HANDOFF_CONTROL_ACTION_VALUES.map((value) => Type.Literal(value)))),
    source_at: Type.Optional(Type.String({ minLength: 10, maxLength: 64 })),
    expires_at: Type.Optional(Type.String({ minLength: 10, maxLength: 64 })),
    dedupe_key: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    payload: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
}, { additionalProperties: false });
function toolResult(value) {
    const details = value && typeof value === "object" && !Array.isArray(value)
        ? {
            ...value,
            replyGuidance: "面向少主只用玉简中文栏目和自然语句说清日期、内容与影响；不复制英文键名、action、module、schema、ID、坐标或工程状态。"
        }
        : value;
    return {
        content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
        details
    };
}
function text(value, field, max = 500) {
    if (typeof value !== "string" || !value.trim())
        throw new Error(`${field} is required`);
    const normalized = value.normalize("NFKC").trim();
    if (normalized.length > max || /[\u0000-\u001f\u007f]/u.test(normalized)) {
        throw new Error(`${field} is invalid`);
    }
    return normalized;
}
function optionalText(value, max = 500) {
    if (value === undefined || value === null || value === "")
        return undefined;
    return text(value, "value", max);
}
function isoInstant(value, field) {
    const raw = text(value, field, 64);
    if (!/T/.test(raw) || !/(Z|[+-]\d{2}:\d{2})$/u.test(raw) || !Number.isFinite(Date.parse(raw))) {
        throw new Error(`${field} must be an ISO date-time with an explicit offset`);
    }
    return new Date(Date.parse(raw)).toISOString();
}
function dateOnly(value, field) {
    const raw = text(value, field, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
        throw new Error(`${field} must be YYYY-MM-DD`);
    }
    return raw;
}
function moduleName(value) {
    const raw = text(value, "module", 32);
    if (!MODULES.has(raw))
        throw new Error(`unsupported morning-brief module: ${raw}`);
    return raw;
}
function dedupe(value, fallback) {
    if (typeof value === "string" && value.trim())
        return text(value, "dedupe_key", 200);
    return createHash("sha256").update(fallback, "utf8").digest("hex").slice(0, 32);
}
function sourceInfo(params, kind, handoffId) {
    const sourceAt = typeof params.source_at === "string" ? isoInstant(params.source_at, "source_at") : new Date().toISOString();
    return { kind, sourceAt, handoffId };
}
function emptyInputs() {
    return {
        schema: "hehuan.morning-brief-inputs",
        schemaVersion: 1,
        revision: 0,
        updatedAt: new Date(0).toISOString(),
        preferences: {},
        events: [],
        tasks: [],
        notes: [],
        locationOverrides: []
    };
}
function emptyHandoffs() {
    return { schema: "hehuan.morning-brief-handoffs", schemaVersion: 1, handoffs: [] };
}
function validateInputs(value) {
    const state = value;
    if (state?.schema !== "hehuan.morning-brief-inputs" || state.schemaVersion !== 1) {
        throw new Error("morning-brief input schema is invalid");
    }
    for (const key of ["events", "tasks", "notes", "locationOverrides"]) {
        if (!Array.isArray(state[key]))
            throw new Error(`morning-brief ${key} is invalid`);
    }
    if (!state.preferences || typeof state.preferences !== "object") {
        throw new Error("morning-brief preferences are invalid");
    }
    return state;
}
function validateHandoffs(value) {
    const state = value;
    if (state?.schema !== "hehuan.morning-brief-handoffs" || state.schemaVersion !== 1 || !Array.isArray(state.handoffs)) {
        throw new Error("morning-brief handoff schema is invalid");
    }
    return state;
}
async function readJson(path, fallback, validate) {
    try {
        const info = await stat(path);
        if (!info.isFile())
            throw new Error("state target is not a regular file");
        if (info.size > 1024 * 1024)
            throw new Error("state file is too large");
        return validate(JSON.parse(await readFile(path, "utf8")));
    }
    catch (error) {
        if (error.code === "ENOENT")
            return fallback;
        throw error;
    }
}
async function atomicWrite(path, value) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
}
function occurrenceAfter(event, afterMs) {
    const base = Date.parse(event.eventAt);
    const reminderOffset = event.reminder.minutesBefore * 60_000;
    const step = event.recurrence === "daily" ? 86_400_000 : event.recurrence === "weekly" ? 604_800_000 : 0;
    let occurrence = base;
    if (step > 0 && occurrence - reminderOffset <= afterMs) {
        occurrence += Math.max(0, Math.floor((afterMs - (occurrence - reminderOffset)) / step) + 1) * step;
    }
    const reminderAt = occurrence - reminderOffset;
    if (step === 0 && occurrence < afterMs)
        return undefined;
    return {
        occurrenceAt: new Date(occurrence).toISOString(),
        reminderAt: new Date(Math.max(afterMs, reminderAt)).toISOString()
    };
}
function scheduleReminder(event, afterMs = Date.now()) {
    if (event.status === "cancelled") {
        event.reminder = { ...event.reminder, status: "cancelled", nextRunAt: undefined };
        return;
    }
    const next = occurrenceAfter(event, afterMs);
    if (!next) {
        event.reminder = { ...event.reminder, status: "expired", nextRunAt: undefined };
        return;
    }
    event.reminder = {
        ...event.reminder,
        status: "scheduled",
        occurrenceAt: next.occurrenceAt,
        nextRunAt: next.reminderAt,
        lastError: undefined
    };
}
function dateInRange(target, start, end) {
    return start <= target && target <= end;
}
function dateInTimezone(instant, timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(instant));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}
function eventOccursOn(event, targetDate, timezone) {
    if (event.status === "cancelled")
        return false;
    const baseDate = dateInTimezone(event.eventAt, timezone);
    if (event.recurrence === "none")
        return baseDate === targetDate;
    const base = Date.parse(`${baseDate}T00:00:00Z`);
    const target = Date.parse(`${targetDate}T00:00:00Z`);
    if (target < base)
        return false;
    const days = Math.round((target - base) / 86_400_000);
    return event.recurrence === "daily" || days % 7 === 0;
}
function dayProjection(state, targetDate, timezone) {
    return {
        date: targetDate,
        revision: state.revision,
        events: state.events.filter((item) => eventOccursOn(item, targetDate, timezone)),
        tasks: state.tasks.filter((item) => item.status !== "archived" && (!item.dueDate || item.dueDate === targetDate)),
        notes: state.notes.filter((item) => item.status === "active" && dateInRange(targetDate, item.startDate, item.endDate)),
        locationOverrides: state.locationOverrides.filter((item) => item.status === "active" && dateInRange(targetDate, item.startDate, item.endDate)),
        preferences: state.preferences
    };
}
export default definePluginEntry({
    id: "morning-brief-control",
    name: "Morning Brief Control",
    description: "Typed morning-brief inputs, reminders, and life-owned handoff application.",
    register(api) {
        const config = (api.pluginConfig ?? {});
        const lifeAgentId = typeof config.lifeAgentId === "string" ? config.lifeAgentId.trim() : "life";
        const housekeeperAgentId = typeof config.housekeeperAgentId === "string" ? config.housekeeperAgentId.trim() : "housekeeper";
        const timezone = typeof config.timezone === "string" ? config.timezone.trim() : "Asia/Taipei";
        const telegramAccountId = typeof config.telegramAccountId === "string" ? config.telegramAccountId.trim() : "life";
        if (lifeAgentId !== "life" || housekeeperAgentId !== "housekeeper" || telegramAccountId !== "life") {
            throw new Error("morning-brief-control identity configuration is invalid");
        }
        const defaultOwnerRoot = join(process.env.HOME ?? api.rootDir ?? ".", ".openclaw", "agents", "life", "users", "Vivi");
        const ownerRoot = resolve(typeof config.ownerRoot === "string" && config.ownerRoot.trim() ? config.ownerRoot.trim() : defaultOwnerRoot);
        const stateRoot = resolve(typeof config.stateRoot === "string" && config.stateRoot.trim() ? config.stateRoot.trim() : join(process.env.HOME ?? api.rootDir ?? ".", ".openclaw", "morning-brief-control"));
        const runtimeStatusPath = resolve(typeof config.runtimeStatusPath === "string" && config.runtimeStatusPath.trim() ? config.runtimeStatusPath.trim() : join(stateRoot, "runtime-status.json"));
        for (const [name, candidate] of [["ownerRoot", ownerRoot], ["stateRoot", stateRoot], ["runtimeStatusPath", runtimeStatusPath]]) {
            if (!isAbsolute(candidate))
                throw new Error(`${name} must be absolute`);
        }
        const inputsPath = join(ownerRoot, "morning-brief-inputs.json");
        const handoffsPath = join(stateRoot, "handoffs.json");
        const ownerChatId = typeof config.ownerChatId === "string" && config.ownerChatId.trim() ? config.ownerChatId.trim() : undefined;
        const lifeSessionKey = ownerChatId ? `agent:${lifeAgentId}:telegram:direct:${ownerChatId}` : undefined;
        const geocodingUrl = typeof config.geocodingUrl === "string" && config.geocodingUrl.trim() ? config.geocodingUrl.trim() : "https://geocoding-api.open-meteo.com/v1/search";
        let stateQueue = Promise.resolve();
        let tickTimer;
        let ticking = false;
        const withLock = async (operation) => {
            let release = () => undefined;
            const previous = stateQueue;
            stateQueue = new Promise((resolveQueue) => { release = resolveQueue; });
            await previous;
            try {
                return await operation();
            }
            finally {
                release();
            }
        };
        const readInputs = () => readJson(inputsPath, emptyInputs(), validateInputs);
        const readHandoffs = () => readJson(handoffsPath, emptyHandoffs(), validateHandoffs);
        const saveInputs = async (state) => {
            state.revision += 1;
            state.updatedAt = new Date().toISOString();
            await atomicWrite(inputsPath, state);
        };
        const saveHandoffs = (state) => atomicWrite(handoffsPath, state);
        const resolveLocation = async (params) => {
            if (typeof params.latitude === "number" && typeof params.longitude === "number") {
                return {
                    name: text(params.location_query ?? params.location, "location_query", 200),
                    latitude: params.latitude,
                    longitude: params.longitude
                };
            }
            const query = text(params.location_query, "location_query", 200);
            const response = await fetch(`${geocodingUrl}?name=${encodeURIComponent(query)}&count=5&language=zh&format=json`);
            if (!response.ok)
                throw new Error("地点查询暂时不可用");
            const body = await response.json();
            const candidates = (body.results ?? []).filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number");
            if (candidates.length === 0)
                throw new Error("没有找到可核实的地点");
            if (params.location_index === undefined && candidates.length > 1) {
                return {
                    needsClarification: true,
                    candidates: candidates.map((item, index) => ({
                        index,
                        name: [item.name, item.admin1, item.country].filter((value) => typeof value === "string" && value).join(" · ")
                    }))
                };
            }
            const index = typeof params.location_index === "number" ? params.location_index : 0;
            const selected = candidates[index];
            if (!selected)
                throw new Error("地点候选编号无效");
            return {
                name: [selected.name, selected.admin1, selected.country].filter((value) => typeof value === "string" && value).join(" · "),
                latitude: selected.latitude,
                longitude: selected.longitude
            };
        };
        const applyControlAction = async (action, params, kind, handoffId) => {
            if (action === "upsert_preference")
                action = "set_preference";
            if (!CONTROL_ACTIONS.has(action) || action === "apply_handoff" || action === "inspect" || action === "get_day") {
                throw new Error(`unsupported write action: ${action}`);
            }
            let resolvedLocation;
            if (action === "set_location") {
                resolvedLocation = await resolveLocation(params);
                if (resolvedLocation.needsClarification === true) {
                    return { ok: false, needsClarification: true, candidates: resolvedLocation.candidates };
                }
            }
            return withLock(async () => {
                const state = await readInputs();
                const now = new Date().toISOString();
                const source = sourceInfo(params, kind, handoffId);
                if (action === "upsert_event") {
                    const title = text(params.title, "title", 200);
                    const eventAt = isoInstant(params.event_at, "event_at");
                    const recurrence = (params.recurrence ?? "none");
                    if (!["none", "daily", "weekly"].includes(recurrence))
                        throw new Error("recurrence must be none, daily, or weekly");
                    const status = (params.event_status ?? "confirmed");
                    if (!["confirmed", "tentative"].includes(status))
                        throw new Error("event_status must be confirmed or tentative");
                    const key = dedupe(params.dedupe_key, `${title}|${eventAt}|${kind}`);
                    const existing = state.events.find((item) => item.dedupeKey === key || item.id === params.event_id);
                    const event = existing ?? {
                        id: typeof params.event_id === "string" ? text(params.event_id, "event_id", 100) : `event-${randomUUID()}`,
                        title, eventAt, status, recurrence,
                        reminder: { status: "scheduled", minutesBefore: 60 },
                        source, dedupeKey: key, createdAt: now, updatedAt: now
                    };
                    event.title = title;
                    event.eventAt = eventAt;
                    event.endAt = typeof params.end_at === "string" ? isoInstant(params.end_at, "end_at") : undefined;
                    event.location = optionalText(params.location, 200);
                    event.status = status;
                    event.recurrence = recurrence;
                    event.reminder.minutesBefore = typeof params.reminder_minutes === "number" ? params.reminder_minutes : 60;
                    event.source = source;
                    event.updatedAt = now;
                    scheduleReminder(event);
                    if (!existing)
                        state.events.push(event);
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: event.id, sections: [MODULE_LABELS.schedule], eventAt: event.eventAt, reminderAt: event.reminder.nextRunAt, reminderStatus: event.reminder.status };
                }
                if (action === "cancel_event") {
                    const id = text(params.event_id, "event_id", 100);
                    const event = state.events.find((item) => item.id === id || item.dedupeKey === id);
                    if (!event)
                        throw new Error("未找到这项日程");
                    event.status = "cancelled";
                    event.updatedAt = now;
                    scheduleReminder(event);
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: event.id, sections: [MODULE_LABELS.schedule], reminderStatus: event.reminder.status };
                }
                if (action === "upsert_task") {
                    const title = text(params.title, "title", 200);
                    const key = dedupe(params.dedupe_key, `${title}|${params.due_date ?? ""}|${kind}`);
                    const existing = state.tasks.find((item) => item.dedupeKey === key || item.id === params.task_id);
                    const status = (params.task_status ?? "todo");
                    if (!["todo", "doing", "done", "failed", "blocked"].includes(status))
                        throw new Error("unsupported task_status");
                    const task = existing ?? {
                        id: typeof params.task_id === "string" ? text(params.task_id, "task_id", 100) : `task-${randomUUID()}`,
                        title, status, source, dedupeKey: key, createdAt: now, updatedAt: now
                    };
                    task.title = title;
                    task.status = status;
                    task.dueDate = typeof params.due_date === "string" ? dateOnly(params.due_date, "due_date") : undefined;
                    task.note = optionalText(params.task_note, 500);
                    task.source = source;
                    task.updatedAt = now;
                    if (!existing)
                        state.tasks.push(task);
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: task.id, sections: [MODULE_LABELS.tasks], dueDate: task.dueDate, status: task.status };
                }
                if (action === "set_task_status" || action === "archive_task") {
                    const id = text(params.task_id, "task_id", 100);
                    const task = state.tasks.find((item) => item.id === id || item.dedupeKey === id);
                    if (!task)
                        throw new Error("未找到这项待办");
                    const status = action === "archive_task" ? "archived" : text(params.task_status, "task_status", 32);
                    if (!["todo", "doing", "done", "failed", "blocked", "archived"].includes(status))
                        throw new Error("unsupported task_status");
                    task.status = status;
                    task.source = source;
                    task.updatedAt = now;
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: task.id, sections: [MODULE_LABELS.tasks], status };
                }
                if (action === "upsert_note") {
                    const module = moduleName(params.module);
                    const content = text(params.content, "content", 1000);
                    const startDate = dateOnly(params.start_date ?? params.date, "start_date");
                    const endDate = dateOnly(params.end_date ?? startDate, "end_date");
                    if (endDate < startDate)
                        throw new Error("end_date must not be before start_date");
                    const key = dedupe(params.dedupe_key, `${module}|${content}|${startDate}|${kind}`);
                    const existing = state.notes.find((item) => item.dedupeKey === key || item.id === params.note_id);
                    const note = existing ?? {
                        id: typeof params.note_id === "string" ? text(params.note_id, "note_id", 100) : `note-${randomUUID()}`,
                        module, content, startDate, endDate, status: "active", source, dedupeKey: key, createdAt: now, updatedAt: now
                    };
                    Object.assign(note, { module, content, startDate, endDate, status: "active", source, updatedAt: now });
                    if (!existing)
                        state.notes.push(note);
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: note.id, sections: [MODULE_LABELS[module]], dates: [startDate, endDate] };
                }
                if (action === "archive_note") {
                    const id = text(params.note_id, "note_id", 100);
                    const note = state.notes.find((item) => item.id === id || item.dedupeKey === id);
                    if (!note)
                        throw new Error("未找到这条模块补记");
                    note.status = "archived";
                    note.source = source;
                    note.updatedAt = now;
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: note.id, sections: [MODULE_LABELS[note.module]], status: note.status };
                }
                if (action === "set_preference") {
                    const module = moduleName(params.module);
                    const key = text(params.preference_key, "preference_key", 64);
                    if (!PREFERENCE_KEYS[module].has(key))
                        throw new Error(`preference ${key} is not allowed for ${module}`);
                    const value = params.preference_value;
                    if (!["string", "number", "boolean"].includes(typeof value))
                        throw new Error("preference_value must be string, number, or boolean");
                    state.preferences[module] ??= {};
                    state.preferences[module][key] = value;
                    await saveInputs(state);
                    return { ok: true, changed: true, sections: [MODULE_LABELS[module]], preference: { key, value } };
                }
                if (action === "clear_preference") {
                    const module = moduleName(params.module);
                    const key = text(params.preference_key, "preference_key", 64);
                    if (!PREFERENCE_KEYS[module].has(key))
                        throw new Error(`preference ${key} is not allowed for ${module}`);
                    const changed = Object.prototype.hasOwnProperty.call(state.preferences[module] ?? {}, key);
                    if (changed) {
                        delete state.preferences[module][key];
                        if (Object.keys(state.preferences[module]).length === 0)
                            delete state.preferences[module];
                        await saveInputs(state);
                    }
                    return { ok: true, changed, sections: [MODULE_LABELS[module]], preference: { key, cleared: true } };
                }
                if (action === "set_location") {
                    const startDate = dateOnly(params.start_date ?? params.date, "start_date");
                    const endDate = dateOnly(params.end_date ?? startDate, "end_date");
                    if (endDate < startDate)
                        throw new Error("end_date must not be before start_date");
                    const location = resolvedLocation;
                    const key = dedupe(params.dedupe_key, `${location.name}|${startDate}|${endDate}|${kind}`);
                    const existing = state.locationOverrides.find((item) => item.dedupeKey === key || item.id === params.location_id);
                    const record = existing ?? {
                        id: typeof params.location_id === "string" ? text(params.location_id, "location_id", 100) : `location-${randomUUID()}`,
                        name: String(location.name), latitude: Number(location.latitude), longitude: Number(location.longitude),
                        startDate, endDate, status: "active", source, dedupeKey: key, createdAt: now, updatedAt: now
                    };
                    Object.assign(record, { name: String(location.name), latitude: Number(location.latitude), longitude: Number(location.longitude), startDate, endDate, status: "active", source, updatedAt: now });
                    if (!existing)
                        state.locationOverrides.push(record);
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: record.id, sections: [MODULE_LABELS.weather, MODULE_LABELS.aqi, MODULE_LABELS.attire], location: record.name, dates: [startDate, endDate] };
                }
                if (action === "clear_location") {
                    const id = text(params.location_id, "location_id", 100);
                    const record = state.locationOverrides.find((item) => item.id === id || item.dedupeKey === id);
                    if (!record)
                        throw new Error("未找到这项地点覆盖");
                    record.status = "cancelled";
                    record.source = source;
                    record.updatedAt = now;
                    await saveInputs(state);
                    return { ok: true, changed: true, recordId: record.id, sections: [MODULE_LABELS.weather, MODULE_LABELS.aqi, MODULE_LABELS.attire], status: record.status };
                }
                throw new Error(`unsupported write action: ${action}`);
            });
        };
        const applyHandoff = async (handoffId) => {
            const record = await withLock(async () => {
                const state = await readHandoffs();
                const found = state.handoffs.find((item) => item.id === handoffId);
                if (!found)
                    throw new Error("未找到这项晨报转交");
                if (found.status === "applied")
                    return structuredClone(found);
                if (found.status === "cancelled")
                    throw new Error("这项晨报转交已取消");
                if (Date.parse(found.expiresAt) <= Date.now()) {
                    found.status = "blocked";
                    found.error = "转交已过有效期，未写入晨报";
                    found.updatedAt = new Date().toISOString();
                    await saveHandoffs(state);
                    throw new Error(found.error);
                }
                found.status = "applying";
                found.updatedAt = new Date().toISOString();
                await saveHandoffs(state);
                return structuredClone(found);
            });
            if (record.status === "applied")
                return { ok: true, applied: true, handoffId, result: record.resultSummary };
            try {
                const writeResult = await applyControlAction(record.controlAction, { ...record.payload, source_at: record.sourceAt }, "housekeeper_handoff", handoffId);
                if (writeResult.ok !== true) {
                    await withLock(async () => {
                        const state = await readHandoffs();
                        const current = state.handoffs.find((item) => item.id === handoffId);
                        current.status = "blocked";
                        current.error = writeResult.needsClarification ? "地点需要少主确认后才能录入" : "转交未能完成录入";
                        current.resultSummary = writeResult;
                        current.updatedAt = new Date().toISOString();
                        await saveHandoffs(state);
                    });
                    return { ok: false, applied: false, handoffId, ...writeResult };
                }
                await withLock(async () => {
                    const state = await readHandoffs();
                    const current = state.handoffs.find((item) => item.id === handoffId);
                    current.status = "applied";
                    current.appliedAt = new Date().toISOString();
                    current.updatedAt = current.appliedAt;
                    current.resultSummary = writeResult;
                    current.error = undefined;
                    await saveHandoffs(state);
                });
                return { ok: true, applied: true, handoffId, result: writeResult };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                await withLock(async () => {
                    const state = await readHandoffs();
                    const current = state.handoffs.find((item) => item.id === handoffId);
                    if (current) {
                        current.status = "blocked";
                        current.error = message;
                        current.updatedAt = new Date().toISOString();
                        await saveHandoffs(state);
                    }
                });
                throw error;
            }
        };
        const processDueReminders = async () => {
            if (ticking || !lifeSessionKey)
                return;
            ticking = true;
            try {
                const due = await withLock(async () => {
                    const state = await readInputs();
                    const now = Date.now();
                    const selected = [];
                    for (const event of state.events) {
                        if (event.status === "cancelled" || event.reminder.status !== "scheduled" || !event.reminder.nextRunAt)
                            continue;
                        if (Date.parse(event.reminder.nextRunAt) > now)
                            continue;
                        event.reminder.status = "sending";
                        event.reminder.lastRunAt = new Date().toISOString();
                        event.updatedAt = event.reminder.lastRunAt;
                        selected.push(structuredClone(event));
                    }
                    if (selected.length)
                        await saveInputs(state);
                    return selected;
                });
                for (const event of due) {
                    let runId;
                    let errorText;
                    try {
                        const occurrence = event.reminder.occurrenceAt ?? event.eventAt;
                        const started = await api.runtime.subagent.run({
                            sessionKey: lifeSessionKey,
                            message: `[晨间玉简日程提醒]\n少主的「${event.title}」将在 ${occurrence} 开始。请以蕭觀音既有口吻提醒少主，现在是提前 ${event.reminder.minutesBefore} 分钟的单独提醒。不要展示时间戳、任务编号或工具字段。`,
                            lightContext: false,
                            deliver: true,
                            idempotencyKey: `morning-event:${event.id}:${occurrence}`,
                            lane: `morning-event:${event.id}`
                        });
                        runId = started.runId;
                        const waited = await api.runtime.subagent.waitForRun({ runId, timeoutMs: 10 * 60_000 });
                        if (waited.status !== "ok")
                            errorText = waited.error ?? `提醒投递状态为 ${waited.status}`;
                    }
                    catch (error) {
                        errorText = error instanceof Error ? error.message : String(error);
                    }
                    await withLock(async () => {
                        const state = await readInputs();
                        const current = state.events.find((item) => item.id === event.id);
                        if (!current || current.reminder.status !== "sending")
                            return;
                        current.reminder.lastRunId = runId;
                        current.reminder.lastError = errorText;
                        if (errorText) {
                            current.reminder.status = "unknown";
                            current.reminder.nextRunAt = undefined;
                        }
                        else if (current.recurrence === "none") {
                            current.reminder.status = "sent";
                            current.reminder.nextRunAt = undefined;
                        }
                        else {
                            scheduleReminder(current, Date.now() + 60_000);
                        }
                        current.updatedAt = new Date().toISOString();
                        await saveInputs(state);
                    });
                }
            }
            catch (error) {
                api.logger.error(`morning-brief reminder tick failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            finally {
                ticking = false;
            }
        };
        api.registerTool((ctx) => {
            if (ctx.agentId !== lifeAgentId)
                return null;
            return {
                name: CONTROL_TOOL,
                label: "晨间玉简控制",
                description: "唯一晨间玉简的查询与录入工具。action 必须从 schema 枚举中选；不清楚字段时先用 guide，不得猜命令或去读技能文件。upsert_event 和 upsert_task 必须有 title；偏好用 set_preference/upsert_preference 加 module、preference_key、preference_value。所有写入校验、去重并可回读；自动天气、空气、农历、系统任务和在线状态不可手工覆盖。",
                parameters: ControlParamsSchema,
                async execute(_toolCallId, rawParams) {
                    const params = rawParams;
                    try {
                        const action = text(params.action, "action", 64);
                        if (!CONTROL_ACTIONS.has(action))
                            throw new Error(`unsupported action: ${action}; use guide and one of: ${CONTROL_ACTION_VALUES.join(", ")}`);
                        if (action === "guide") {
                            return toolResult({
                                ok: true,
                                actions: {
                                    inspect: [], get_day: ["date"],
                                    upsert_event: ["title", "event_at", "reminder_minutes"], cancel_event: ["event_id"],
                                    upsert_task: ["title", "task_status", "due_date?"], set_task_status: ["task_id", "task_status"], archive_task: ["task_id"],
                                    upsert_note: ["module", "content", "date or start_date/end_date"], archive_note: ["note_id"],
                                    set_preference: ["module", "preference_key", "preference_value"],
                                    upsert_preference: ["alias of set_preference"], clear_preference: ["module", "preference_key"],
                                    set_location: ["location_query", "start_date", "end_date"], clear_location: ["location_id"],
                                    apply_handoff: ["handoff_id"]
                                },
                                moduleChoices: Object.fromEntries(MODULE_VALUES.map((module) => [module, MODULE_LABELS[module]])),
                                preferenceKeys: Object.fromEntries(Object.entries(PREFERENCE_KEYS).map(([module, keys]) => [module, [...keys]])),
                                naturalLanguageRouting: {
                                    "带伞、带药、防晒、穿衣、怕冷怕热、随身物": "指定某天用 upsert_note + module=attire；长期习惯才用 set_preference + module=attire",
                                    "天气关注、带伞原因是降雨": "upsert_note + module=weather",
                                    "待办、需完成的事": "upsert_task + module=tasks",
                                    "有明确发生时刻的事": "upsert_event，并分开事件时刻与提醒时刻"
                                },
                                rule: "Use only these exact actions. Morning-brief work never requires life_files, web_fetch, sessions_spawn, or sessions_yield. In the final reply use only the Chinese labels above and never append English module codes."
                            });
                        }
                        if (action === "inspect") {
                            const [inputs, handoffs, runtime] = await Promise.all([
                                readInputs(), readHandoffs(), readJson(runtimeStatusPath, {}, (value) => value)
                            ]);
                            const safeRuntime = Object.fromEntries([
                                "declarationKey", "enabled", "schedule", "timezone", "disabledReason",
                                "lastRunAt", "lastBriefDate", "lastRunSuccess", "lastRunStatus", "lastMessageId"
                            ]
                                .filter((key) => runtime[key] !== undefined)
                                .map((key) => [key, runtime[key]]));
                            return toolResult({
                                ok: true,
                                pluginVersion: PLUGIN_VERSION,
                                morningBrief: safeRuntime,
                                inputRevision: inputs.revision,
                                pendingHandoffs: handoffs.handoffs.filter((item) => item.status === "pending" || item.status === "applying").length,
                                counts: { events: inputs.events.length, tasks: inputs.tasks.length, notes: inputs.notes.length, locations: inputs.locationOverrides.length }
                            });
                        }
                        if (action === "get_day") {
                            const targetDate = dateOnly(params.date, "date");
                            return toolResult({ ok: true, ...dayProjection(await readInputs(), targetDate, timezone) });
                        }
                        if (action === "apply_handoff") {
                            return toolResult(await applyHandoff(text(params.handoff_id, "handoff_id", 100)));
                        }
                        return toolResult(await applyControlAction(action, params, "direct_life"));
                    }
                    catch (error) {
                        return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
                    }
                }
            };
        }, { name: CONTROL_TOOL, optional: true });
        api.registerTool((ctx) => {
            if (ctx.agentId !== housekeeperAgentId)
                return null;
            return {
                name: HANDOFF_TOOL,
                label: "晨间玉简转交",
                description: "把少主交代的晨报模块信息持久转交给蕭觀音。action 只能是 submit/status/cancel；submit 需要 schema 枚举的 control_action、source_at、expires_at 和 payload。只有返回 applied=true 才算录入完成；不能直接修改 life 数据。",
                parameters: HandoffParamsSchema,
                async execute(_toolCallId, rawParams) {
                    const params = rawParams;
                    try {
                        const action = text(params.action, "action", 32);
                        if (action === "status") {
                            const id = text(params.handoff_id, "handoff_id", 100);
                            const record = (await readHandoffs()).handoffs.find((item) => item.id === id || item.dedupeKey === id);
                            if (!record)
                                throw new Error("未找到这项晨报转交");
                            return toolResult({ ok: true, handoff: record });
                        }
                        if (action === "cancel") {
                            const id = text(params.handoff_id, "handoff_id", 100);
                            const record = await withLock(async () => {
                                const state = await readHandoffs();
                                const found = state.handoffs.find((item) => item.id === id || item.dedupeKey === id);
                                if (!found)
                                    throw new Error("未找到这项晨报转交");
                                if (found.status === "applied")
                                    throw new Error("这项信息已经录入，需由蕭觀音修改或取消原记录");
                                found.status = "cancelled";
                                found.updatedAt = new Date().toISOString();
                                await saveHandoffs(state);
                                return found;
                            });
                            return toolResult({ ok: true, cancelled: true, handoffId: record.id });
                        }
                        if (action !== "submit")
                            throw new Error("action must be submit, status, or cancel");
                        if (!lifeSessionKey)
                            throw new Error("晨报转交尚未配置固定的蕭觀音会话");
                        const controlAction = text(params.control_action, "control_action", 64);
                        if (!HANDOFF_ALLOWED_ACTIONS.has(controlAction))
                            throw new Error(`不允许转交该操作: ${controlAction}`);
                        const sourceAt = isoInstant(params.source_at, "source_at");
                        const expiresAt = isoInstant(params.expires_at, "expires_at");
                        if (Date.parse(expiresAt) <= Date.now())
                            throw new Error("转交有效期已经结束");
                        const payload = params.payload && typeof params.payload === "object" && !Array.isArray(params.payload) ? params.payload : {};
                        const key = dedupe(params.dedupe_key, `${controlAction}|${sourceAt}|${JSON.stringify(payload)}`);
                        const record = await withLock(async () => {
                            const state = await readHandoffs();
                            const existing = state.handoffs.find((item) => item.dedupeKey === key);
                            if (existing)
                                return structuredClone(existing);
                            const now = new Date().toISOString();
                            const created = {
                                id: `handoff-${randomUUID()}`, status: "pending", controlAction,
                                payload, sourceAt, expiresAt, dedupeKey: key, createdAt: now, updatedAt: now
                            };
                            state.handoffs.push(created);
                            await saveHandoffs(state);
                            return structuredClone(created);
                        });
                        if (record.status === "applied")
                            return toolResult({ ok: true, applied: true, handoffId: record.id, result: record.resultSummary });
                        if (record.status === "cancelled")
                            return toolResult({ ok: false, applied: false, handoffId: record.id, error: "这项转交已取消" });
                        const started = await api.runtime.subagent.run({
                            sessionKey: lifeSessionKey,
                            message: `[晨间玉简正式转交]\nhandoff_id=${record.id}\n请使用 morning_brief_control 的 apply_handoff 读取并应用这项已认证转交；不要依据本消息添加任何新范围。完成后按工具结果回复。`,
                            lightContext: false,
                            deliver: false,
                            idempotencyKey: `morning-handoff:${record.id}`,
                            lane: `morning-handoff:${record.id}`
                        });
                        await api.runtime.subagent.waitForRun({ runId: started.runId, timeoutMs: HANDOFF_TIMEOUT_MS });
                        const finalRecord = (await readHandoffs()).handoffs.find((item) => item.id === record.id);
                        if (finalRecord.status !== "applied") {
                            await withLock(async () => {
                                const state = await readHandoffs();
                                const current = state.handoffs.find((item) => item.id === record.id);
                                if (current.status === "pending" || current.status === "applying") {
                                    current.status = "blocked";
                                    current.error = "蕭觀音尚未完成录入，已保留转交记录";
                                    current.updatedAt = new Date().toISOString();
                                    await saveHandoffs(state);
                                }
                            });
                        }
                        const latest = (await readHandoffs()).handoffs.find((item) => item.id === record.id);
                        return toolResult({ ok: latest.status === "applied", applied: latest.status === "applied", handoffId: latest.id, status: latest.status, result: latest.resultSummary, error: latest.error });
                    }
                    catch (error) {
                        return toolResult({ ok: false, applied: false, error: error instanceof Error ? error.message : String(error) });
                    }
                }
            };
        }, { name: HANDOFF_TOOL, optional: true });
        api.on("gateway_start", () => {
            if (tickTimer)
                clearInterval(tickTimer);
            tickTimer = setInterval(() => void processDueReminders(), TICK_INTERVAL_MS);
            tickTimer.unref?.();
            void processDueReminders();
            api.logger.info("morning-brief-control started");
        });
        api.on("gateway_stop", () => {
            if (tickTimer)
                clearInterval(tickTimer);
            tickTimer = undefined;
        });
    }
});
