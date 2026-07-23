import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CronExpressionParser } from "cron-parser";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";

type JsonRecord = Record<string, unknown>;
type ScheduleSpec =
  | { kind: "cron"; expr: string; tz: string }
  | { kind: "at"; at: string };

type AutomationRecord = {
  taskId: string;
  schedulerJobId: string;
  name: string;
  prompt: string;
  schedule: ScheduleSpec;
  notifyOwner: boolean;
  enabled: boolean;
  nextRunAt?: string;
  pendingRunAt?: string;
  lastRunAt?: string;
  lastRunStatus?: "running" | "ok" | "error";
  lastRunId?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

type StateFile = {
  version: 1;
  jobs: AutomationRecord[];
};

const TOOL_NAME = "life_automation";
const JOB_PREFIX = "life-automation-";
const TICK_INTERVAL_MS = 15_000;
const RUN_TIMEOUT_MS = 10 * 60_000;

const ParamsSchema = Type.Object(
  {
    action: Type.Union([
      Type.Literal("list"),
      Type.Literal("get"),
      Type.Literal("create"),
      Type.Literal("update"),
      Type.Literal("pause"),
      Type.Literal("resume"),
      Type.Literal("remove"),
      Type.Literal("run_now")
    ]),
    job_id: Type.Optional(Type.String({ minLength: 1 })),
    task_id: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 100,
        pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$"
      })
    ),
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    prompt: Type.Optional(Type.String({ minLength: 1, maxLength: 16000 })),
    schedule_kind: Type.Optional(
      Type.Union([
        Type.Literal("cron"),
        Type.Literal("every"),
        Type.Literal("at")
      ])
    ),
    cron_expression: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    timezone: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    every_minutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 10080 })),
    at: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    enabled: Type.Optional(Type.Boolean()),
    notify_owner: Type.Optional(Type.Boolean())
  },
  { additionalProperties: false }
);

function result(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    details: value
  };
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function scheduleFromEveryMinutes(minutes: number, timezone: string): ScheduleSpec {
  if (!Number.isInteger(minutes) || minutes < 1) {
    throw new Error("every_minutes must be a positive integer");
  }
  if (minutes < 60 && 60 % minutes === 0) {
    return { kind: "cron", expr: `*/${minutes} * * * *`, tz: timezone };
  }
  if (minutes >= 60 && minutes < 1440 && minutes % 60 === 0) {
    const hours = minutes / 60;
    if (24 % hours === 0) {
      return { kind: "cron", expr: `0 */${hours} * * *`, tz: timezone };
    }
  }
  if (minutes === 1440) return { kind: "cron", expr: "0 0 * * *", tz: timezone };
  if (minutes === 10080) return { kind: "cron", expr: "0 0 * * 0", tz: timezone };
  throw new Error(
    "every_minutes must map exactly to Cron; otherwise use schedule_kind=cron"
  );
}

function buildSchedule(params: JsonRecord, defaultTimezone: string): ScheduleSpec {
  const kind = requireText(params.schedule_kind, "schedule_kind");
  const timezone =
    typeof params.timezone === "string" && params.timezone.trim()
      ? params.timezone.trim()
      : defaultTimezone;
  if (kind === "cron") {
    const schedule = {
      kind: "cron" as const,
      expr: requireText(params.cron_expression, "cron_expression"),
      tz: timezone
    };
    computeNextRunAt(schedule, Date.now());
    return schedule;
  }
  if (kind === "every") {
    const schedule = scheduleFromEveryMinutes(Number(params.every_minutes), timezone);
    computeNextRunAt(schedule, Date.now());
    return schedule;
  }
  if (kind === "at") {
    const schedule = { kind: "at" as const, at: requireText(params.at, "at") };
    computeNextRunAt(schedule, Date.now());
    return schedule;
  }
  throw new Error("schedule_kind must be cron, every, or at");
}

function computeNextRunAt(schedule: ScheduleSpec, fromMs: number): string {
  if (schedule.kind === "at") {
    const atMs = Date.parse(schedule.at);
    if (!Number.isFinite(atMs)) throw new Error("at must be a valid ISO date-time");
    if (atMs <= fromMs) throw new Error("at must be in the future");
    return new Date(atMs).toISOString();
  }
  return CronExpressionParser.parse(schedule.expr, {
    currentDate: new Date(fromMs),
    tz: schedule.tz
  }).next().toDate().toISOString();
}

export default definePluginEntry({
  id: "life-automation",
  name: "Life Automation",
  description: "Constrained persistent scheduler for the life agent.",
  register(api) {
    const pluginConfig = (api.pluginConfig ?? {}) as JsonRecord;
    const allowedAgentId =
      typeof pluginConfig.agentId === "string" && pluginConfig.agentId.trim()
        ? pluginConfig.agentId.trim()
        : "life";
    const defaultTimezone =
      typeof pluginConfig.timezone === "string" && pluginConfig.timezone.trim()
        ? pluginConfig.timezone.trim()
        : "Asia/Taipei";
    const ownerChatId =
      typeof pluginConfig.ownerChatId === "string" && pluginConfig.ownerChatId.trim()
        ? pluginConfig.ownerChatId.trim()
        : undefined;
    const sessionKey = ownerChatId
      ? `agent:${allowedAgentId}:telegram:direct:${ownerChatId}`
      : undefined;
    const statePath = join(
      process.env.HOME ?? api.rootDir ?? ".",
      ".openclaw",
      "life-automation",
      "jobs.json"
    );
    let stateQueue = Promise.resolve();
    let tickTimer: NodeJS.Timeout | undefined;
    let ticking = false;

    const readState = async (): Promise<StateFile> => {
      try {
        const parsed = JSON.parse(await readFile(statePath, "utf8")) as StateFile;
        return parsed?.version === 1 && Array.isArray(parsed.jobs)
          ? parsed
          : { version: 1, jobs: [] };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return { version: 1, jobs: [] };
        }
        throw error;
      }
    };

    const writeState = async (state: StateFile) => {
      await mkdir(dirname(statePath), { recursive: true });
      const temporaryPath = `${statePath}.tmp-${process.pid}`;
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600
      });
      await rename(temporaryPath, statePath);
    };

    const withStateLock = async <T>(operation: () => Promise<T>): Promise<T> => {
      let release: () => void = () => undefined;
      const previous = stateQueue;
      stateQueue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await operation();
      } finally {
        release();
      }
    };

    const executeRecord = async (record: AutomationRecord, runKey: string) => {
      if (!sessionKey) throw new Error("Plugin config ownerChatId is required");
      const started = await api.runtime.subagent.run({
        sessionKey,
        message: `[Life Automation ${record.taskId}]\n${record.prompt}`,
        lightContext: false,
        deliver: record.notifyOwner,
        idempotencyKey: `${record.taskId}:${runKey}`,
        lane: `life-automation:${record.taskId}`
      });
      const waited = await api.runtime.subagent.waitForRun({
        runId: started.runId,
        timeoutMs: RUN_TIMEOUT_MS
      });
      if (waited.status !== "ok") {
        throw new Error(waited.error ?? `Scheduled agent run ended with ${waited.status}`);
      }
      return started.runId;
    };

    const processDue = async () => {
      if (ticking) return;
      ticking = true;
      try {
        const due = await withStateLock(async () => {
          const state = await readState();
          const now = Date.now();
          const selected: AutomationRecord[] = [];
          for (const job of state.jobs) {
            if (job.pendingRunAt) {
              selected.push(structuredClone(job));
              continue;
            }
            if (!job.enabled || !job.nextRunAt || Date.parse(job.nextRunAt) > now) continue;
            job.pendingRunAt = job.nextRunAt;
            job.lastRunAt = new Date().toISOString();
            job.lastRunStatus = "running";
            job.lastError = undefined;
            if (job.schedule.kind === "at") {
              job.enabled = false;
              job.nextRunAt = undefined;
            } else {
              job.nextRunAt = computeNextRunAt(job.schedule, now);
            }
            job.updatedAt = new Date().toISOString();
            selected.push(structuredClone(job));
          }
          if (selected.length > 0) await writeState(state);
          return selected;
        });

        for (const snapshot of due) {
          const runKey = snapshot.pendingRunAt ?? new Date().toISOString();
          let runId: string | undefined;
          let runError: string | undefined;
          try {
            runId = await executeRecord(snapshot, runKey);
          } catch (error) {
            runError = error instanceof Error ? error.message : String(error);
          }
          await withStateLock(async () => {
            const state = await readState();
            const current = state.jobs.find((job) => job.taskId === snapshot.taskId);
            if (!current || current.pendingRunAt !== snapshot.pendingRunAt) return;
            current.pendingRunAt = undefined;
            current.lastRunStatus = runError ? "error" : "ok";
            current.lastRunId = runId;
            current.lastError = runError;
            current.updatedAt = new Date().toISOString();
            await writeState(state);
          });
        }
      } catch (error) {
        api.logger.error(
          `life-automation scheduler tick failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        ticking = false;
      }
    };

    api.on("gateway_start", () => {
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = setInterval(() => void processDue(), TICK_INTERVAL_MS);
      tickTimer.unref?.();
      void processDue();
      api.logger.info(`life-automation scheduler started (state=${statePath})`);
    });
    api.on("gateway_stop", () => {
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = undefined;
    });

    api.registerTool((ctx) => {
      if (ctx.agentId !== allowedAgentId) return null;

      return {
        name: TOOL_NAME,
        label: "Life Automation",
        description:
          "Manage only life-owned persistent scheduled tasks. Supports list/get/create/update/pause/resume/remove/run_now. It cannot run shell commands, write OpenClaw config, or target another agent.",
        parameters: ParamsSchema,
        async execute(_toolCallId, rawParams) {
          const params = rawParams as JsonRecord;
          try {
            return await withStateLock(async () => {
              const state = await readState();
              const findRecord = () => {
                const identifier =
                  typeof params.task_id === "string" && params.task_id.trim()
                    ? params.task_id.trim()
                    : requireText(params.job_id, "job_id or task_id");
                const record = state.jobs.find(
                  (candidate) =>
                    candidate.taskId === identifier ||
                    candidate.schedulerJobId === identifier
                );
                if (!record) throw new Error(`Life automation not found: ${identifier}`);
                return record;
              };

              switch (params.action) {
                case "list":
                  return result({ ok: true, jobs: state.jobs });
                case "get":
                  return result({ ok: true, job: findRecord() });
                case "create": {
                  const taskId = requireText(params.task_id, "task_id");
                  const existing = state.jobs.find((job) => job.taskId === taskId);
                  if (existing) return result({ ok: true, created: false, job: existing });
                  const now = new Date().toISOString();
                  const schedule = buildSchedule(params, defaultTimezone);
                  const enabled = params.enabled !== false;
                  const record: AutomationRecord = {
                    taskId,
                    schedulerJobId: `${JOB_PREFIX}${taskId}`,
                    name: requireText(params.name, "name"),
                    prompt: requireText(params.prompt, "prompt"),
                    schedule,
                    notifyOwner: params.notify_owner === true,
                    enabled,
                    nextRunAt: enabled ? computeNextRunAt(schedule, Date.now()) : undefined,
                    createdAt: now,
                    updatedAt: now
                  };
                  state.jobs.push(record);
                  await writeState(state);
                  return result({ ok: true, created: true, job: record });
                }
                case "update": {
                  const record = findRecord();
                  if (typeof params.name === "string" && params.name.trim()) {
                    record.name = params.name.trim();
                  }
                  if (typeof params.prompt === "string" && params.prompt.trim()) {
                    record.prompt = params.prompt.trim();
                  }
                  if (typeof params.schedule_kind === "string") {
                    record.schedule = buildSchedule(params, defaultTimezone);
                  }
                  if (typeof params.notify_owner === "boolean") {
                    record.notifyOwner = params.notify_owner;
                  }
                  if (typeof params.enabled === "boolean") record.enabled = params.enabled;
                  record.nextRunAt = record.enabled
                    ? computeNextRunAt(record.schedule, Date.now())
                    : undefined;
                  record.updatedAt = new Date().toISOString();
                  await writeState(state);
                  return result({ ok: true, job: record });
                }
                case "pause": {
                  const record = findRecord();
                  record.enabled = false;
                  record.nextRunAt = undefined;
                  record.updatedAt = new Date().toISOString();
                  await writeState(state);
                  return result({ ok: true, job: record });
                }
                case "resume": {
                  const record = findRecord();
                  record.enabled = true;
                  record.nextRunAt = computeNextRunAt(record.schedule, Date.now());
                  record.updatedAt = new Date().toISOString();
                  await writeState(state);
                  return result({ ok: true, job: record });
                }
                case "remove": {
                  const record = findRecord();
                  state.jobs = state.jobs.filter((candidate) => candidate !== record);
                  await writeState(state);
                  return result({ ok: true, removed: true, job: record });
                }
                case "run_now": {
                  const record = findRecord();
                  const runKey = `manual-${Date.now()}`;
                  record.lastRunAt = new Date().toISOString();
                  record.lastRunStatus = "running";
                  record.lastError = undefined;
                  await writeState(state);
                  try {
                    record.lastRunId = await executeRecord(record, runKey);
                    record.lastRunStatus = "ok";
                  } catch (error) {
                    record.lastRunStatus = "error";
                    record.lastError = error instanceof Error ? error.message : String(error);
                  }
                  record.updatedAt = new Date().toISOString();
                  await writeState(state);
                  return result({
                    ok: record.lastRunStatus === "ok",
                    job: record
                  });
                }
                default:
                  throw new Error(`Unknown action: ${String(params.action)}`);
              }
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            api.logger.warn(`life-automation tool call failed: ${message}`);
            return result({ ok: false, error: message });
          }
        }
      };
    }, { name: TOOL_NAME, optional: true });
  }
});
