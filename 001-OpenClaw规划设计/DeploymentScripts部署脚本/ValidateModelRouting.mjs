#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";

const HOME = "/Volume3/OpenClaw/home";
const ROOT = `${HOME}/.openclaw`;
const NODE = "/Volume3/@apps/openclaw/node/bin/node";
const CLI = "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs";
const EXPECTED = {
  housekeeper: ["custom-2", "grok-4.5"],
  life: ["custom-2", "grok-4.5"],
  ops: ["custom-1", "gpt-5.6-sol"],
  coder: ["custom-1", "gpt-5.6-sol"],
  reviewer: ["custom-1", "gpt-5.6-sol"],
  "companion-wu": ["custom-2", "grok-4.20-non-reasoning"],
  "companion-lv": ["custom-2", "grok-4.20-non-reasoning"],
  "companion-dugu": ["custom-2", "grok-4.20-non-reasoning"]
};

function fail(message) { throw new Error(message); }
function parseCliJson(raw) {
  const text = String(raw);
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((value) => value >= 0);
  if (!starts.length) fail("OpenClaw CLI did not return JSON");
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (end < start) fail("OpenClaw CLI returned incomplete JSON");
  return JSON.parse(text.slice(start, end + 1));
}
function cli(args, timeout = 240000) {
  return execFileSync(NODE, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME },
    maxBuffer: 64 * 1024 * 1024,
    timeout
  });
}
function cliJson(args, timeout) { return parseCliJson(cli(args, timeout)); }
function gateway(method, params) { return cliJson(["gateway", "call", method, "--params", JSON.stringify(params), "--json"]); }
function runAgent(id, sessionSuffix, message) {
  const key = `agent:${id}:${sessionSuffix}`;
  const result = cliJson(["agent", "--agent", id, "--session-key", key, "--message", message, "--thinking", "off", "--timeout", "180", "--json"], 240000);
  const meta = result.result?.meta?.agentMeta;
  if (result.status !== "ok" || !meta?.provider || !meta?.model) fail(`${id} did not return successful model metadata`);
  return { key, result, meta };
}
function mainAcceptance() {
  const rows = [];
  for (const [id, expected] of Object.entries(EXPECTED)) {
    const { result, meta, key } = runAgent(id, "model-routing-acceptance-main-20260811", "Reply exactly ROUTE_OK");
    const text = (result.result?.payloads ?? []).map((item) => item.text ?? "").join("\n");
    const trace = result.result?.meta?.executionTrace ?? result.result?.executionTrace ?? null;
    if (meta.provider !== expected[0] || meta.model !== expected[1]) fail(`${id} used ${meta.provider}/${meta.model}, expected ${expected.join("/")}`);
    if (!text.includes("ROUTE_OK")) fail(`${id} did not return the acceptance token`);
    rows.push({ id, sessionKey: key, provider: meta.provider, model: meta.model, replyOk: true, fallbackUsed: trace?.fallbackUsed ?? false });
    console.error(`main route accepted ${rows.length}/${Object.keys(EXPECTED).length}: ${id}`);
  }
  console.log(JSON.stringify({ ok: true, action: "main-acceptance", rows }, null, 2));
}
function collectSubagentKeys(value, output = new Set()) {
  if (typeof value === "string") {
    if (value.includes(":subagent:")) output.add(value);
    return output;
  }
  if (Array.isArray(value)) for (const item of value) collectSubagentKeys(item, output);
  else if (value && typeof value === "object") for (const item of Object.values(value)) collectSubagentKeys(item, output);
  return output;
}
function findModelPairs(value, output = []) {
  if (Array.isArray(value)) for (const item of value) findModelPairs(item, output);
  else if (value && typeof value === "object") {
    const provider = value.provider ?? value.modelProvider;
    const model = value.model;
    if (typeof provider === "string" && typeof model === "string") output.push({ provider, model });
    for (const item of Object.values(value)) findModelPairs(item, output);
  }
  return output;
}
function childFiles(agentId, key) {
  const directory = `${ROOT}/agents/${agentId}/sessions`;
  const files = fs.readdirSync(directory).filter((name) => name.endsWith(".jsonl"));
  const matches = [];
  for (const name of files) {
    const file = `${directory}/${name}`;
    const text = fs.readFileSync(file, "utf8");
    if (text.includes(key)) matches.push({ file, text });
  }
  return matches;
}
function waitForChild(agentId, key, expectedModel) {
  const deadline = Date.now() + 180000;
  do {
    const files = childFiles(agentId, key);
    const pairs = [];
    let childToken = false;
    for (const item of files) for (const line of item.text.split(/\r?\n/).filter(Boolean)) {
      try {
        const row = JSON.parse(line);
        findModelPairs(row, pairs);
        if (line.includes("CHILD_ROUTE_OK")) childToken = true;
      } catch { /* ignore non-JSON diagnostics */ }
    }
    const matched = pairs.find((pair) => pair.provider === "custom-2" && pair.model === expectedModel);
    if (matched && childToken) return { matched, childCompleted: true, evidenceFiles: files.map((item) => item.file) };
    execFileSync("sleep", ["2"]);
  } while (Date.now() < deadline);
  fail(`child ${key} did not complete on custom-2/${expectedModel}`);
}
function oneSubagentAcceptance(id, kind) {
  const suffix = `model-routing-acceptance-child-${kind}-20260811`;
  const instruction = "Use sessions_spawn exactly once to start a child task that replies exactly CHILD_ROUTE_OK. Wait for that child to finish, then reply exactly PARENT_ROUTE_OK.";
  const { result, meta, key } = runAgent(id, suffix, instruction);
  const parentText = (result.result?.payloads ?? []).map((item) => item.text ?? "").join("\n");
  const keys = collectSubagentKeys(result);
  if (meta.sessionFile && fs.existsSync(meta.sessionFile)) {
    for (const line of fs.readFileSync(meta.sessionFile, "utf8").split(/\r?\n/).filter(Boolean)) {
      try { collectSubagentKeys(JSON.parse(line), keys); } catch { /* ignore non-JSON diagnostics */ }
    }
  }
  if (!keys.size) fail(`${id} parent did not create a discoverable child session`);
  const childKey = [...keys].find((candidate) => candidate.startsWith(`agent:${id}:`)) ?? [...keys][0];
  const child = waitForChild(id, childKey, "composer-2.5");
  return { kind, parentAgent: id, parentSessionKey: key, parentProvider: meta.provider, parentModel: meta.model, parentAcknowledged: parentText.length > 0, childSessionKey: childKey, childProvider: child.matched.provider, childModel: child.matched.model, childCompleted: true, evidenceFiles: child.evidenceFiles.map((file) => file.split("/").pop()) };
}
function subagentAcceptance() {
  const engineering = oneSubagentAcceptance("ops", "engineering");
  const life = oneSubagentAcceptance("life", "life");
  console.log(JSON.stringify({ ok: true, action: "subagent-acceptance", rows: [engineering, life] }, null, 2));
}

const action = process.argv[2];
if (action === "main") mainAcceptance();
else if (action === "subagents") subagentAcceptance();
else fail("usage: ValidateModelRouting.mjs main | subagents");
