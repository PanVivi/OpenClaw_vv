#!/usr/bin/env node

import { appendFile, mkdir, readFile, rm, rmdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";

const execFileAsync = promisify(execFile);
const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

const config = {
  node:
    process.env.WORKBOARD_OPENCLAW_NODE ??
    "/Volume3/@apps/openclaw/node/bin/node",
  cli:
    process.env.WORKBOARD_OPENCLAW_CLI ??
    "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs",
  subscriptionId:
    process.env.WORKBOARD_SUBSCRIPTION_ID ??
    "9fb9d472-1880-4170-ba9e-1aa333d24696",
  telegramAccount:
    process.env.WORKBOARD_TELEGRAM_ACCOUNT ?? "housekeeper",
  telegramTarget:
    process.env.WORKBOARD_TELEGRAM_TARGET ?? "811150402",
  limit: Number.parseInt(process.env.WORKBOARD_NOTIFICATION_LIMIT ?? "20", 10),
  auditPath:
    process.env.WORKBOARD_RELAY_AUDIT_PATH ??
    "/Volume3/OpenClaw/home/.openclaw/automation/workboard-notification-relay.jsonl",
  lockPath:
    process.env.WORKBOARD_RELAY_LOCK_PATH ??
    "/Volume3/OpenClaw/home/.openclaw/automation/workboard-notification-relay.lock"
};

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

async function runCli(args) {
  const { stdout } = await execFileAsync(config.node, [config.cli, ...args], {
    env: {
      ...process.env,
      HOME: process.env.HOME ?? "/Volume3/OpenClaw/home"
    },
    maxBuffer: 2 * 1024 * 1024,
    timeout: 45_000,
    windowsHide: true
  });
  return parseJson(stdout, args.join(" "));
}

async function gatewayCall(method, params) {
  return runCli([
    "gateway",
    "call",
    method,
    "--params",
    JSON.stringify(params),
    "--json"
  ]);
}

function extractCardId(event) {
  for (const value of [
    event?.cardId,
    event?.card_id,
    event?.card?.id,
    event?.runId,
    event?.run_id,
    event?.sessionKey,
    event?.session_key,
    event?.message
  ]) {
    if (typeof value !== "string") continue;
    const match = value.match(UUID_RE);
    if (match) return match[0].toLowerCase();
  }
  return undefined;
}

function oneLine(value, fallback = "无") {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function buildMessage(rows) {
  const lines = ["【Workboard 主动回报】"];
  for (const row of rows) {
    lines.push(
      "",
      `事件：${row.event.kind} / ${row.event.id}`,
      `任务：${row.title}`,
      `Card：${row.cardId ?? "无法解析"}`,
      `状态：${row.status}`,
      `结果：${row.detail}`
    );
  }
  return lines.join("\n");
}

function findMessageId(value) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of ["messageId", "message_id"]) {
    const candidate = value[key];
    if (
      (typeof candidate === "string" && candidate.trim()) ||
      (typeof candidate === "number" && Number.isFinite(candidate))
    ) {
      return String(candidate);
    }
  }
  for (const child of Object.values(value)) {
    const found = findMessageId(child);
    if (found) return found;
  }
  return undefined;
}

async function loadSentEventIds(path) {
  try {
    const lines = (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean);
    const ids = new Set();
    for (const line of lines) {
      const row = parseJson(line, "relay audit");
      if (row.type === "sent" && Array.isArray(row.eventIds)) {
        for (const id of row.eventIds) ids.add(id);
      }
    }
    return ids;
  } catch (error) {
    if (error?.code === "ENOENT") return new Set();
    throw error;
  }
}

async function writeAudit(path, entry) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await appendFile(path, `${JSON.stringify(entry)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

async function defaultDescribe(event) {
  const cardId = extractCardId(event);
  if (!cardId) {
    return {
      event,
      cardId: undefined,
      title: "通知解析异常",
      status: event.kind,
      detail: oneLine(event.message, "事件中没有可解析的 Card UUID")
    };
  }
  try {
    const shown = await runCli(["workboard", "show", cardId, "--json"]);
    const card = shown?.card ?? shown;
    return {
      event,
      cardId,
      title: oneLine(card?.title, "未命名任务"),
      status: oneLine(card?.status, event.kind),
      detail: oneLine(
        event.message ??
          card?.metadata?.attempts?.at(-1)?.error ??
          card?.metadata?.comments?.at(-1)?.body,
        "状态已更新"
      )
    };
  } catch (error) {
    return {
      event,
      cardId,
      title: "任务详情读取失败",
      status: event.kind,
      detail: `${oneLine(event.message, "状态已更新")}；读取错误：${oneLine(
        error.message
      )}`
    };
  }
}

async function defaultSend(message) {
  const sent = await runCli([
    "message",
    "send",
    "--channel",
    "telegram",
    "--account",
    config.telegramAccount,
    "--target",
    config.telegramTarget,
    "--message",
    message,
    "--json"
  ]);
  const messageId = findMessageId(sent);
  if (!messageId) throw new Error("Telegram send returned no message ID");
  return { messageId, raw: sent };
}

async function processOnce(deps = {}) {
  const fetchEvents =
    deps.fetchEvents ??
    (() =>
      gatewayCall("workboard.notifications.events", {
        subscriptionId: config.subscriptionId,
        limit: config.limit
      }));
  const describe = deps.describe ?? defaultDescribe;
  const send = deps.send ?? defaultSend;
  const advance =
    deps.advance ??
    ((limit) =>
      gatewayCall("workboard.notifications.advance", {
        subscriptionId: config.subscriptionId,
        limit
      }));
  const auditPath = deps.auditPath ?? config.auditPath;
  const sentEventIds =
    deps.sentEventIds ?? (await loadSentEventIds(auditPath));

  const fetched = await fetchEvents();
  const events = Array.isArray(fetched?.events) ? fetched.events : [];
  if (events.length === 0) return { ok: true, empty: true, count: 0 };
  if (events.some((event) => !event?.id)) {
    throw new Error("Workboard returned an event without id");
  }

  const eventIds = events.map((event) => event.id);
  const batchAlreadySent = eventIds.every((id) => sentEventIds.has(id));
  let messageId;
  if (!batchAlreadySent) {
    const rows = [];
    for (const event of events) rows.push(await describe(event));
    const sent = await send(buildMessage(rows));
    messageId = sent.messageId;
    await writeAudit(auditPath, {
      type: "sent",
      at: new Date().toISOString(),
      subscriptionId: config.subscriptionId,
      accountId: config.telegramAccount,
      target: config.telegramTarget,
      eventIds,
      messageId
    });
  }

  const advanced = await advance(events.length);
  const advancedIds = Array.isArray(advanced?.events)
    ? advanced.events.map((event) => event.id)
    : [];
  assert.deepEqual(
    advancedIds,
    eventIds,
    "advanced event batch differs from the sent batch"
  );
  await writeAudit(auditPath, {
    type: "advanced",
    at: new Date().toISOString(),
    subscriptionId: config.subscriptionId,
    eventIds,
    messageId,
    replayAfterConfirmedSend: batchAlreadySent
  });
  return {
    ok: true,
    empty: false,
    count: events.length,
    eventIds,
    messageId,
    replayAfterConfirmedSend: batchAlreadySent
  };
}

async function withLock(operation) {
  try {
    await mkdir(config.lockPath, { mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") {
      const ageMs = Date.now() - (await stat(config.lockPath)).mtimeMs;
      if (ageMs <= 120_000) {
        return { ok: true, skipped: "already-running" };
      }
      await rm(config.lockPath, { recursive: true, force: true });
      await mkdir(config.lockPath, { mode: 0o700 });
    } else {
      throw error;
    }
  }
  try {
    return await operation();
  } finally {
    try {
      await rmdir(config.lockPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function selfTest() {
  const sampleId = "03cc322d-839b-469b-a180-ea834cbc8059";
  assert.equal(
    extractCardId({ runId: `workboard:${sampleId}:123` }),
    sampleId
  );
  assert.equal(extractCardId({ message: "no uuid here" }), undefined);
  assert.equal(findMessageId({ result: { messageId: 1132 } }), "1132");

  const event = {
    id: "event-1",
    kind: "completed",
    createdAt: 1,
    message: "done",
    runId: `workboard:${sampleId}:1`
  };
  const auditPath = `${process.env.TEMP ?? process.cwd()}/workboard-relay-test-${process.pid}.jsonl`;
  await rm(auditPath, { force: true });
  let sends = 0;
  let advances = 0;
  const ok = await processOnce({
    fetchEvents: async () => ({ events: [event] }),
    describe: async (value) => ({
      event: value,
      cardId: sampleId,
      title: "fixture",
      status: "done",
      detail: "ok"
    }),
    send: async () => {
      sends += 1;
      return { messageId: "fixture-message" };
    },
    advance: async () => {
      advances += 1;
      return { events: [event] };
    },
    auditPath,
    sentEventIds: new Set()
  });
  assert.equal(ok.ok, true);
  assert.equal(sends, 1);
  assert.equal(advances, 1);

  await assert.rejects(
    processOnce({
      fetchEvents: async () => ({ events: [event] }),
      describe: async (value) => ({
        event: value,
        cardId: sampleId,
        title: "fixture",
        status: "failed",
        detail: "telegram failure fixture"
      }),
      send: async () => {
        throw new Error("telegram unavailable");
      },
      advance: async () => {
        throw new Error("must not advance");
      },
      auditPath: `${auditPath}.send-fail`,
      sentEventIds: new Set()
    }),
    /telegram unavailable/
  );

  let replaySends = 0;
  const replay = await processOnce({
    fetchEvents: async () => ({ events: [event] }),
    send: async () => {
      replaySends += 1;
      return { messageId: "unexpected" };
    },
    advance: async () => ({ events: [event] }),
    auditPath: `${auditPath}.replay`,
    sentEventIds: new Set([event.id])
  });
  assert.equal(replaySends, 0);
  assert.equal(replay.replayAfterConfirmedSend, true);

  await assert.rejects(
    processOnce({
      fetchEvents: async () => ({ events: [event] }),
      describe: async (value) => ({
        event: value,
        cardId: sampleId,
        title: "fixture",
        status: "failed",
        detail: "blocked"
      }),
      send: async () => ({ messageId: "fixture-message-2" }),
      advance: async () => {
        throw new Error("advance unavailable");
      },
      auditPath: `${auditPath}.advance-fail`,
      sentEventIds: new Set()
    }),
    /advance unavailable/
  );

  const empty = await processOnce({
    fetchEvents: async () => ({ events: [] }),
    auditPath: `${auditPath}.empty`,
    sentEventIds: new Set()
  });
  assert.equal(empty.empty, true);
  await rm(auditPath, { force: true });
  await rm(`${auditPath}.advance-fail`, { force: true });
  return { ok: true, fixtures: 7 };
}

if (process.argv.includes("--self-test")) {
  console.log(JSON.stringify(await selfTest(), null, 2));
} else if (process.argv.includes("--dry-run")) {
  const fetched = await gatewayCall("workboard.notifications.events", {
    subscriptionId: config.subscriptionId,
    limit: config.limit
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        count: Array.isArray(fetched?.events) ? fetched.events.length : 0,
        eventIds: Array.isArray(fetched?.events)
          ? fetched.events.map((event) => event.id)
          : []
      },
      null,
      2
    )
  );
} else {
  console.log(JSON.stringify(await withLock(() => processOnce()), null, 2));
}
