#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const HOME = "/Volume3/OpenClaw/home";
const ROOT = `${HOME}/.openclaw`;
const CONFIG = `${ROOT}/openclaw.json`;
const NODE = "/Volume3/@apps/openclaw/node/bin/node";
const CLI = "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs";
const GROK_CRON = "573e173b-1b10-47e4-8ed4-18e68d3cc4d0";
const IDS = ["housekeeper", "life", "ops", "coder", "reviewer", "companion-wu", "companion-lv", "companion-dugu"];

const BACKGROUND = route("custom-3/LongCat-2.0", [
  "qwen-coding-cn/qwen3.6-flash",
  "deepseek/deepseek-v4-flash"
]);
const ENGINEERING_CHILD = route("custom-2/composer-2.5", [
  "custom-1/gpt-5.6-luna",
  "qwen-coding-cn/glm-5.2",
  "deepseek/deepseek-v4-flash",
  "custom-3/LongCat-2.0"
]);
const LIFE_CHILD = route("custom-2/composer-2.5", [
  "custom-1/gpt-5.6-luna",
  "qwen-coding-cn/qwen3.8-max",
  "deepseek/deepseek-v4-flash",
  "custom-3/LongCat-2.0"
]);
const MAIN = {
  housekeeper: route("custom-2/grok-4.5", ["custom-1/gpt-5.6-luna", "qwen-coding-cn/qwen3.8-max", "deepseek/deepseek-v4-flash", "custom-3/LongCat-2.0"]),
  life: route("custom-2/grok-4.5", ["custom-1/gpt-5.6-luna", "qwen-coding-cn/qwen3.8-max", "deepseek/deepseek-v4-flash", "custom-3/LongCat-2.0"]),
  ops: route("custom-1/gpt-5.6-sol", ["custom-2/grok-4.5", "qwen-coding-cn/glm-5.2", "deepseek/deepseek-v4-pro", "custom-3/LongCat-2.0"]),
  coder: route("custom-1/gpt-5.6-sol", ["custom-2/grok-4.5", "qwen-coding-cn/glm-5.2", "deepseek/deepseek-v4-flash", "custom-3/LongCat-2.0"]),
  reviewer: route("custom-1/gpt-5.6-sol", ["custom-2/grok-4.5", "deepseek/deepseek-v4-pro", "qwen-coding-cn/glm-5.2", "custom-3/LongCat-2.0"]),
  "companion-wu": route("custom-2/grok-4.20-non-reasoning", ["qwen-coding-cn/qwen3.6-flash", "custom-3/LongCat-2.0", "deepseek/deepseek-v4-flash"]),
  "companion-lv": route("custom-2/grok-4.20-non-reasoning", ["qwen-coding-cn/qwen3.6-flash", "custom-3/LongCat-2.0", "deepseek/deepseek-v4-flash"]),
  "companion-dugu": route("custom-2/grok-4.20-non-reasoning", ["qwen-coding-cn/qwen3.6-flash", "custom-3/LongCat-2.0", "deepseek/deepseek-v4-flash"])
};

function route(primary, fallbacks) { return { primary, fallbacks }; }
function fail(message) { throw new Error(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function hashBuffer(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function sha256(file) { return hashBuffer(fs.readFileSync(file)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return hashBuffer(Buffer.from(JSON.stringify(stable(value)))); }
function writeJson0600(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, file);
  fs.chmodSync(file, 0o600);
}
function parseCliJson(raw) {
  const text = String(raw);
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((value) => value >= 0);
  if (!starts.length) fail("OpenClaw CLI did not return JSON");
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (end < start) fail("OpenClaw CLI returned incomplete JSON");
  return JSON.parse(text.slice(start, end + 1));
}
function cli(args, options = {}) {
  return execFileSync(NODE, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME, ...(options.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout ?? 120000
  });
}
function cliJson(args, options) { return parseCliJson(cli(args, options)); }
function gateway(method, params) { return cliJson(["gateway", "call", method, "--params", JSON.stringify(params), "--json"]); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function expectedChild(id) { return ["ops", "coder", "reviewer"].includes(id) ? ENGINEERING_CHILD : LIFE_CHILD; }

function sessionFile(id) { return `${ROOT}/agents/${id}/sessions/sessions.json`; }
function sessionRows(id) {
  const file = sessionFile(id);
  if (!fs.existsSync(file)) return [];
  const store = readJson(file);
  if (Array.isArray(store)) return store.map((row) => ({ key: row.key ?? row.sessionKey, row }));
  return Object.entries(store).map(([key, row]) => ({ key, row }));
}
function overrides() {
  const result = [];
  for (const id of IDS) for (const { key, row } of sessionRows(id)) {
    if (!row || typeof row !== "object" || (!row.modelOverride && !row.providerOverride)) continue;
    if (!key || !String(key).startsWith(`agent:${id}:`)) fail(`unexpected session key in ${id} store`);
    result.push({
      agentId: id,
      key,
      provider: row.providerOverride ?? null,
      model: row.modelOverride ?? null,
      source: row.modelOverrideSource ?? null,
      modelRef: row.providerOverride && row.modelOverride ? `${row.providerOverride}/${row.modelOverride}` : row.modelOverride ?? null
    });
  }
  return result;
}
function identityView(config) {
  return {
    agents: (config.agents?.list ?? []).filter((agent) => IDS.includes(agent.id)).map((agent) => ({
      id: agent.id,
      name: agent.name ?? null,
      workspace: agent.workspace ?? null,
      tools: agent.tools ?? null
    })),
    bindings: config.bindings ?? [],
    telegram: config.channels?.telegram?.accounts ?? null
  };
}
function validateIdentities(config) {
  const actual = (config.agents?.list ?? []).map((agent) => agent.id).filter((id) => IDS.includes(id)).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...IDS].sort())) fail(`configured Agent IDs differ: ${actual.join(",")}`);
  for (const id of IDS) {
    const count = (config.agents.list ?? []).filter((agent) => agent.id === id).length;
    if (count !== 1) fail(`Agent ${id} count is ${count}`);
  }
}
function validateAllowlist(config) {
  const allowed = new Set(Object.keys(config.agents?.defaults?.models ?? {}));
  const required = [BACKGROUND, ENGINEERING_CHILD, LIFE_CHILD, ...Object.values(MAIN)].flatMap((item) => [item.primary, ...item.fallbacks]);
  const missing = [...new Set(required.filter((model) => !allowed.has(model)))];
  if (missing.length) fail(`required models missing from allowlist: ${missing.join(", ")}`);
  return { count: allowed.size, required: [...new Set(required)].length };
}
function buildCandidate(config) {
  const candidate = clone(config);
  validateIdentities(candidate);
  validateAllowlist(candidate);
  candidate.agents.defaults.model = clone(BACKGROUND);
  candidate.agents.defaults.utilityModel = "custom-3/LongCat-2.0";
  candidate.agents.defaults.subagents ??= {};
  candidate.agents.defaults.subagents.model = clone(LIFE_CHILD);
  for (const agent of candidate.agents.list) {
    if (!IDS.includes(agent.id)) continue;
    agent.model = clone(MAIN[agent.id]);
    agent.subagents ??= {};
    agent.subagents.model = clone(expectedChild(agent.id));
  }
  const ops = candidate.agents.list.find((agent) => agent.id === "ops");
  if (ops.heartbeat?.model !== "custom-3/LongCat-2.0") fail("ops heartbeat is not pinned to LongCat before deployment");
  return candidate;
}
function validateCandidate(file) {
  const result = cliJson(["config", "validate", "--json"], {
    env: { OPENCLAW_STATE_DIR: ROOT, OPENCLAW_CONFIG_PATH: file }
  });
  if (result.valid !== true || path.resolve(String(result.path ?? "")) !== path.resolve(file)) fail(`candidate config invalid: ${JSON.stringify(result)}`);
  return result;
}
function currentCron() {
  const jobs = cliJson(["cron", "list", "--all", "--json"]).jobs ?? [];
  const job = jobs.find((item) => item.id === GROK_CRON);
  if (!job || job.payload?.kind !== "agentTurn") fail("Grok quota Agent Turn is missing");
  return job;
}
function setCronRoute(model, fallbacks) {
  const args = ["cron", "edit", GROK_CRON];
  if (model) args.push("--model", model);
  else args.push("--clear-model");
  if ((fallbacks ?? []).length) args.push("--fallbacks", fallbacks.join(","));
  else args.push("--clear-fallbacks");
  cli(args);
}
function activeTasks() {
  const tasks = gateway("tasks.list", { limit: 200 }).tasks ?? [];
  return tasks.filter((item) => ["queued", "running"].includes(item.status));
}
function preflight() {
  const config = readJson(CONFIG);
  validateIdentities(config);
  const allowlist = validateAllowlist(config);
  const candidate = buildCandidate(config);
  const temporary = `${ROOT}/backups/model-routing-preflight-${process.pid}.json`;
  writeJson0600(temporary, candidate);
  let validation;
  try { validation = validateCandidate(temporary); } finally { fs.rmSync(temporary, { force: true }); }
  const cron = currentCron();
  console.log(JSON.stringify({
    ok: true,
    action: "preflight",
    configSha256: sha256(CONFIG),
    identitySha256: digest(identityView(config)),
    allowlist,
    candidateValidated: validation.valid === true,
    activeTasks: activeTasks().length,
    overrides: overrides().length,
    grokCron: { id: cron.id, enabled: cron.enabled, model: cron.payload.model ?? null, fallbacks: cron.payload.fallbacks ?? [] }
  }, null, 2));
}
function deploy(stampArg) {
  const stamp = String(stampArg ?? "").replace(/[^0-9A-Za-z_-]/g, "");
  if (!stamp) fail("deployment stamp is required");
  const active = activeTasks();
  if (active.length) fail(`active tasks exist (${active.length}); refusing deployment`);
  const config = readJson(CONFIG);
  validateIdentities(config);
  validateAllowlist(config);
  const originalIdentityHash = digest(identityView(config));
  const candidate = buildCandidate(config);
  if (digest(identityView(candidate)) !== originalIdentityHash) fail("candidate changed identity or tools");
  const backupRoot = path.resolve(`${ROOT}/backups/model-routing-${stamp}`);
  const backupsRoot = path.resolve(`${ROOT}/backups`);
  if (!backupRoot.startsWith(`${backupsRoot}${path.sep}`) || fs.existsSync(backupRoot)) fail("unsafe or existing backup directory");
  fs.mkdirSync(backupRoot, { recursive: false, mode: 0o700 });
  const cron = currentCron();
  const beforeOverrides = overrides();
  const manifest = {
    schema: "openclaw.model-routing-backup",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    stamp,
    configSha256: sha256(CONFIG),
    identitySha256: originalIdentityHash,
    grokCron: { id: cron.id, model: cron.payload.model ?? null, fallbacks: cron.payload.fallbacks ?? [] },
    overrides: beforeOverrides,
    files: []
  };
  const copy = (source, relative) => {
    if (!fs.existsSync(source)) return;
    const target = path.join(backupRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.copyFileSync(source, target);
    manifest.files.push({ source, relative, sha256: sha256(source) });
  };
  copy(CONFIG, "openclaw.json");
  copy(`${ROOT}/cron/jobs.json`, "cron/jobs.json");
  for (const id of IDS) copy(sessionFile(id), `sessions/${id}.json`);
  writeJson0600(path.join(backupRoot, "manifest.json"), manifest);
  const candidatePath = path.join(backupRoot, "candidate-openclaw.json");
  writeJson0600(candidatePath, candidate);
  validateCandidate(candidatePath);
  try {
    const temporary = `${CONFIG}.${process.pid}.tmp`;
    fs.copyFileSync(candidatePath, temporary);
    fs.chmodSync(temporary, 0o600);
    fs.renameSync(temporary, CONFIG);
    setCronRoute(BACKGROUND.primary, BACKGROUND.fallbacks);
    const applied = readJson(CONFIG);
    if (digest(identityView(applied)) !== originalIdentityHash) fail("identity hash changed after deployment");
    console.log(JSON.stringify({
      ok: true,
      action: "deploy",
      backupRoot,
      previousConfigSha256: manifest.configSha256,
      configSha256: sha256(CONFIG),
      identitySha256: originalIdentityHash,
      candidateValidated: true,
      oldOverrideCount: beforeOverrides.length,
      restartPerformed: false
    }, null, 2));
  } catch (error) {
    fs.copyFileSync(path.join(backupRoot, "openclaw.json"), CONFIG);
    fs.chmodSync(CONFIG, 0o600);
    setCronRoute(manifest.grokCron.model, manifest.grokCron.fallbacks);
    throw error;
  }
}
function clearSessions(backupArg) {
  const backupRoot = path.resolve(String(backupArg ?? ""));
  if (!backupRoot.startsWith(`${path.resolve(`${ROOT}/backups`)}${path.sep}`)) fail("backup path is outside backups root");
  const manifest = readJson(path.join(backupRoot, "manifest.json"));
  if (manifest.schema !== "openclaw.model-routing-backup" || manifest.schemaVersion !== 1) fail("unsupported backup manifest");
  const pending = overrides();
  const cleared = [];
  try {
    for (const [index, item] of pending.entries()) {
      gateway("sessions.patch", { key: item.key, model: null });
      cleared.push(item);
      if ((index + 1) % 20 === 0 || index + 1 === pending.length) console.error(`session overrides cleared ${index + 1}/${pending.length}`);
    }
  } catch (error) {
    for (const item of [...cleared].reverse()) if (item.modelRef) {
      try { gateway("sessions.patch", { key: item.key, model: item.modelRef }); } catch { /* keep original failure */ }
    }
    throw error;
  }
  const remaining = overrides();
  if (remaining.length) fail(`session overrides remain: ${remaining.length}`);
  console.log(JSON.stringify({ ok: true, action: "clear-sessions", cleared: cleared.length, remaining: 0, transcriptsDeleted: false }, null, 2));
}
function verify() {
  const config = readJson(CONFIG);
  validateIdentities(config);
  validateAllowlist(config);
  const problems = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(config.agents.defaults.model, BACKGROUND)) problems.push("agents.defaults.model");
  if (config.agents.defaults.utilityModel !== "custom-3/LongCat-2.0") problems.push("agents.defaults.utilityModel");
  if (!same(config.agents.defaults.subagents?.model, LIFE_CHILD)) problems.push("agents.defaults.subagents.model");
  for (const id of IDS) {
    const agent = config.agents.list.find((item) => item.id === id);
    if (!same(agent.model, MAIN[id])) problems.push(`${id}.model`);
    if (!same(agent.subagents?.model, expectedChild(id))) problems.push(`${id}.subagents.model`);
  }
  const cron = currentCron();
  if (cron.payload.model !== BACKGROUND.primary || !same(cron.payload.fallbacks ?? [], BACKGROUND.fallbacks)) problems.push("grok-cron");
  const remaining = overrides();
  if (remaining.length) problems.push(`session-overrides:${remaining.length}`);
  const validation = cliJson(["config", "validate", "--json"]);
  if (validation.valid !== true) problems.push("config-validate");
  if (problems.length) fail(`verification failed: ${problems.join(", ")}`);
  console.log(JSON.stringify({
    ok: true,
    action: "verify",
    configSha256: sha256(CONFIG),
    identitySha256: digest(identityView(config)),
    overrides: 0,
    grokCron: { model: cron.payload.model, fallbacks: cron.payload.fallbacks },
    restartPerformed: false
  }, null, 2));
}
function rollback(backupArg) {
  const backupRoot = path.resolve(String(backupArg ?? ""));
  if (!backupRoot.startsWith(`${path.resolve(`${ROOT}/backups`)}${path.sep}`)) fail("backup path is outside backups root");
  const manifest = readJson(path.join(backupRoot, "manifest.json"));
  if (manifest.schema !== "openclaw.model-routing-backup" || manifest.schemaVersion !== 1) fail("unsupported backup manifest");
  fs.copyFileSync(path.join(backupRoot, "openclaw.json"), CONFIG);
  fs.chmodSync(CONFIG, 0o600);
  setCronRoute(manifest.grokCron.model, manifest.grokCron.fallbacks);
  const current = new Set(overrides().map((item) => item.key));
  for (const item of manifest.overrides ?? []) if (item.modelRef && !current.has(item.key)) gateway("sessions.patch", { key: item.key, model: item.modelRef });
  console.log(JSON.stringify({ ok: true, action: "rollback", configSha256: sha256(CONFIG), restoredOverrides: (manifest.overrides ?? []).length, restartPerformed: false }, null, 2));
}

const [action, argument] = process.argv.slice(2);
if (action === "preflight") preflight();
else if (action === "deploy") deploy(argument);
else if (action === "clear-sessions") clearSessions(argument);
else if (action === "verify") verify();
else if (action === "rollback") rollback(argument);
else fail("usage: DeployModelRouting.mjs preflight | deploy <stamp> | clear-sessions <backupDir> | verify | rollback <backupDir>");
