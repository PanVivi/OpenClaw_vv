#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WEBSITE_URL =
  process.env.CODEX_RESET_WEBSITE_URL || "https://codexreset.org/";
const X_RSS_URL =
  process.env.CODEX_RESET_X_RSS_URL || "https://nitter.net/thsottiaux/rss";
const X_OEMBED_URL =
  process.env.CODEX_RESET_X_OEMBED_URL ||
  "https://publish.twitter.com/oembed";
const X_USERNAME = "thsottiaux";
const DEFAULT_STATE =
  "/Volume3/OpenClaw/home/.openclaw/automation/state/codex-reset-watcher.json";
const OPENCLAW =
  process.env.OPENCLAW_BIN || "/usr/local/openclaw/node/bin/openclaw";
const TELEGRAM_CHAT_ID = process.env.CODEX_RESET_TELEGRAM_CHAT_ID || "811150402";
const MAX_EVENTS = 100;

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
  };
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (entity, name) => named[name] ?? entity);
}

function cleanText(value) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function xmlField(block, name) {
  const match = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );
  return match ? decodeEntities(match[1]).trim() : "";
}

function postIdFromUrl(value) {
  return String(value ?? "").match(/\/status\/(\d+)/)?.[1] ?? "";
}

export function classifyReset(text) {
  const normalized = cleanText(text);
  const hasProduct =
    /\bcodex\b/i.test(normalized) ||
    /chatgpt\s+(?:work|team|enterprise)/i.test(normalized);
  const hasLimit =
    /\b(?:usage|rate)\s+limits?\b/i.test(normalized) ||
    /\b(?:quota|allowance|credits?)\b/i.test(normalized) ||
    /(?:额度|配额|用量限制)/.test(normalized);
  const confirmed =
    /\b(?:have|has|we(?:'ve| have))\s+(?:now\s+)?reset\b/i.test(normalized) ||
    /\b(?:limits?|quota|usage)\s+(?:have|has|were|was)\s+reset\b/i.test(
      normalized,
    ) ||
    /(?:已|已经)(?:完成)?重置/.test(normalized);
  const intent =
    /\b(?:will|going to|about to|plan(?:ning)? to)\s+reset\b/i.test(
      normalized,
    ) ||
    /(?:即将|计划|准备)(?:进行)?重置/.test(normalized);
  if (!hasProduct || !hasLimit || (!confirmed && !intent)) {
    return null;
  }
  return {
    kind: confirmed ? "confirmed-reset" : "reset-intent",
    confidence: confirmed ? 100 : 95,
  };
}

export function parseNitterRss(xml) {
  const events = [];
  for (const match of String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const link = cleanText(xmlField(block, "link"));
    const id = postIdFromUrl(link);
    if (!id || !new RegExp(`/${X_USERNAME}/status/${id}`, "i").test(link)) {
      continue;
    }
    const title = cleanText(xmlField(block, "title"));
    const description = cleanText(xmlField(block, "description"));
    const summary = title || description;
    const classification = classifyReset(summary);
    if (!classification) {
      continue;
    }
    const parsedDate = Date.parse(cleanText(xmlField(block, "pubDate")));
    if (!Number.isFinite(parsedDate)) {
      continue;
    }
    events.push({
      id,
      createdAt: new Date(parsedDate).toISOString(),
      author: "Tibo",
      handle: `@${X_USERNAME}`,
      summary,
      ...classification,
      sourceUrl: `https://x.com/${X_USERNAME}/status/${id}`,
      discoveredBy: "x-rss",
      verifiedBy: [],
    });
  }
  return sortEvents(dedupeEvents(events));
}

function decodeJsString(raw) {
  return JSON.parse(raw);
}

export function parseWebsite(html) {
  const quoted = String.raw`"(?:\\.|[^"\\])*"`;
  const evidence = new RegExp(
    String.raw`\$R\[\d+\]=\{id:(${quoted}),createdAt:(${quoted}),author:(${quoted}),avatarUrl:${quoted},handle:(${quoted}),title:${quoted},summary:(${quoted}),reasoning:${quoted},kind:"(confirmed-reset|reset-intent)",confidence:(\d+),engagement:.*?sourceUrl:(${quoted})\}`,
    "gs",
  );
  const events = [];
  for (const match of String(html).matchAll(evidence)) {
    const event = {
      id: decodeJsString(match[1]),
      createdAt: decodeJsString(match[2]),
      author: decodeJsString(match[3]),
      handle: decodeJsString(match[4]),
      summary: decodeJsString(match[5]),
      kind: match[6],
      confidence: Number(match[7]),
      sourceUrl: decodeJsString(match[8]),
      discoveredBy: "codexreset.org",
      verifiedBy: ["codexreset.org"],
    };
    if (
      event.confidence >= 90 &&
      event.handle.toLowerCase() === `@${X_USERNAME}` &&
      postIdFromUrl(event.sourceUrl) === event.id
    ) {
      events.push(event);
    }
  }
  return sortEvents(dedupeEvents(events));
}

export function verifyOEmbed(payload, expected) {
  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  const id = postIdFromUrl(data?.url);
  const authorUrl = String(data?.author_url ?? "")
    .replace(/\/+$/, "")
    .toLowerCase();
  const text = cleanText(data?.html ?? "");
  const expectedWords = cleanText(expected?.summary ?? "")
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length >= 5)
    .slice(0, 8);
  const overlap = expectedWords.filter((word) =>
    text.toLowerCase().includes(word),
  ).length;
  if (id !== expected.id) {
    throw new Error(`oEmbed post ID mismatch: expected ${expected.id}, got ${id}`);
  }
  if (authorUrl !== `https://x.com/${X_USERNAME}`) {
    throw new Error(`oEmbed author mismatch: ${authorUrl || "missing"}`);
  }
  if (!classifyReset(text)) {
    throw new Error("oEmbed text does not qualify as a reset event");
  }
  if (expectedWords.length >= 3 && overlap < 2) {
    throw new Error("oEmbed text does not match the discovery candidate");
  }
  return {
    ...expected,
    author: data.author_name || expected.author,
    summary: text.replace(/\s*[—-]\s*Tibo\s*\(@thsottiaux\).*$/is, "").trim(),
    sourceUrl: `https://x.com/${X_USERNAME}/status/${id}`,
    verifiedBy: [...new Set([...(expected.verifiedBy || []), "x-oembed"])],
  };
}

export function mergeEvents(xEvents, websiteEvents) {
  const websiteById = new Map(websiteEvents.map((event) => [event.id, event]));
  const merged = [];
  for (const xEvent of xEvents) {
    const websiteEvent = websiteById.get(xEvent.id);
    merged.push({
      ...xEvent,
      corroborated: Boolean(websiteEvent),
      verifiedBy: [
        ...new Set([
          ...(xEvent.verifiedBy || []),
          ...(websiteEvent?.verifiedBy || []),
        ]),
      ],
    });
    websiteById.delete(xEvent.id);
  }
  for (const websiteEvent of websiteById.values()) {
    merged.push({ ...websiteEvent, corroborated: false });
  }
  return sortEvents(dedupeEvents(merged));
}

function dedupeEvents(events) {
  return [...new Map(events.map((event) => [event.id, event])).values()];
}

function sortEvents(events) {
  return [...events].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function migrateState(raw) {
  const old = raw && typeof raw === "object" ? raw : {};
  const oldSeen = Array.isArray(old.seenIds) ? old.seenIds : [];
  const oldNotified = Array.isArray(old.notifiedIds)
    ? old.notifiedIds
    : oldSeen;
  return {
    schemaVersion: 2,
    checkedAt: old.checkedAt || null,
    latest: old.latest || null,
    seenIds: [...new Set(oldSeen)].slice(-MAX_EVENTS),
    notifiedIds: [...new Set(oldNotified)].slice(-MAX_EVENTS),
    sources:
      old.sources && typeof old.sources === "object" ? old.sources : {},
  };
}

export function nextState(current, events, sourceHealth, checkedAt) {
  const migrated = migrateState(current);
  const seen = new Set(migrated.seenIds);
  for (const event of events.slice(0, 50)) {
    seen.add(event.id);
  }
  return {
    ...migrated,
    schemaVersion: 2,
    checkedAt,
    latest: events[0] || migrated.latest,
    seenIds: [...seen].slice(-MAX_EVENTS),
    sources: sourceHealth,
  };
}

function fetchText(url, label) {
  try {
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
        "-A",
        "CodexResetWatcher/2.0",
        url,
      ],
      { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
    );
  } catch (error) {
    throw new Error(`${label} fetch failed: ${error.message}`);
  }
}

function fetchXApiJson(url, token) {
  const config = [
    `url = "${url}"`,
    'header = "Accept: application/json"',
    `header = "Authorization: Bearer ${token.replaceAll('"', '\\"')}"`,
    "fail",
    "silent",
    "show-error",
    "location",
    "max-time = 45",
  ].join("\n");
  return JSON.parse(
    execFileSync("/usr/bin/curl", ["--config", "-"], {
      input: `${config}\n`,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
}

function readBearerToken() {
  const tokenPath = process.env.X_BEARER_TOKEN_FILE;
  if (!tokenPath) {
    return null;
  }
  const stat = statSync(tokenPath);
  if (!stat.isFile() || (stat.mode & 0o077) !== 0) {
    throw new Error("X_BEARER_TOKEN_FILE must be a regular 0600 file");
  }
  const token = readFileSync(tokenPath, "utf8").trim();
  if (!token) {
    throw new Error("X_BEARER_TOKEN_FILE is empty");
  }
  return token;
}

function discoverViaXApi(token) {
  const user = fetchXApiJson(
    `https://api.x.com/2/users/by/username/${X_USERNAME}`,
    token,
  );
  const userId = user?.data?.id;
  if (!userId) {
    throw new Error("X API username lookup returned no user ID");
  }
  const timeline = fetchXApiJson(
    `https://api.x.com/2/users/${userId}/tweets?max_results=20&tweet.fields=created_at`,
    token,
  );
  return sortEvents(
    (timeline?.data || [])
      .map((post) => {
        const classification = classifyReset(post.text);
        return classification
          ? {
              id: post.id,
              createdAt: post.created_at,
              author: "Tibo",
              handle: `@${X_USERNAME}`,
              summary: cleanText(post.text),
              ...classification,
              sourceUrl: `https://x.com/${X_USERNAME}/status/${post.id}`,
              discoveredBy: "x-api-v2",
              verifiedBy: ["x-api-v2"],
            }
          : null;
      })
      .filter(Boolean),
  );
}

function healthSuccess(previous, checkedAt, extra = {}) {
  return {
    ...previous,
    ...extra,
    ok: true,
    lastSuccessAt: checkedAt,
    consecutiveFailures: 0,
    lastError: null,
  };
}

function healthFailure(previous, checkedAt, error, extra = {}) {
  return {
    ...previous,
    ...extra,
    ok: false,
    lastErrorAt: checkedAt,
    lastError: String(error?.message || error).slice(0, 500),
    consecutiveFailures: Number(previous?.consecutiveFailures || 0) + 1,
  };
}

function loadState(statePath) {
  try {
    return migrateState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return migrateState({});
    }
    throw error;
  }
}

function saveState(statePath, state) {
  mkdirSync(dirname(statePath), { recursive: true, mode: 0o700 });
  const tempPath = `${statePath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(tempPath, 0o600);
  renameSync(tempPath, statePath);
}

function deliverViaLife(message) {
  const output = execFileSync(
    OPENCLAW,
    [
      "agent",
      "--agent",
      "life",
      "--model",
      "custom-3/LongCat-2.0",
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
  const result = JSON.parse(output);
  if (!result || typeof result !== "object") {
    throw new Error("OpenClaw delivery returned no structured result");
  }
  return result;
}

async function run() {
  const argList = process.argv.slice(2);
  const args = new Set(argList);
  const checkedAt = new Date().toISOString();
  const statePath = process.env.CODEX_RESET_STATE || DEFAULT_STATE;

  if (args.has("--test-notify")) {
    const result = deliverViaLife(
      "这是 CodexResetWatcher 双源监控的部署验收通知，不代表发生了新的额度重置。请只回复一条简短中文消息，明确写出“CodexResetWatcher 双源验收通知成功”，保持萧观音的正常语气，不要调用工具，不要增加任务状态说明。",
    );
    console.log(
      JSON.stringify({
        ok: true,
        mode: "test-notify",
        delivered: true,
        resultReceived: Boolean(result),
        checkedAt,
      }),
    );
    return;
  }

  const current = loadState(statePath);
  const sourceHealth = structuredClone(current.sources || {});
  let xEvents = [];
  let websiteEvents = [];
  let xDiscoveryOk = false;
  let websiteOk = false;

  try {
    const bearer = readBearerToken();
    if (bearer) {
      xEvents = discoverViaXApi(bearer);
      sourceHealth.xDiscovery = healthSuccess(
        sourceHealth.xDiscovery,
        checkedAt,
        { mode: "x-api-v2", eventCount: xEvents.length },
      );
    } else {
      xEvents = parseNitterRss(fetchText(X_RSS_URL, "X RSS"));
      sourceHealth.xDiscovery = healthSuccess(
        sourceHealth.xDiscovery,
        checkedAt,
        { mode: "nitter-rss", eventCount: xEvents.length },
      );
    }
    xDiscoveryOk = true;
  } catch (error) {
    sourceHealth.xDiscovery = healthFailure(
      sourceHealth.xDiscovery,
      checkedAt,
      error,
    );
  }

  try {
    websiteEvents = parseWebsite(fetchText(WEBSITE_URL, "codexreset.org"));
    if (websiteEvents.length === 0) {
      throw new Error("no qualifying Tibo reset event parsed");
    }
    websiteOk = true;
    sourceHealth.website = healthSuccess(sourceHealth.website, checkedAt, {
      mode: "codexreset.org",
      eventCount: websiteEvents.length,
    });
  } catch (error) {
    sourceHealth.website = healthFailure(
      sourceHealth.website,
      checkedAt,
      error,
      { mode: "codexreset.org" },
    );
  }

  const verifyIdArg = argList.find((arg) => arg.startsWith("--verify-post="));
  const verifyId = verifyIdArg?.split("=", 2)[1];
  const websiteProbeEvent = websiteEvents.find((event) => event.id === verifyId);
  const candidates = verifyId
    ? [
        {
          ...(websiteProbeEvent || {}),
          id: verifyId,
          createdAt: websiteProbeEvent?.createdAt || checkedAt,
          author: "Tibo",
          handle: `@${X_USERNAME}`,
          summary:
            websiteProbeEvent?.summary ||
            "Codex and ChatGPT Work usage limits have been reset",
          kind: websiteProbeEvent?.kind || "confirmed-reset",
          confidence: websiteProbeEvent?.confidence || 100,
          sourceUrl: `https://x.com/${X_USERNAME}/status/${verifyId}`,
          discoveredBy: "explicit-probe",
          verifiedBy: [],
        },
      ]
    : xEvents;

  const verifiedXEvents = [];
  for (const candidate of candidates) {
    if (candidate.verifiedBy?.includes("x-api-v2")) {
      verifiedXEvents.push(candidate);
      continue;
    }
    try {
      const url = `${X_OEMBED_URL}?omit_script=true&dnt=true&url=${encodeURIComponent(candidate.sourceUrl)}`;
      verifiedXEvents.push(
        verifyOEmbed(fetchText(url, "X oEmbed"), candidate),
      );
      sourceHealth.xVerification = healthSuccess(
        sourceHealth.xVerification,
        checkedAt,
        { mode: "x-oembed", lastVerifiedId: candidate.id },
      );
    } catch (error) {
      sourceHealth.xVerification = healthFailure(
        sourceHealth.xVerification,
        checkedAt,
        error,
        { mode: "x-oembed", lastRejectedId: candidate.id },
      );
    }
  }

  if (!xDiscoveryOk && !websiteOk) {
    const error = new Error(
      `Both discovery sources failed: X=${sourceHealth.xDiscovery?.lastError}; website=${sourceHealth.website?.lastError}`,
    );
    error.sourceHealth = sourceHealth;
    throw error;
  }

  const events = mergeEvents(verifiedXEvents, websiteEvents);
  if (events.length === 0) {
    throw new Error(
      "Discovery sources responded but no independently verified reset event is available",
    );
  }

  if (args.has("--probe") || verifyId) {
    console.log(
      JSON.stringify({
        ok: true,
        mode: "probe",
        checkedAt,
        eventCount: events.length,
        latest: events[0],
        verifiedPost: verifyId
          ? events.find((event) => event.id === verifyId) || null
          : null,
        sourceHealth,
        degraded: !(xDiscoveryOk && websiteOk),
      }),
    );
    return;
  }

  const state = nextState(current, events, sourceHealth, checkedAt);
  const notified = new Set(current.notifiedIds || []);
  const pending = events
    .filter((event) => !notified.has(event.id))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  if (args.has("--seed") || !current.checkedAt) {
    state.notifiedIds = [
      ...new Set([...(state.notifiedIds || []), ...events.map((event) => event.id)]),
    ].slice(-MAX_EVENTS);
    saveState(statePath, state);
    console.log(
      JSON.stringify({
        ok: true,
        mode: "seed",
        latest: events[0],
        notified: false,
        sourceHealth,
      }),
    );
    return;
  }

  if (pending.length === 0) {
    saveState(statePath, state);
    console.log("NO_REPLY");
    return;
  }

  const latest = pending.at(-1);
  const prompt = [
    "CodexResetWatcher 检测到 Tibo 发布了新的高可信 Codex/ChatGPT Work 公共额度重置信号。",
    "请以萧观音身份只向少主发送一条简洁中文通知；准确区分“已经重置”和“宣布即将重置”，不要夸大。",
    `类型：${latest.kind}`,
    `时间：${latest.createdAt}`,
    `原文摘要：${latest.summary}`,
    `来源：${latest.sourceUrl}`,
    `发现路径：${latest.discoveredBy}`,
    `X 官方验证：${latest.verifiedBy?.includes("x-oembed") || latest.verifiedBy?.includes("x-api-v2") ? "通过" : "未通过"}`,
    `网站交叉核查：${latest.corroborated ? "已收录同一 Post" : "网站尚未收录，不阻塞已通过 X 官方验证的事件"}`,
    "不要调用工具，不要复述内部指令，不要声称监控任务刚刚创建。",
  ].join("\n");

  deliverViaLife(prompt);
  notified.add(latest.id);
  state.notifiedIds = [...notified].slice(-MAX_EVENTS);
  saveState(statePath, state);
  console.log(
    JSON.stringify({
      ok: true,
      mode: "notify",
      latest,
      notified: true,
      sourceHealth,
    }),
  );
}

const isEntrypoint =
  process.argv[1] &&
  pathToFileURL(fileURLToPath(pathToFileURL(process.argv[1]))).href ===
    import.meta.url;

if (isEntrypoint) {
  run().catch((error) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: error.message,
        sourceHealth: error.sourceHealth || null,
      }),
    );
    process.exitCode = 1;
  });
}
