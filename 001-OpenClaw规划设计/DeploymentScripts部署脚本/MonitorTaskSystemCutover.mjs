#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const NODE = "/Volume3/@apps/openclaw/node/bin/node";
const CLI = "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs";
const LEGACY = new Set([
  "6c7eb802-d869-4ebc-b40b-b8b4f0c0e639",
  "73146ddf-8366-4b9c-9b81-0a8ae860f842"
]);

function parseJson(raw) {
  const text = String(raw);
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((value) => value >= 0);
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (!Number.isFinite(start) || start < 0 || end < start) throw new Error("OpenClaw CLI did not return JSON");
  return JSON.parse(text.slice(start, end + 1));
}

function cli(args) {
  return parseJson(execFileSync(NODE, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME: "/Volume3/OpenClaw/home" },
    maxBuffer: 64 * 1024 * 1024
  }));
}

function gateway(method, params) {
  return cli(["gateway", "call", method, "--params", JSON.stringify(params), "--json"]);
}

function cardSnapshot(boardId) {
  const result = cli(["workboard", "list", "--board", boardId, "--json"]);
  return (result.cards ?? []).map((card) => ({
    id: card.id,
    status: card.status,
    dispatchCount: card.dispatchCount ?? card.metadata?.dispatchCount ?? null
  }));
}

function snapshot() {
  const cron = cli(["cron", "list", "--all", "--json"]);
  const tasks = gateway("tasks.list", { limit: 200 }).tasks ?? [];
  const pluginsRaw = cli(["plugins", "list", "--json"]);
  const plugins = Array.isArray(pluginsRaw) ? pluginsRaw : pluginsRaw.plugins ?? [];
  return {
    at: Date.now(),
    legacyJobs: [...LEGACY].map((id) => {
      const job = (cron.jobs ?? []).find((item) => item.id === id);
      return { id, enabled: job?.enabled, lastRunAtMs: job?.state?.lastRunAtMs ?? job?.lastRunAtMs ?? null };
    }),
    tasks: tasks.map((task) => ({ id: task.id, sourceId: task.sourceId, title: task.title, status: task.status, createdAt: task.createdAt })),
    cards: {
      production: cardSnapshot("production"),
      taskSystem: cardSnapshot("task-system")
    },
    plugins: ["task-system-control", "workflow-governance", "housekeeper-workboard-control"].map((id) => {
      const row = plugins.find((item) => item.id === id);
      return { id, status: row?.status, version: row?.version };
    })
  };
}

const minutes = Number(process.argv[2] ?? 30);
if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 60) throw new Error("minutes must be between 0 and 60");
const start = snapshot();
console.log(JSON.stringify({ phase: "start", at: new Date(start.at).toISOString(), minutes, legacyJobs: start.legacyJobs }));
const deadline = Date.now() + minutes * 60_000;
let nextReport = Date.now() + 60_000;
while (Date.now() < deadline) {
  const waitMs = Math.min(50_000, deadline - Date.now());
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
  if (Date.now() >= nextReport) {
    console.log(JSON.stringify({ phase: "waiting", elapsedMinutes: Math.round((Date.now() - start.at) / 6000) / 10 }));
    nextReport += 60_000;
  }
}
const end = snapshot();
const startIds = new Set(start.tasks.map((task) => task.id));
const newTasks = end.tasks.filter((task) => !startIds.has(task.id) && task.createdAt >= start.at);
const legacyNewTasks = newTasks.filter((task) => LEGACY.has(task.sourceId));
const startCards = new Map([...start.cards.production, ...start.cards.taskSystem].map((card) => [card.id, card]));
const readyDispatchChanges = [...end.cards.production, ...end.cards.taskSystem]
  .filter((card) => card.status === "ready" && startCards.has(card.id))
  .filter((card) => startCards.get(card.id).dispatchCount !== card.dispatchCount)
  .map((card) => ({ id: card.id, before: startCards.get(card.id).dispatchCount, after: card.dispatchCount }));
const legacyStable = end.legacyJobs.every((job) => {
  const before = start.legacyJobs.find((item) => item.id === job.id);
  return job.enabled === false && before?.enabled === false && job.lastRunAtMs === before.lastRunAtMs;
});
const activeTasks = end.tasks.filter((task) => ["queued", "running"].includes(task.status));
const pluginsLoaded = end.plugins.every((plugin) => plugin.status === "loaded");
const result = {
  ok: legacyStable && legacyNewTasks.length === 0 && readyDispatchChanges.length === 0 && pluginsLoaded,
  action: "monitor-task-system-cutover",
  durationMinutes: Math.round((end.at - start.at) / 6000) / 10,
  legacyJobsStableAndDisabled: legacyStable,
  legacyTaskIncrement: legacyNewTasks.length,
  otherTaskIncrement: newTasks.filter((task) => !LEGACY.has(task.sourceId)),
  activeTasks,
  readyDispatchChanges,
  plugins: end.plugins,
  startLegacyJobs: start.legacyJobs,
  endLegacyJobs: end.legacyJobs
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 2;
