#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "/Volume3/OpenClaw/home/.openclaw";
const NODE = "/Volume3/@apps/openclaw/node/bin/node";
const CLI = "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs";
const OWNER_ID = "811150402";
const DISPATCH_JOB_ID = "6c7eb802-d869-4ebc-b40b-b8b4f0c0e639";
const RELAY_JOB_ID = "73146ddf-8366-4b9c-9b81-0a8ae860f842";
const PLUGINS = ["task-system-control", "workflow-governance", "housekeeper-workboard-control"];

function fail(message) { throw new Error(message); }
function inside(candidate, parent, label) {
  const target = path.resolve(candidate);
  const root = path.resolve(parent);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) fail(`${label} is outside ${root}`);
  return target;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
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
function cliJson(args) {
  return parseCliJson(execFileSync(NODE, [CLI, ...args], {
    encoding: "utf8", env: { ...process.env, HOME: "/Volume3/OpenClaw/home" }, maxBuffer: 64 * 1024 * 1024
  }));
}
function cliRun(args) {
  return execFileSync(NODE, [CLI, ...args], {
    encoding: "utf8", env: { ...process.env, HOME: "/Volume3/OpenClaw/home" }, maxBuffer: 64 * 1024 * 1024
  });
}
function refreshPluginRegistry() {
  const result = parseCliJson(cliRun(["plugins", "registry", "--refresh", "--json"]));
  if (result.refreshed !== true) fail(`plugin registry refresh failed: ${JSON.stringify(result)}`);
  return result;
}
function applyCronStates(states) {
  for (const job of states) {
    if (job.enabled) cliRun(["cron", "enable", job.id]);
    else cliRun(["cron", "disable", job.id]);
  }
}
function waitForNoActiveTasks(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let active = [];
  do {
    active = (gateway("tasks.list", { limit: 200 }).tasks ?? [])
      .filter((item) => ["queued", "running"].includes(item.status));
    if (!active.length) return [];
    execFileSync("sleep", ["1"]);
  } while (Date.now() < deadline);
  return active;
}
function validateCandidateConfig(candidatePath) {
  const result = parseCliJson(execFileSync(NODE, [CLI, "config", "validate", "--json"], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: "/Volume3/OpenClaw/home",
      OPENCLAW_STATE_DIR: ROOT,
      OPENCLAW_CONFIG_PATH: candidatePath
    },
    maxBuffer: 64 * 1024 * 1024
  }));
  if (result.valid !== true || path.resolve(String(result.path ?? "")) !== path.resolve(candidatePath)) {
    fail(`candidate config validation failed: ${JSON.stringify(result)}`);
  }
  return result;
}
function gateway(method, params) {
  return cliJson(["gateway", "call", method, "--params", JSON.stringify(params), "--json"]);
}
function copyTree(source, target) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) fail(`staged directory is missing: ${source}`);
  const temporary = `${target}.new-${process.pid}`;
  inside(temporary, ROOT, "temporary install target");
  fs.rmSync(temporary, { recursive: true, force: true });
  fs.cpSync(source, temporary, { recursive: true, force: true, errorOnExist: false });
  const visit = (candidate) => {
    const info = fs.lstatSync(candidate);
    if (info.isSymbolicLink()) fail(`staged tree contains a symlink: ${candidate}`);
    if (info.isDirectory()) {
      fs.chmodSync(candidate, 0o755);
      for (const name of fs.readdirSync(candidate)) visit(path.join(candidate, name));
    } else if (info.isFile()) fs.chmodSync(candidate, 0o644);
    else fail(`staged tree contains unsupported entry: ${candidate}`);
  };
  visit(temporary);
  fs.rmSync(target, { recursive: true, force: true });
  fs.renameSync(temporary, target);
}
function hydratePluginDependencies(backupRoot, emit = false) {
  const root = inside(backupRoot, `${ROOT}/backups`, "backup root");
  const donor = path.join(root, "extensions", "housekeeper-workboard-control", "node_modules", "typebox");
  if (!fs.existsSync(path.join(donor, "package.json"))) fail("backed-up typebox dependency is unavailable");
  const dependency = readJson(path.join(donor, "package.json"));
  if (dependency.name !== "typebox" || !/^1\./.test(String(dependency.version ?? ""))) {
    fail(`unexpected typebox dependency: ${dependency.name}@${dependency.version}`);
  }
  const installed = [];
  for (const id of PLUGINS) {
    const target = `${ROOT}/extensions/${id}/node_modules/typebox`;
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
    copyTree(donor, target);
    installed.push({ plugin: id, dependency: `typebox@${dependency.version}` });
  }
  const result = { ok: true, action: "hydrate-dependencies", source: donor, installed };
  if (emit) console.log(JSON.stringify(result, null, 2));
  return result;
}
function backupPath(source, backupRoot, relative, manifest) {
  inside(source, ROOT, "backup source");
  const target = path.join(backupRoot, relative);
  if (!fs.existsSync(source)) { manifest.items.push({ source, relative, existed: false }); return; }
  const info = fs.lstatSync(source);
  if (info.isSymbolicLink()) fail(`refusing to back up symlink target: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  if (info.isDirectory()) fs.cpSync(source, target, { recursive: true });
  else fs.copyFileSync(source, target);
  manifest.items.push({ source, relative, existed: true, type: info.isDirectory() ? "directory" : "file", ...(info.isFile() ? { sha256: sha256(source) } : {}) });
}
function restoreBackup(backupRoot) {
  const root = inside(backupRoot, `${ROOT}/backups`, "backup root");
  const manifest = readJson(path.join(root, "manifest.json"));
  for (const item of [...manifest.items].reverse()) {
    inside(item.source, ROOT, "restore target");
    fs.rmSync(item.source, { recursive: true, force: true });
    if (!item.existed) continue;
    const stored = path.join(root, item.relative);
    fs.mkdirSync(path.dirname(item.source), { recursive: true, mode: 0o700 });
    if (item.type === "directory") fs.cpSync(stored, item.source, { recursive: true });
    else fs.copyFileSync(stored, item.source);
  }
  // The registry is derived from the restored manifests. Rebuild it so a
  // failed candidate cannot leave stale schemas behind for later commands.
  refreshPluginRegistry();
  for (const job of manifest.crons ?? []) {
    if (job.enabled) cliRun(["cron", "enable", job.id]);
    else cliRun(["cron", "disable", job.id]);
  }
  console.log(JSON.stringify({ ok: true, action: "rollback", backupRoot: root, restartRequired: true }, null, 2));
}

function verifyRollbackBackup(backupArg) {
  const backupRoot = inside(backupArg, `${ROOT}/backups`, "backup root");
  const manifestPath = path.join(backupRoot, "manifest.json");
  if (!fs.existsSync(manifestPath)) fail("deployment backup manifest is missing");
  const manifest = readJson(manifestPath);
  if (manifest.schema !== "openclaw.task-system-repair-backup" || manifest.schemaVersion !== 1) {
    fail("deployment backup manifest schema is unsupported");
  }
  const rehearsalRoot = inside(path.join(backupRoot, `rollback-shadow-${process.pid}`), backupRoot, "rollback rehearsal root");
  if (fs.existsSync(rehearsalRoot)) fail("rollback rehearsal root already exists");
  const restored = [];
  try {
    fs.mkdirSync(rehearsalRoot, { recursive: false, mode: 0o700 });
    for (const item of manifest.items ?? []) {
      if (!item.existed) continue;
      const stored = inside(path.join(backupRoot, item.relative), backupRoot, "stored backup item");
      if (!fs.existsSync(stored)) fail(`stored backup item is missing: ${item.relative}`);
      const target = inside(path.join(rehearsalRoot, item.relative), rehearsalRoot, "shadow restore target");
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      if (item.type === "directory") fs.cpSync(stored, target, { recursive: true });
      else fs.copyFileSync(stored, target);
      if (item.type === "file" && item.sha256 && sha256(target) !== item.sha256) {
        fail(`shadow-restored hash mismatch: ${item.relative}`);
      }
      restored.push({ relative: item.relative, type: item.type, hashVerified: item.type === "file" && Boolean(item.sha256) });
    }
    const restoredConfig = path.join(rehearsalRoot, "openclaw.json");
    if (!fs.existsSync(restoredConfig)) fail("shadow-restored config is missing");
    const validation = validateCandidateConfig(restoredConfig);
    console.log(JSON.stringify({
      ok: true,
      action: "verify-rollback-backup",
      backupRoot,
      manifestSchema: manifest.schema,
      restoredItems: restored,
      restoredConfigSha256: sha256(restoredConfig),
      configValidated: validation.valid === true,
      activeStateChanged: false,
      restartPerformed: false,
      shadowCleanup: true
    }, null, 2));
  } finally {
    if (fs.existsSync(rehearsalRoot)) fs.rmSync(rehearsalRoot, { recursive: true, force: true });
  }
}

function loadFacts() {
  const tasks = gateway("tasks.list", { limit: 200 });
  const workboard = cliJson(["workboard", "list", "--board", "production", "--json"]);
  const cron = cliJson(["cron", "list", "--all", "--json"]);
  const pluginsRaw = cliJson(["plugins", "list", "--json"]);
  const plugins = Array.isArray(pluginsRaw) ? pluginsRaw : pluginsRaw.plugins ?? [];
  const cards = workboard.cards ?? [];
  const selfLocked = cards.filter((card) => card.status === "ready" && card.execution?.status === "running");
  return { tasks: tasks.tasks ?? [], cards, jobs: cron.jobs ?? [], plugins, selfLocked };
}

function preflight() {
  const facts = loadFacts();
  const config = readJson(`${ROOT}/openclaw.json`);
  console.log(JSON.stringify({
    ok: true, action: "preflight", version: cliJson(["status", "--json"]).version,
    identities: {
      ops: (config.bindings ?? []).some((item) => item.agentId === "ops" && item.match?.accountId === "default"),
      housekeeper: (config.bindings ?? []).some((item) => item.agentId === "housekeeper" && item.match?.accountId === "housekeeper"),
      life: (config.bindings ?? []).some((item) => item.agentId === "life" && item.match?.accountId === "life")
    },
    taskWindow: { count: facts.tasks.length, active: facts.tasks.filter((item) => ["queued", "running"].includes(item.status)).length },
    workboard: { total: facts.cards.length, ready: facts.cards.filter((item) => item.status === "ready").length, blocked: facts.cards.filter((item) => item.status === "blocked").length, selfLocked: facts.selfLocked.map((item) => ({ id: item.id, title: item.title, runId: item.runId })) },
    minuteJobs: [DISPATCH_JOB_ID, RELAY_JOB_ID].map((id) => { const job = facts.jobs.find((item) => item.id === id); return { id, exists: Boolean(job), enabled: job?.enabled, schedule: job?.schedule }; }),
    plugins: PLUGINS.map((id) => { const row = facts.plugins.find((item) => item.id === id); return { id, status: row?.status, version: row?.version }; })
  }, null, 2));
}

function deploy(stageArg, stampArg) {
  const stage = path.resolve(stageArg);
  if (!fs.existsSync(stage) || !fs.statSync(stage).isDirectory()) fail("staging directory is unavailable");
  const stamp = String(stampArg ?? "").replace(/[^0-9A-Za-z_-]/g, "");
  if (!stamp) fail("deployment stamp is required");
  const backupRoot = inside(`${ROOT}/backups/task-system-repair-${stamp}`, `${ROOT}/backups`, "backup root");
  if (fs.existsSync(backupRoot)) fail("backup root already exists");
  const initialJobs = cliJson(["cron", "list", "--all", "--json"]).jobs ?? [];
  const legacyCronStates = [DISPATCH_JOB_ID, RELAY_JOB_ID].map((id) => {
    const job = initialJobs.find((item) => item.id === id);
    if (!job) fail(`legacy cron is missing: ${id}`);
    return { id, enabled: Boolean(job.enabled) };
  });
  let legacyJobsPaused = false;
  try {
    // Stop only the two superseded minute pumps long enough to obtain a quiet
    // deployment window. Their original states are restored before success;
    // permanent cutover remains gated by acceptance.
    for (const job of legacyCronStates) if (job.enabled) cliRun(["cron", "disable", job.id]);
    legacyJobsPaused = true;
    const activeTasks = waitForNoActiveTasks();
    if (activeTasks.length) fail(`active OpenClaw tasks did not drain; refusing deployment (${activeTasks.length})`);
    const facts = loadFacts();
    const racedTasks = facts.tasks.filter((item) => ["queued", "running"].includes(item.status));
    if (racedTasks.length) fail(`active OpenClaw tasks appeared after quiescence; refusing deployment (${racedTasks.length})`);
    fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
    const manifest = { schema: "openclaw.task-system-repair-backup", schemaVersion: 1, createdAt: new Date().toISOString(), stamp, items: [], crons: legacyCronStates };
    backupPath(`${ROOT}/openclaw.json`, backupRoot, "openclaw.json", manifest);
    for (const id of PLUGINS) backupPath(`${ROOT}/extensions/${id}`, backupRoot, `extensions/${id}`, manifest);
    for (const agent of ["housekeeper", "ops", "life"]) for (const file of ["AGENTS.md", "TOOLS.md"]) backupPath(`${ROOT}/agents/${agent}/${file}`, backupRoot, `roles/${agent}/${file}`, manifest);
    writeJson0600(path.join(backupRoot, "manifest.json"), manifest);
    for (const id of PLUGINS) copyTree(path.join(stage, "plugins", id), `${ROOT}/extensions/${id}`);
    hydratePluginDependencies(backupRoot);
    // OpenClaw persists manifest schemas. A direct atomic directory swap makes
    // that cache stale, so refresh before validating config fields added by the
    // new plugin versions.
    refreshPluginRegistry();
    for (const agent of ["housekeeper", "ops", "life"]) for (const file of ["AGENTS.md", "TOOLS.md"]) {
      const source = path.join(stage, "roles", agent, file);
      if (fs.existsSync(source)) fs.copyFileSync(source, `${ROOT}/agents/${agent}/${file}`);
    }
    const config = readJson(`${ROOT}/openclaw.json`);
    config.plugins ??= {}; config.plugins.allow ??= []; config.plugins.entries ??= {};
    for (const id of PLUGINS) if (!config.plugins.allow.includes(id)) config.plugins.allow.push(id);
    config.plugins.entries["task-system-control"] = { enabled: true, hooks: { allowConversationAccess: true }, config: {
      statePath: `${ROOT}/task-system-control/state.json`, boardId: "task-system", ownerTelegramId: OWNER_ID,
      controllerSessionKey: "agent:housekeeper:task-system", gatewayTimeoutMs: 15000,
      agents: { housekeeper: "housekeeper", ops: "default", life: "life" },
      targetSessions: { ops: `agent:ops:telegram:direct:${OWNER_ID}`, life: `agent:life:telegram:direct:${OWNER_ID}` }
    } };
    config.plugins.entries["workflow-governance"] = { enabled: true, hooks: { allowConversationAccess: true }, config: {
      agents: ["housekeeper", "ops"], riskAgentId: "ops", controllerSessionKey: "agent:housekeeper:task-system",
      ownerTelegramId: OWNER_ID, riskStatePath: `${ROOT}/workflow-governance/risk-state.json`
    } };
    config.plugins.entries["housekeeper-workboard-control"] = { enabled: true, config: { agentId: "housekeeper", boardId: "task-system", timeoutMs: 30000 } };
    const toolMap = {
      housekeeper: ["task_intake", "task_handoff", "task_module", "workflow_governance", "housekeeper_workboard_start", "housekeeper_workboard_show"],
      ops: ["task_intake", "task_handoff", "task_module", "workflow_governance"],
      life: ["task_intake", "task_handoff", "task_module"]
    };
    for (const [agentId, tools] of Object.entries(toolMap)) {
      const agent = (config.agents?.list ?? []).find((item) => item.id === agentId);
      if (!agent) fail(`agent ${agentId} is missing`);
      agent.tools ??= {}; agent.tools.allow ??= [];
      for (const tool of tools) if (!agent.tools.allow.includes(tool)) agent.tools.allow.push(tool);
    }
    const identityOk = [
      ["ops", "default"], ["housekeeper", "housekeeper"], ["life", "life"]
    ].every(([agentId, accountId]) => (config.bindings ?? []).some((item) => item.agentId === agentId && item.match?.accountId === accountId));
    if (!identityOk) fail("identity/binding invariant failed; refusing to write config");
    const candidateConfig = path.join(backupRoot, "candidate-openclaw.json");
    writeJson0600(candidateConfig, config);
    const workflowInspection = cliJson(["plugins", "inspect", "workflow-governance", "--json"]);
    console.log(JSON.stringify({
      ok: true,
      action: "candidate-plugin-schema",
      plugin: {
        id: workflowInspection.plugin?.id,
        version: workflowInspection.plugin?.version,
        rootDir: workflowInspection.plugin?.rootDir,
        configJsonSchema: workflowInspection.plugin?.configJsonSchema
      }
    }, null, 2));
    const validation = validateCandidateConfig(candidateConfig);
    fs.renameSync(candidateConfig, `${ROOT}/openclaw.json`);
    refreshPluginRegistry();
    applyCronStates(legacyCronStates);
    legacyJobsPaused = false;
    console.log(JSON.stringify({
      ok: true, action: "deploy", backupRoot, configSha256: sha256(`${ROOT}/openclaw.json`),
      configValidated: true, configWarnings: validation.warnings ?? [], identityUnchanged: true,
      restartRequired: true, minuteJobsUnchanged: true, maintenancePauseRestored: true,
      pluginRegistryRefreshed: true
    }, null, 2));
  } catch (error) {
    if (fs.existsSync(path.join(backupRoot, "manifest.json"))) {
      try {
        restoreBackup(backupRoot);
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "deployment failed and rollback also failed");
      }
      legacyJobsPaused = false;
    } else if (legacyJobsPaused) {
      try {
        applyCronStates(legacyCronStates);
        legacyJobsPaused = false;
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "deployment failed before backup and cron-state restoration also failed");
      }
    }
    throw error;
  }
}

function enableConversationHooks(backupArg) {
  const backupRoot = inside(backupArg, `${ROOT}/backups`, "backup root");
  if (!fs.existsSync(path.join(backupRoot, "manifest.json"))) fail("deployment backup manifest is missing");
  const snapshot = path.join(backupRoot, "openclaw-before-conversation-hooks.json");
  if (fs.existsSync(snapshot)) fail("conversation-hook configuration was already attempted for this deployment");
  fs.copyFileSync(`${ROOT}/openclaw.json`, snapshot);
  fs.chmodSync(snapshot, 0o600);
  try {
    const config = readJson(`${ROOT}/openclaw.json`);
    for (const id of ["task-system-control", "workflow-governance"]) {
      const entry = config.plugins?.entries?.[id];
      if (!entry?.enabled) fail(`plugin entry is not enabled: ${id}`);
      entry.hooks = { ...(entry.hooks ?? {}), allowConversationAccess: true };
    }
    const candidate = path.join(backupRoot, "candidate-conversation-hooks-openclaw.json");
    writeJson0600(candidate, config);
    const validation = validateCandidateConfig(candidate);
    fs.renameSync(candidate, `${ROOT}/openclaw.json`);
    refreshPluginRegistry();
    console.log(JSON.stringify({
      ok: true,
      action: "enable-conversation-hooks",
      plugins: ["task-system-control", "workflow-governance"],
      configValidated: true,
      configWarnings: validation.warnings ?? [],
      rollbackSnapshot: snapshot
    }, null, 2));
  } catch (error) {
    fs.copyFileSync(snapshot, `${ROOT}/openclaw.json`);
    fs.chmodSync(`${ROOT}/openclaw.json`, 0o600);
    refreshPluginRegistry();
    throw error;
  }
}

function migrate() {
  const facts = loadFacts();
  const activeStatuses = new Set(["queued", "running"]);
  const repaired = [];
  const preserved = [];
  for (const card of facts.selfLocked) {
    const scoped = card.sessionKey ? (gateway("tasks.list", { sessionKey: card.sessionKey, limit: 200 }).tasks ?? []) : [];
    const matching = scoped.filter((task) => task.runId === card.runId || task.childSessionKey === card.sessionKey);
    if (matching.some((task) => activeStatuses.has(task.status))) {
      preserved.push({ id: card.id, reason: "matching real Task is active" });
      continue;
    }
    const attempts = (card.metadata?.attempts ?? []).map((attempt) => attempt.status === "running"
      ? { ...attempt, status: "failed", endedAt: Date.now(), error: "legacy Workboard execution was stale; preserved and closed during task-system migration" }
      : attempt);
    const metadata = { ...(card.metadata ?? {}), attempts, migration: { kind: "task-system-repair-v1", at: Date.now(), preservedRunId: card.runId ?? null } };
    gateway("workboard.cards.update", { id: card.id, patch: { runId: null, sessionKey: null, execution: null, startedAt: null, metadata } });
    repaired.push({ id: card.id, preservedRunId: card.runId ?? null });
  }
  console.log(JSON.stringify({ ok: true, action: "migrate", repaired, preserved, deletedHistory: false, blockedCardsChanged: false, taskHistoryChanged: false }, null, 2));
}

function cutover(acceptancePath) {
  const acceptance = readJson(path.resolve(acceptancePath));
  const required = ["pluginsLoaded", "identityUnchanged", "threeEntrypoints", "eightModules", "crossRoleHandoff", "riskLevels", "failureRecovery", "realTelegramReceipt", "rollbackReady"];
  const missing = required.filter((key) => acceptance[key] !== true);
  if (missing.length) fail(`cutover acceptance is incomplete: ${missing.join(", ")}`);
  const facts = loadFacts();
  for (const id of PLUGINS) {
    const row = facts.plugins.find((item) => item.id === id);
    if (!row || row.status !== "loaded") fail(`plugin is not loaded: ${id}`);
  }
  cliRun(["cron", "disable", DISPATCH_JOB_ID]);
  cliRun(["cron", "disable", RELAY_JOB_ID]);
  console.log(JSON.stringify({ ok: true, action: "cutover", disabledJobs: [DISPATCH_JOB_ID, RELAY_JOB_ID], definitionsPreserved: true, taskHistoryDeleted: false }, null, 2));
}

const [action, first, second] = process.argv.slice(2);
if (action === "preflight") preflight();
else if (action === "deploy") deploy(first, second);
else if (action === "migrate") migrate();
else if (action === "cutover") cutover(first);
else if (action === "hydrate-dependencies") hydratePluginDependencies(first, true);
else if (action === "enable-conversation-hooks") enableConversationHooks(first);
else if (action === "verify-rollback-backup") verifyRollbackBackup(first);
else if (action === "rollback") restoreBackup(first);
else fail("usage: DeployTaskSystemRepair.mjs preflight | deploy <stageDir> <stamp> | migrate | cutover <acceptance.json> | hydrate-dependencies <backupDir> | enable-conversation-hooks <backupDir> | verify-rollback-backup <backupDir> | rollback <backupDir>");
