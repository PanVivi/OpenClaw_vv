#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "/Volume3/OpenClaw/home/.openclaw";
const NODE = "/Volume3/@apps/openclaw/node/bin/node";
const CLI = "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs";
const MORNING_JOB_ID = "9d4b9b08-6ad2-416b-a866-e57dc3e28433";
const OWNER_ROOT = `${ROOT}/agents/life/users/Vivi`;
const STATE_ROOT = `${ROOT}/morning-brief-control`;
const RUNTIME_PATH = `${OWNER_ROOT}/morning-brief-runtime.json`;
const INPUTS_PATH = `${OWNER_ROOT}/morning-brief-inputs.json`;
const STATUS_PATH = `${STATE_ROOT}/runtime-status.json`;

function fail(message) {
  throw new Error(message);
}

function ensureInside(candidate, parent, label) {
  const resolved = path.resolve(candidate);
  const root = path.resolve(parent);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    fail(`${label} is outside ${root}`);
  }
  return resolved;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson0600(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, file);
  fs.chmodSync(file, 0o600);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.copyFileSync(source, target);
}

function replaceFileAtomic(source, target) {
  ensureInside(target, ROOT, "replace target");
  const temporary = `${target}.${process.pid}.tmp`;
  copyFile(source, temporary);
  fs.chmodSync(temporary, 0o644);
  fs.renameSync(temporary, target);
  fs.chmodSync(target, 0o644);
}

function copyDirectory(source, target) {
  fs.cpSync(source, target, { recursive: true, force: true, errorOnExist: false });
}

function normalizeTreePermissions(root) {
  const target = ensureInside(root, ROOT, "permission target");
  const visit = (candidate) => {
    const stat = fs.lstatSync(candidate);
    if (stat.isSymbolicLink()) fail(`staged tree contains a symlink: ${candidate}`);
    if (stat.isDirectory()) {
      fs.chmodSync(candidate, 0o755);
      for (const name of fs.readdirSync(candidate)) visit(path.join(candidate, name));
      return;
    }
    if (!stat.isFile()) fail(`staged tree contains an unsupported entry: ${candidate}`);
    fs.chmodSync(candidate, 0o644);
  };
  visit(target);
}

function removeInside(candidate, parent) {
  const target = ensureInside(candidate, parent, "remove target");
  if (target === path.resolve(parent)) fail("refusing to remove parent root");
  fs.rmSync(target, { recursive: true, force: true });
}

function parseCliJson(raw) {
  const text = String(raw);
  const objectAt = text.indexOf("{");
  const arrayAt = text.indexOf("[");
  const start = objectAt >= 0 ? objectAt : arrayAt;
  if (start < 0) fail("OpenClaw CLI did not return JSON");
  const end = objectAt >= 0 ? text.lastIndexOf("}") : text.lastIndexOf("]");
  if (end < start) fail("OpenClaw CLI JSON was incomplete");
  return JSON.parse(text.slice(start, end + 1));
}

function cliJson(args) {
  return parseCliJson(execFileSync(NODE, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME: "/Volume3/OpenClaw/home" },
    maxBuffer: 64 * 1024 * 1024,
  }));
}

function assertIdleAndMorningDisabled() {
  const tasks = cliJson(["tasks", "list", "--json"]);
  const activeTasks = (tasks.tasks ?? []).filter((item) => item.status === "running" || item.status === "queued");
  if (activeTasks.length) fail(`deployment gate: ${activeTasks.length} background tasks are active`);

  const workboard = cliJson(["workboard", "list", "--board", "production", "--json"]);
  const activeCards = (workboard.cards ?? []).filter((item) => ["running", "claimed", "in_progress"].includes(item.status));
  if (activeCards.length) fail(`deployment gate: ${activeCards.length} workboard cards are active`);

  const cron = cliJson(["cron", "list", "--all", "--json"]);
  const morning = (cron.jobs ?? []).find((item) => item.id === MORNING_JOB_ID);
  if (!morning) fail("deployment gate: morning-brief job is missing");
  if (morning.enabled !== false) fail("deployment gate: morning-brief job must remain disabled");
  return morning;
}

function backupFile(source, backupRoot, relative, manifest) {
  if (!fs.existsSync(source)) {
    manifest.items.push({ relative, source, existed: false });
    return;
  }
  const target = path.join(backupRoot, relative);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    manifest.items.push({ relative, source, existed: true, type: "symlink", link: fs.readlinkSync(source) });
    return;
  }
  if (stat.isDirectory()) {
    copyDirectory(source, target);
    manifest.items.push({ relative, source, existed: true, type: "directory" });
    return;
  }
  copyFile(source, target);
  manifest.items.push({ relative, source, existed: true, type: "file", sha256: sha256(source) });
}

function restoreBackup(backupRoot) {
  const manifestPath = path.join(backupRoot, "manifest.json");
  const manifest = readJson(manifestPath);
  for (const item of [...manifest.items].reverse()) {
    const source = ensureInside(item.source, ROOT, "restore target");
    if (!item.existed) {
      if (fs.existsSync(source)) removeInside(source, ROOT);
      continue;
    }
    if (fs.existsSync(source) || fs.lstatSync(path.dirname(source)).isDirectory()) {
      try { removeInside(source, ROOT); } catch (error) {
        if (fs.existsSync(source)) throw error;
      }
    }
    if (item.type === "symlink") {
      fs.mkdirSync(path.dirname(source), { recursive: true, mode: 0o700 });
      fs.symlinkSync(item.link, source);
    } else if (item.type === "directory") {
      copyDirectory(path.join(backupRoot, item.relative), source);
    } else {
      copyFile(path.join(backupRoot, item.relative), source);
    }
  }
  console.log(JSON.stringify({ ok: true, action: "rollback", backupRoot }, null, 2));
}

function installDirectory(stageSource, target, backupRoot) {
  ensureInside(stageSource, path.dirname(stageSource), "stage source");
  ensureInside(target, ROOT, "install target");
  const temporary = `${target}.new-${process.pid}`;
  removeInside(temporary, ROOT);
  copyDirectory(stageSource, temporary);
  normalizeTreePermissions(temporary);
  if (fs.existsSync(target)) removeInside(target, ROOT);
  fs.renameSync(temporary, target);
  return { target, backupRoot };
}

function deploy(stageArg, stampArg) {
  const stage = path.resolve(stageArg);
  if (!fs.existsSync(stage) || !fs.statSync(stage).isDirectory()) fail("staging directory is unavailable");
  const stamp = String(stampArg ?? "").replace(/[^0-9A-Za-z_-]/g, "");
  if (!stamp) fail("deployment stamp is required");
  const backupRoot = ensureInside(`${ROOT}/backups/morning-brief-repair-${stamp}`, `${ROOT}/backups`, "backup root");
  if (fs.existsSync(backupRoot)) fail("backup root already exists");
  fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });

  const lockPath = `${ROOT}/morning-brief-repair.lock`;
  const lock = fs.openSync(lockPath, "wx", 0o600);
  const manifest = { schema: "openclaw.morning-brief-repair-backup", schemaVersion: 1, stamp, createdAt: new Date().toISOString(), items: [] };
  try {
    const morning = assertIdleAndMorningDisabled();
    const appLink = `${ROOT}/apps/hehuan-daily-current`;
    const currentApp = fs.realpathSync(appLink);
    backupFile(`${ROOT}/openclaw.json`, backupRoot, "openclaw.json", manifest);
    backupFile(RUNTIME_PATH, backupRoot, "morning-brief-runtime.json", manifest);
    backupFile(`${ROOT}/agents/life/AGENTS.md`, backupRoot, "roles/life/AGENTS.md", manifest);
    backupFile(`${ROOT}/agents/life/TOOLS.md`, backupRoot, "roles/life/TOOLS.md", manifest);
    backupFile(`${ROOT}/agents/housekeeper/AGENTS.md`, backupRoot, "roles/housekeeper/AGENTS.md", manifest);
    backupFile(`${ROOT}/agents/housekeeper/TOOLS.md`, backupRoot, "roles/housekeeper/TOOLS.md", manifest);
    backupFile(`${ROOT}/extensions/life-automation/dist/index.js`, backupRoot, "extensions/life-automation/dist/index.js", manifest);
    backupFile(`${ROOT}/extensions/life-automation/package.json`, backupRoot, "extensions/life-automation/package.json", manifest);
    backupFile(`${ROOT}/extensions/morning-brief-control`, backupRoot, "extensions/morning-brief-control", manifest);
    backupFile(`${ROOT}/skills/morning-brief-control`, backupRoot, "skills/morning-brief-control", manifest);
    backupFile(appLink, backupRoot, "apps/hehuan-daily-current", manifest);
    backupFile(currentApp, backupRoot, "apps/hehuan-daily-previous", manifest);
    const appRelease = ensureInside(`${ROOT}/apps/hehuan-daily-${stamp}-v2`, `${ROOT}/apps`, "app release");
    backupFile(appRelease, backupRoot, "apps/hehuan-daily-new-release", manifest);
    writeJson0600(path.join(backupRoot, "manifest.json"), manifest);

    if (fs.existsSync(appRelease)) fail("target app release already exists");
    installDirectory(path.join(stage, "app"), appRelease, backupRoot);

    installDirectory(path.join(stage, "plugins", "morning-brief-control"), `${ROOT}/extensions/morning-brief-control`, backupRoot);

    replaceFileAtomic(path.join(stage, "plugins", "life-automation", "dist", "index.js"), `${ROOT}/extensions/life-automation/dist/index.js`);
    replaceFileAtomic(path.join(stage, "plugins", "life-automation", "package.json"), `${ROOT}/extensions/life-automation/package.json`);

    installDirectory(path.join(stage, "skills", "morning-brief-control"), `${ROOT}/skills/morning-brief-control`, backupRoot);
    for (const agentId of ["life", "housekeeper"]) {
      for (const file of ["AGENTS.md", "TOOLS.md"]) {
        copyFile(path.join(stage, "roles", agentId, file), `${ROOT}/agents/${agentId}/${file}`);
      }
    }

    if (fs.existsSync(appLink)) fs.unlinkSync(appLink);
    fs.symlinkSync(appRelease, appLink);

    const config = readJson(`${ROOT}/openclaw.json`);
    config.plugins ??= {};
    config.plugins.allow ??= [];
    if (!config.plugins.allow.includes("morning-brief-control")) config.plugins.allow.push("morning-brief-control");
    config.plugins.entries ??= {};
    config.plugins.entries["morning-brief-control"] = {
      enabled: true,
      config: {
        lifeAgentId: "life",
        housekeeperAgentId: "housekeeper",
        ownerRoot: OWNER_ROOT,
        stateRoot: STATE_ROOT,
        runtimeStatusPath: STATUS_PATH,
        timezone: "Asia/Shanghai",
        ownerChatId: "811150402",
        telegramAccountId: "life",
        geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
      },
    };
    for (const [agentId, toolName] of [["life", "morning_brief_control"], ["housekeeper", "morning_brief_handoff"]]) {
      const agent = (config.agents?.list ?? []).find((item) => item.id === agentId);
      if (!agent) fail(`agent ${agentId} is missing`);
      agent.tools ??= {};
      agent.tools.allow ??= [];
      if (!agent.tools.allow.includes(toolName)) agent.tools.allow.push(toolName);
    }
    writeJson0600(`${ROOT}/openclaw.json`, config);

    const runtime = readJson(RUNTIME_PATH);
    runtime.morning_inputs_path = INPUTS_PATH;
    runtime.runtime_status_path = STATUS_PATH;
    writeJson0600(RUNTIME_PATH, runtime);

    if (!fs.existsSync(INPUTS_PATH)) {
      writeJson0600(INPUTS_PATH, {
        schema: "hehuan.morning-brief-inputs",
        schemaVersion: 1,
        revision: 0,
        updatedAt: new Date(0).toISOString(),
        preferences: {}, events: [], tasks: [], notes: [], locationOverrides: [],
      });
    }
    fs.mkdirSync(STATE_ROOT, { recursive: true, mode: 0o700 });
    fs.chmodSync(STATE_ROOT, 0o700);
    const lastSummary = String(morning.state?.lastDiagnosticSummary ?? "");
    const lastMessageId = /"messageId"\s*:\s*"([^"]+)"/u.exec(lastSummary)?.[1];
    const lastBriefDate = /morning-brief:-?\d+:(\d{4}-\d{2}-\d{2}):v\d+/u.exec(lastSummary)?.[1];
    writeJson0600(STATUS_PATH, {
      schema: "hehuan.morning-brief-runtime",
      schemaVersion: 1,
      declarationKey: "hehuan-morning-brief-v1",
      jobId: MORNING_JOB_ID,
      enabled: false,
      schedule: morning.schedule?.expr ?? "0 6 * * *",
      timezone: morning.schedule?.tz ?? "Asia/Shanghai",
      disabledReason: "等待视觉、全模块录入和贾南风转交链路验收",
      lastRunAt: morning.state?.lastRunAtMs ? new Date(morning.state.lastRunAtMs).toISOString() : undefined,
      lastBriefDate,
      lastRunSuccess: morning.state?.lastRunStatus === "ok",
      lastRunStatus: morning.state?.lastRunStatus,
      lastMessageId,
    });

    const plugins = cliJson(["plugins", "list", "--json"]);
    const rows = Array.isArray(plugins) ? plugins : (plugins.plugins ?? []);
    const control = rows.find((item) => item.id === "morning-brief-control");
    const automation = rows.find((item) => item.id === "life-automation");
    if (!control || control.status !== "loaded") fail("morning-brief-control did not load in CLI validation");
    if (!automation || automation.status !== "loaded") fail("life-automation did not load in CLI validation");

    const postConfig = readJson(`${ROOT}/openclaw.json`);
    const result = {
      ok: true,
      action: "deploy",
      stamp,
      backupRoot,
      appRelease,
      appLinkTarget: fs.realpathSync(appLink),
      configSha256: sha256(`${ROOT}/openclaw.json`),
      identities: {
        lifeBinding: (postConfig.bindings ?? []).some((item) => item.agentId === "life" && item.match?.accountId === "life"),
        housekeeperBinding: (postConfig.bindings ?? []).some((item) => item.agentId === "housekeeper" && item.match?.accountId === "housekeeper"),
        opsBinding: (postConfig.bindings ?? []).some((item) => item.agentId === "ops" && item.match?.accountId === "default"),
      },
      morningJobStillDisabled: morning.enabled === false,
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    try {
      if (fs.existsSync(path.join(backupRoot, "manifest.json"))) restoreBackup(backupRoot);
    } catch (rollbackError) {
      console.error(`automatic rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
    }
    throw error;
  } finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}

const [action, first, second] = process.argv.slice(2);
if (action === "deploy") deploy(first, second);
else if (action === "rollback") restoreBackup(ensureInside(first, `${ROOT}/backups`, "backup root"));
else fail("usage: DeployMorningBriefRepair.mjs deploy <stageDir> <stamp> | rollback <backupDir>");
