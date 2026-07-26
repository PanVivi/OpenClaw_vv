import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
const TOOL_NAME = "housekeeper_task_watch";
const TICK_MS = 15_000;
const TASK_ID_PATTERN = /(?:Task\s*ID|任务\s*ID|任務\s*ID)[*_` \t]*[:：=][*_` \t]*([A-Za-z0-9][A-Za-z0-9._-]{2,99})/i;
const ParamsSchema = Type.Object({
    action: Type.Union([
        Type.Literal("list"),
        Type.Literal("get"),
        Type.Literal("update")
    ]),
    task_id: Type.Optional(Type.String({ minLength: 3, maxLength: 100 })),
    status: Type.Optional(Type.Union([
        Type.Literal("waiting"),
        Type.Literal("progress"),
        Type.Literal("completed"),
        Type.Literal("blocked"),
        Type.Literal("cancelled")
    ])),
    note: Type.Optional(Type.String({ maxLength: 2000 })),
    next_report_minutes: Type.Optional(Type.Integer({ minimum: 2, maximum: 1440 }))
}, { additionalProperties: false });
function toolResult(value) {
    return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        details: value
    };
}
function taskIdFromMessage(value) {
    if (typeof value !== "string")
        return undefined;
    return TASK_ID_PATTERN.exec(value)?.[1];
}
function targetFromParams(params) {
    if (typeof params.agentId === "string" && params.agentId.trim()) {
        return params.agentId.trim();
    }
    if (typeof params.sessionKey === "string" && params.sessionKey.trim()) {
        return params.sessionKey.trim();
    }
    return "unknown";
}
export function buildStallAlertMessage(record) {
    return [
        `[Housekeeper task watchdog]`,
        `Task ID: ${record.taskId}`,
        `Target: ${record.target}`,
        `Report deadline: ${record.dueAt}`,
        `Last verified status: ${record.status}`,
        `Last verified note: ${record.note || "none"}`,
        `Verified fact: no progress update was recorded before the report deadline.`,
        `This does NOT prove that the target failed, stopped, or is dead.`,
        `Tell the owner only the verified missed-report condition, clearly distinguish unknown execution state, and say this is an automatic watchdog alert. Do not claim completion or failure, do not wait or poll, and do not expand the task.`
    ].join("\n");
}
export default definePluginEntry({
    id: "housekeeper-async-dispatch",
    name: "Housekeeper Async Dispatch",
    description: "Keep housekeeper delegation responsive and report stalled A2A work.",
    register(api) {
        const pluginConfig = (api.pluginConfig ?? {});
        const allowedAgentId = typeof pluginConfig.agentId === "string" && pluginConfig.agentId.trim()
            ? pluginConfig.agentId.trim()
            : "housekeeper";
        const ownerChatId = typeof pluginConfig.ownerChatId === "string" && pluginConfig.ownerChatId.trim()
            ? pluginConfig.ownerChatId.trim()
            : "";
        const configuredStallMinutes = Number(pluginConfig.stallMinutes ?? 10);
        const stallMinutes = Number.isInteger(configuredStallMinutes) &&
            configuredStallMinutes >= 2 &&
            configuredStallMinutes <= 1440
            ? configuredStallMinutes
            : 10;
        const ownerSessionKey = ownerChatId
            ? `agent:${allowedAgentId}:telegram:direct:${ownerChatId}`
            : undefined;
        const statePath = join(process.env.HOME ?? api.rootDir ?? ".", ".openclaw", "housekeeper-async-dispatch", "tasks.json");
        const fileLockPath = `${statePath}.lock`;
        let stateQueue = Promise.resolve();
        let tickTimer;
        let ticking = false;
        const readState = async () => {
            try {
                const value = JSON.parse(await readFile(statePath, "utf8"));
                return value?.version === 1 && Array.isArray(value.tasks)
                    ? value
                    : { version: 1, tasks: [] };
            }
            catch (error) {
                if (error.code === "ENOENT") {
                    return { version: 1, tasks: [] };
                }
                throw error;
            }
        };
        const writeState = async (state) => {
            await mkdir(dirname(statePath), { recursive: true, mode: 0o700 });
            const temporaryPath = `${statePath}.tmp-${process.pid}-${randomUUID()}`;
            await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
                encoding: "utf8",
                mode: 0o600
            });
            await rename(temporaryPath, statePath);
        };
        const withStateLock = async (operation) => {
            let release = () => undefined;
            const previous = stateQueue;
            stateQueue = new Promise((resolve) => {
                release = resolve;
            });
            await previous;
            try {
                await mkdir(dirname(statePath), { recursive: true, mode: 0o700 });
                let acquired = false;
                for (let attempt = 0; attempt < 80; attempt += 1) {
                    try {
                        await mkdir(fileLockPath);
                        acquired = true;
                        break;
                    }
                    catch (error) {
                        if (error.code !== "EEXIST")
                            throw error;
                        await new Promise((resolve) => setTimeout(resolve, 25));
                    }
                }
                if (!acquired)
                    throw new Error("Timed out acquiring housekeeper task state lock");
                try {
                    return await operation();
                }
                finally {
                    await rm(fileLockPath, { recursive: true, force: true });
                }
            }
            finally {
                release();
            }
        };
        const upsertDispatch = async (taskId, target, sourceSessionKey) => {
            await withStateLock(async () => {
                const state = await readState();
                const now = new Date();
                const existing = state.tasks.find((task) => task.taskId === taskId);
                const record = existing ?? {
                    taskId,
                    target,
                    sourceSessionKey,
                    status: "waiting",
                    dispatchedAt: now.toISOString(),
                    lastUpdateAt: now.toISOString(),
                    dueAt: new Date(now.getTime() + stallMinutes * 60_000).toISOString(),
                    alertCount: 0
                };
                record.target = target;
                record.sourceSessionKey = sourceSessionKey;
                record.status = "waiting";
                record.lastUpdateAt = now.toISOString();
                record.dueAt = new Date(now.getTime() + stallMinutes * 60_000).toISOString();
                record.note = "A2A delegation accepted; waiting for acknowledgement or progress";
                if (!existing)
                    state.tasks.push(record);
                await writeState(state);
            });
        };
        const updateFromInterSession = async (prompt) => {
            if (!prompt.includes("[Inter-session message]") ||
                !prompt.includes("sourceTool=sessions_send")) {
                return;
            }
            const taskId = taskIdFromMessage(prompt);
            if (!taskId)
                return;
            await withStateLock(async () => {
                const state = await readState();
                const record = state.tasks.find((task) => task.taskId === taskId);
                if (!record)
                    return;
                const explicitStatus = /(?:Status|状态|狀態)\s*[:：]\s*(completed|complete|done|failed|error|blocked|cancelled|canceled)/i.exec(prompt)?.[1]?.toLowerCase();
                let status = "progress";
                if (explicitStatus === "completed" ||
                    explicitStatus === "complete" ||
                    explicitStatus === "done" ||
                    /(?:本任务|本任務|任务|任務)\s*(?:已)?完成|执行完成|執行完成/i.test(prompt)) {
                    status = "completed";
                }
                else if (explicitStatus === "failed" ||
                    explicitStatus === "error" ||
                    explicitStatus === "blocked") {
                    status = "blocked";
                }
                else if (explicitStatus === "cancelled" ||
                    explicitStatus === "canceled") {
                    status = "cancelled";
                }
                const now = new Date();
                record.status = status;
                record.lastUpdateAt = now.toISOString();
                record.note =
                    status === "progress"
                        ? "Target Agent reported progress through A2A"
                        : `Target Agent reported terminal status through A2A: ${status}`;
                if (status === "progress") {
                    record.dueAt = new Date(now.getTime() + stallMinutes * 60_000).toISOString();
                }
                await writeState(state);
            });
        };
        const alertStalledTask = async (record) => {
            if (!ownerSessionKey) {
                throw new Error("Plugin config ownerChatId is required");
            }
            await api.runtime.subagent.run({
                sessionKey: ownerSessionKey,
                message: buildStallAlertMessage(record),
                lightContext: false,
                deliver: true,
                idempotencyKey: `housekeeper-stall:${record.taskId}:${record.alertCount + 1}`,
                lane: `housekeeper-watch:${record.taskId}`
            });
        };
        const processDue = async () => {
            if (ticking)
                return;
            ticking = true;
            try {
                const due = await withStateLock(async () => {
                    const state = await readState();
                    const now = Date.now();
                    const selected = state.tasks
                        .filter((task) => (task.status === "waiting" || task.status === "progress") &&
                        Date.parse(task.dueAt) <= now)
                        .map((task) => structuredClone(task));
                    return selected;
                });
                for (const snapshot of due) {
                    let alertError;
                    try {
                        await alertStalledTask(snapshot);
                    }
                    catch (error) {
                        alertError = error instanceof Error ? error.message : String(error);
                    }
                    await withStateLock(async () => {
                        const state = await readState();
                        const current = state.tasks.find((task) => task.taskId === snapshot.taskId);
                        if (!current ||
                            !["waiting", "progress"].includes(current.status) ||
                            current.dueAt !== snapshot.dueAt) {
                            return;
                        }
                        const now = new Date();
                        current.status = "blocked";
                        current.lastUpdateAt = now.toISOString();
                        current.lastAlertAt = alertError ? undefined : now.toISOString();
                        current.alertCount += alertError ? 0 : 1;
                        current.note = alertError
                            ? `Watchdog delivery failed: ${alertError}`
                            : "No progress before report deadline; owner alert run dispatched";
                        await writeState(state);
                    });
                }
            }
            catch (error) {
                api.logger.error(`housekeeper watchdog tick failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            finally {
                ticking = false;
            }
        };
        api.on("before_tool_call", async (event, ctx) => {
            if (ctx.agentId !== allowedAgentId || event.toolName !== "sessions_send") {
                return;
            }
            const taskId = taskIdFromMessage(event.params.message);
            if (taskId) {
                try {
                    await upsertDispatch(taskId, targetFromParams(event.params), ctx.sessionKey ?? ownerSessionKey ?? "unknown");
                }
                catch (error) {
                    api.logger.error(`housekeeper task watch could not persist ${taskId}; delegation continues: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            else {
                api.logger.warn(`housekeeper sessions_send has no Task ID and cannot be watched (session=${ctx.sessionKey ?? "unknown"})`);
            }
            if (event.params.timeoutSeconds !== 0) {
                api.logger.info(`rewrote housekeeper sessions_send to fire-and-forget (session=${ctx.sessionKey ?? "unknown"})`);
                return {
                    params: {
                        ...event.params,
                        timeoutSeconds: 0
                    }
                };
            }
        }, { priority: 100 });
        api.on("gateway_start", () => {
            if (tickTimer)
                clearInterval(tickTimer);
            tickTimer = setInterval(() => void processDue(), TICK_MS);
            tickTimer.unref?.();
            void processDue();
            api.logger.info(`housekeeper watchdog started (state=${statePath})`);
        });
        api.on("gateway_stop", () => {
            if (tickTimer)
                clearInterval(tickTimer);
            tickTimer = undefined;
        });
        api.on("before_agent_start", async (event, ctx) => {
            if (ctx.agentId !== allowedAgentId)
                return;
            try {
                await updateFromInterSession(event.prompt);
            }
            catch (error) {
                api.logger.error(`housekeeper task watch could not process A2A update; agent run continues: ${error instanceof Error ? error.message : String(error)}`);
            }
        }, { priority: 100 });
        api.registerTool((ctx) => {
            if (ctx.agentId !== allowedAgentId)
                return null;
            return {
                name: TOOL_NAME,
                label: "Housekeeper Task Watch",
                description: "List or update persistent housekeeper A2A task watches. Every target acknowledgement/progress/terminal report must update its Task ID. completed/cancelled closes the watch; blocked reports immediately and remains visible.",
                parameters: ParamsSchema,
                async execute(_toolCallId, rawParams) {
                    const params = rawParams;
                    try {
                        return await withStateLock(async () => {
                            const state = await readState();
                            if (params.action === "list") {
                                return toolResult({ ok: true, tasks: state.tasks });
                            }
                            const taskId = typeof params.task_id === "string" ? params.task_id.trim() : "";
                            if (!taskId)
                                throw new Error("task_id is required");
                            const record = state.tasks.find((task) => task.taskId === taskId);
                            if (!record)
                                throw new Error(`Task watch not found: ${taskId}`);
                            if (params.action === "get") {
                                return toolResult({ ok: true, task: record });
                            }
                            if (params.action !== "update") {
                                throw new Error(`Unknown action: ${String(params.action)}`);
                            }
                            if (typeof params.status !== "string") {
                                throw new Error("status is required for update");
                            }
                            const now = new Date();
                            record.status = params.status;
                            record.lastUpdateAt = now.toISOString();
                            record.note =
                                typeof params.note === "string" ? params.note.trim() : record.note;
                            if (record.status === "waiting" || record.status === "progress") {
                                const minutes = Number(params.next_report_minutes ?? stallMinutes);
                                record.dueAt = new Date(now.getTime() + minutes * 60_000).toISOString();
                            }
                            await writeState(state);
                            return toolResult({ ok: true, task: record });
                        });
                    }
                    catch (error) {
                        return toolResult({
                            ok: false,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
            };
        }, { name: TOOL_NAME, optional: true });
    },
});
