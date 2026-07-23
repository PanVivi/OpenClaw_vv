#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SOURCE_URL = "https://codexreset.org/";
const DEFAULT_STATE =
  "/Volume3/OpenClaw/home/.openclaw/automation/state/codex-reset-watcher.json";
const OPENCLAW =
  "/usr/local/openclaw/node/bin/openclaw";
const TELEGRAM_CHAT_ID = "811150402";
const args = new Set(process.argv.slice(2));
const statePath = process.env.CODEX_RESET_STATE || DEFAULT_STATE;

function decodeJsString(raw) {
  return JSON.parse(raw);
}

function fetchPage() {
  return execFileSync(
    "/usr/bin/curl",
    [
      "-fsSL",
      "--max-time",
      "45",
      "--retry",
      "2",
      "--retry-delay",
      "2",
      SOURCE_URL,
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
}

function extractQualifiedEvents(html) {
  const quoted = String.raw`"(?:\\.|[^"\\])*"`;
  const evidence = new RegExp(
    String.raw`\$R\[\d+\]=\{id:(${quoted}),createdAt:(${quoted}),author:(${quoted}),avatarUrl:${quoted},handle:(${quoted}),title:${quoted},summary:(${quoted}),reasoning:${quoted},kind:"(confirmed-reset|reset-intent)",confidence:(\d+),engagement:.*?sourceUrl:(${quoted})\}`,
    "gs",
  );
  const events = [];
  for (const match of html.matchAll(evidence)) {
    const event = {
      id: decodeJsString(match[1]),
      createdAt: decodeJsString(match[2]),
      author: decodeJsString(match[3]),
      handle: decodeJsString(match[4]),
      summary: decodeJsString(match[5]),
      kind: match[6],
      confidence: Number(match[7]),
      sourceUrl: decodeJsString(match[8]),
    };
    if (
      event.confidence >= 90 &&
      event.handle.toLowerCase() === "@thsottiaux"
    ) {
      events.push(event);
    }
  }
  return events.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

function loadState() {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { schemaVersion: 1, seenIds: [] };
    }
    throw error;
  }
}

function saveState(state) {
  mkdirSync(dirname(statePath), { recursive: true, mode: 0o700 });
  const tempPath = `${statePath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  renameSync(tempPath, statePath);
}

function deliverViaLife(message) {
  const result = execFileSync(
    OPENCLAW,
    [
      "agent",
      "--agent",
      "life",
      "--session-key",
      "agent:life:codex-reset-watcher",
      "--message",
      message,
      "--deliver",
      "--reply-channel",
      "telegram",
      "--reply-account",
      "life",
      "--reply-to",
      TELEGRAM_CHAT_ID,
      "--timeout",
      "180",
      "--json",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: "/Volume3/OpenClaw/home",
        PATH: `/usr/local/openclaw/node/bin:${process.env.PATH || ""}`,
      },
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  return JSON.parse(result);
}

const checkedAt = new Date().toISOString();

if (args.has("--test-notify")) {
  const delivered = deliverViaLife(
    "这是 CodexResetWatcher 的部署验收通知，不代表发生了新的额度重置。请只回复一条简短中文消息，明确写出“CodexResetWatcher 验收通知成功”，保持萧观音的正常语气，不要调用工具，不要增加任务状态说明。",
  );
  console.log(
    JSON.stringify({
      ok: true,
      mode: "test-notify",
      delivered: Boolean(delivered),
      checkedAt,
    }),
  );
  process.exit(0);
}

const html = fetchPage();
const events = extractQualifiedEvents(html);
if (events.length === 0) {
  throw new Error("No qualifying Tibo reset event could be parsed");
}

const latest = events[0];
const state = loadState();
const seen = new Set(Array.isArray(state.seenIds) ? state.seenIds : []);
const isNew = !seen.has(latest.id);
for (const event of events.slice(0, 50)) {
  seen.add(event.id);
}

const nextState = {
  schemaVersion: 1,
  sourceUrl: SOURCE_URL,
  checkedAt,
  latest,
  seenIds: [...seen].slice(-100),
};

if (args.has("--probe")) {
  console.log(
    JSON.stringify({ ok: true, mode: "probe", latest, eventCount: events.length }),
  );
  process.exit(0);
}

if (args.has("--seed") || !state.checkedAt) {
  saveState(nextState);
  console.log(
    JSON.stringify({ ok: true, mode: "seed", latest, notified: false }),
  );
  process.exit(0);
}

if (!isNew) {
  saveState(nextState);
  console.log("NO_REPLY");
  process.exit(0);
}

const prompt = [
  "CodexResetWatcher 检测到 Tibo 发布了新的高可信 Codex/ChatGPT Work 公共额度重置信号。",
  "请以萧观音身份只向少主发送一条简洁中文通知；准确区分“已确认重置”和“宣布即将重置”，不要夸大。",
  `类型：${latest.kind}`,
  `时间：${latest.createdAt}`,
  `原文摘要：${latest.summary}`,
  `来源：${latest.sourceUrl}`,
  "不要调用工具，不要复述内部指令，不要声称监控任务刚刚创建。",
].join("\n");

deliverViaLife(prompt);
saveState(nextState);
console.log(
  JSON.stringify({ ok: true, mode: "notify", latest, notified: true }),
);
