#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const HOME = "/Volume3/OpenClaw/home";
const ROOT = `${HOME}/.openclaw`;
const STAGE = `${ROOT}/staging/model-routing-20260811`;
const CONFIG = `${ROOT}/openclaw.json`;
const NODE = "/Volume3/@apps/openclaw/node/bin/node";
const CLI = "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs";

function fail(message) { throw new Error(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson0600(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function parseCliJson(raw) {
  const text = String(raw);
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((value) => value >= 0);
  if (!starts.length) fail("OpenClaw CLI did not return JSON");
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (end < start) fail("OpenClaw CLI returned incomplete JSON");
  return JSON.parse(text.slice(start, end + 1));
}
function runCli(args, env, timeout = 240000) {
  return execFileSync(NODE, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME, ...env },
    maxBuffer: 64 * 1024 * 1024,
    timeout
  });
}
function runCliCaptured(args, env, timeout = 240000) {
  const child = spawnSync(NODE, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME, ...env },
    maxBuffer: 64 * 1024 * 1024,
    timeout
  });
  if (child.error) throw child.error;
  if (child.status !== 0) fail(`OpenClaw CLI exited ${child.status}: ${child.stderr}`);
  return { result: parseCliJson(child.stdout), stderr: child.stderr ?? "" };
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function prepare() {
  const root = fs.mkdtempSync(`${STAGE}/failover-`);
  fs.chmodSync(root, 0o700);
  const config = clone(readJson(CONFIG));
  const sourceModels = `${ROOT}/agents/ops/agent/models.json`;
  const models = clone(readJson(sourceModels));
  const healthy = models.providers?.["custom-3"];
  if (!healthy?.models?.length) fail("custom-3 provider definition is missing");
  const failureProvider = clone(healthy);
  failureProvider.baseUrl = "http://127.0.0.1:9/v1";
  failureProvider.apiKey = "isolated-failure-test";
  failureProvider.models = [{ ...clone(healthy.models[0]), id: "unreachable", name: "Unreachable failure probe" }];
  const ops = config.agents.list.find((agent) => agent.id === "ops");
  if (!ops) fail("ops Agent is missing");
  config.agents.list = [ops];
  config.bindings = [];
  config.channels = {};
  config.plugins = {};
  config.models ??= {};
  config.models.providers ??= {};
  config.models.providers.failtest = clone(failureProvider);
  config.agents.defaults.models ??= {};
  config.agents.defaults.models["failtest/unreachable"] = {};
  config.agents.defaults.model = { primary: "failtest/unreachable", fallbacks: ["custom-3/LongCat-2.0"] };
  ops.model = clone(config.agents.defaults.model);
  ops.subagents ??= {};
  ops.subagents.model = { primary: "failtest/unreachable", fallbacks: ["custom-3/LongCat-2.0"] };
  const configPath = `${root}/openclaw.json`;
  writeJson0600(configPath, config);
  models.providers.failtest = clone(failureProvider);
  writeJson0600(`${root}/agents/ops/agent/models.json`, models);
  return { root, configPath, env: { HOME: root, OPENCLAW_STATE_DIR: root, OPENCLAW_CONFIG_PATH: configPath } };
}
function traceFrom(result) { return result.result?.meta?.executionTrace ?? result.result?.executionTrace ?? {}; }
function modelPairs(value, output = []) {
  if (Array.isArray(value)) for (const item of value) modelPairs(item, output);
  else if (value && typeof value === "object") {
    const provider = value.provider ?? value.modelProvider;
    const model = value.model;
    if (typeof provider === "string" && typeof model === "string") output.push({ provider, model });
    for (const item of Object.values(value)) modelPairs(item, output);
  }
  return output;
}
function validateFallbackResult(result, stderr, label) {
  const pairs = modelPairs(result);
  const trace = traceFrom(result);
  const attempts = trace.attempts ?? [];
  const hasWinner = pairs.some((item) => item.provider === "custom-3" && item.model === "LongCat-2.0");
  const serialized = JSON.stringify(result);
  const failedPrimary = attempts.some((item) => item.provider === "failtest" && item.result !== "success") || (stderr.includes("candidate_failed") && stderr.includes("failtest/unreachable"));
  const successfulFallback = attempts.some((item) => item.provider === "custom-3" && item.model === "LongCat-2.0" && item.result === "success") || (stderr.includes("candidate_succeeded") && stderr.includes("custom-3/LongCat-2.0"));
  if (!hasWinner || !serialized.includes("MAIN_FAILOVER_OK")) fail(`${label} has no successful LongCat result`);
  if (!failedPrimary) fail(`${label} has no failed primary decision`);
  if (!successfulFallback) fail(`${label} has no successful fallback decision`);
  return { winnerProvider: "custom-3", winnerModel: "LongCat-2.0", fallbackUsed: true, failedPrimary: true, successfulFallback: true };
}
function mainFailover(test) {
  const capture = runCliCaptured([
    "agent", "--local", "--agent", "ops",
    "--session-key", "agent:ops:isolated-main-failover",
    "--message", "Reply exactly MAIN_FAILOVER_OK",
    "--thinking", "off", "--timeout", "180", "--json"
  ], test.env);
  return validateFallbackResult(capture.result, capture.stderr, "main failover");
}
function subagentFailover(test) {
  const config = readJson(test.configPath);
  const ops = config.agents.list[0];
  config.agents.defaults.model = { primary: "custom-3/LongCat-2.0", fallbacks: [] };
  ops.model = clone(config.agents.defaults.model);
  writeJson0600(test.configPath, config);
  const validation = parseCliJson(runCli(["config", "validate", "--json"], test.env));
  if (validation.valid !== true) fail("isolated subagent candidate is invalid");
  const args = [
    CLI, "agent", "--local", "--agent", "ops",
    "--session-key", "agent:ops:isolated-subagent-failover",
    "--message", "Use sessions_spawn exactly once to start a child that replies exactly CHILD_FAILOVER_OK. Wait for completion, then reply exactly PARENT_FAILOVER_OK.",
    "--thinking", "off", "--timeout", "180", "--json"
  ];
  const child = spawnSync(NODE, args, {
    encoding: "utf8",
    env: { ...process.env, HOME, ...test.env },
    maxBuffer: 64 * 1024 * 1024,
    timeout: 45000
  });
  if (child.error && child.error.code !== "ETIMEDOUT") throw child.error;
  const stderr = child.stderr ?? "";
  const decisionOk = stderr.includes("candidate_failed") && stderr.includes("failtest/unreachable") && stderr.includes("candidate_succeeded") && stderr.includes("custom-3/LongCat-2.0");
  const completionOk = stderr.includes("CHILD_FAILOVER_OK") && stderr.includes("ended with stopReason=stop");
  if (!decisionOk || !completionOk) fail("isolated subagent did not complete the expected fallback decision chain");
  const directory = `${test.root}/agents/ops/sessions`;
  const evidence = [];
  if (fs.existsSync(directory)) for (const name of fs.readdirSync(directory).filter((item) => item.endsWith(".jsonl"))) {
    const text = fs.readFileSync(`${directory}/${name}`, "utf8");
    if (text.includes("CHILD_FAILOVER_OK") && text.includes("failtest") && text.includes("custom-3") && text.includes("LongCat-2.0")) evidence.push(name);
  }
  return { fallbackUsed: true, failedPrimary: true, successfulFallback: true, winnerProvider: "custom-3", winnerModel: "LongCat-2.0", childCompleted: true, parentLingeringTerminated: child.error?.code === "ETIMEDOUT", evidenceFiles: evidence };
}

const productionHashBefore = sha256(CONFIG);
const test = prepare();
try {
  const validation = parseCliJson(runCli(["config", "validate", "--json"], test.env));
  if (validation.valid !== true || path.resolve(validation.path) !== path.resolve(test.configPath)) fail("isolated config validation failed");
  const main = mainFailover(test);
  const subagent = subagentFailover(test);
  const productionHashAfter = sha256(CONFIG);
  if (productionHashAfter !== productionHashBefore) fail("production config changed during isolated failover test");
  console.log(JSON.stringify({ ok: true, action: "isolated-failover", configValidated: true, main, subagent, productionConfigUnchanged: true, productionGatewayUsed: false }, null, 2));
} finally {
  const resolved = path.resolve(test.root);
  if (!resolved.startsWith(`${path.resolve(STAGE)}${path.sep}`) || !path.basename(resolved).startsWith("failover-")) fail("refusing unsafe temporary cleanup");
  fs.rmSync(resolved, { recursive: true, force: true });
}
